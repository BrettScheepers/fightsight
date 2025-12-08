/**
 * Local Filesystem Storage Provider
 *
 * Development-friendly storage using local filesystem.
 * Files are stored in ./uploads directory.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider, UploadOptions, UploadUrlResponse } from './types';

export interface LocalStorageConfig {
  uploadsDir: string;
  baseUrl: string; // Base URL for accessing files (e.g., http://localhost:3000)
}

export class LocalStorage implements StorageProvider {
  private uploadsDir: string;
  private baseUrl: string;
  private pendingUploads: Map<string, { fileName: string; expiresAt: Date }>;

  constructor(config: LocalStorageConfig) {
    this.uploadsDir = config.uploadsDir;
    this.baseUrl = config.baseUrl;
    this.pendingUploads = new Map();

    // Ensure uploads directory exists
    this.ensureDirectoryExists(this.uploadsDir);
  }

  /**
   * For local storage, we generate a unique token that can be used
   * to upload via a multipart form endpoint
   */
  async generateUploadUrl(
    fileName: string,
    options: UploadOptions
  ): Promise<UploadUrlResponse> {
    const uploadToken = crypto.randomBytes(32).toString('hex');
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const expiresIn = options.expiresIn || 15 * 60 * 1000; // 15 minutes default
    const expiresAt = new Date(Date.now() + expiresIn);

    // Store pending upload
    this.pendingUploads.set(uploadToken, {
      fileName: sanitizedFileName,
      expiresAt,
    });

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    // Return upload URL (points to our API endpoint)
    return {
      uploadUrl: `${this.baseUrl}/api/storage/upload/${uploadToken}`,
      fileName: sanitizedFileName,
      expiresAt,
    };
  }

  /**
   * Validate upload token (called by upload endpoint)
   */
  validateUploadToken(token: string): string | null {
    const upload = this.pendingUploads.get(token);
    if (!upload) return null;

    if (upload.expiresAt < new Date()) {
      this.pendingUploads.delete(token);
      return null;
    }

    return upload.fileName;
  }

  /**
   * Save uploaded file (called by upload endpoint)
   */
  async saveUpload(token: string, fileBuffer: Buffer): Promise<string> {
    const fileName = this.validateUploadToken(token);
    if (!fileName) {
      throw new Error('Invalid or expired upload token');
    }

    const filePath = this.getFilePath(fileName);
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, fileBuffer);

    // Remove token after successful upload
    this.pendingUploads.delete(token);

    return fileName;
  }

  async download(fileName: string): Promise<Buffer> {
    const filePath = this.getFilePath(fileName);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${fileName}`);
      }
      throw error;
    }
  }

  getUrl(fileName: string): string {
    return `${this.baseUrl}/api/storage/files/${fileName}`;
  }

  async delete(fileName: string): Promise<void> {
    const filePath = this.getFilePath(fileName);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }
      throw error;
    }
  }

  async exists(fileName: string): Promise<boolean> {
    const filePath = this.getFilePath(fileName);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const files = await this.listFilesRecursive(this.uploadsDir);

    if (prefix) {
      return files.filter((file) => file.startsWith(prefix));
    }

    return files;
  }

  /**
   * Helper: Get absolute file path
   */
  private getFilePath(fileName: string): string {
    return path.join(this.uploadsDir, fileName);
  }

  /**
   * Helper: Sanitize filename to prevent directory traversal
   */
  private sanitizeFileName(fileName: string): string {
    // Remove any path separators
    const sanitized = fileName.replace(/[/\\]/g, '_');

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);

    return `${name}-${timestamp}${ext}`;
  }

  /**
   * Helper: Ensure directory exists
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Helper: Recursively list all files
   */
  private async listFilesRecursive(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return this.listFilesRecursive(fullPath);
        } else {
          // Return relative path from uploads directory
          return path.relative(this.uploadsDir, fullPath);
        }
      })
    );

    return files.flat();
  }

  /**
   * Helper: Clean up expired upload tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, upload] of this.pendingUploads.entries()) {
      if (upload.expiresAt < now) {
        this.pendingUploads.delete(token);
      }
    }
  }
}
