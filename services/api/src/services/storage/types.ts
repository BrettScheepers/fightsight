/**
 * Storage Service Types
 *
 * Abstraction layer for file storage - supports local filesystem and cloud storage (GCS, S3)
 */

export interface UploadOptions {
  contentType: string;
  expiresIn?: number; // milliseconds
  metadata?: Record<string, string>;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileName: string;
  expiresAt: Date;
}

export interface StorageProvider {
  /**
   * Generate a presigned/temporary URL for client-side upload
   * @param fileName - Name of file to upload
   * @param options - Upload options (content type, expiry, etc.)
   * @returns Upload URL and metadata
   */
  generateUploadUrl(fileName: string, options: UploadOptions): Promise<UploadUrlResponse>;

  /**
   * Validate upload token (for local storage)
   * @param token - Upload token to validate
   * @returns File name if valid, null otherwise
   */
  validateUploadToken?(token: string): string | null;

  /**
   * Save uploaded file (for local storage)
   * @param token - Upload token
   * @param fileBuffer - File contents
   * @returns File name
   */
  saveUpload(token: string, fileBuffer: Buffer): Promise<string>;

  /**
   * Download a file from storage
   * @param fileName - Name of file to download
   * @returns File contents as Buffer
   */
  download(fileName: string): Promise<Buffer>;

  /**
   * Get public/accessible URL for a file
   * @param fileName - Name of file
   * @returns URL to access file
   */
  getUrl(fileName: string): string;

  /**
   * Delete a file from storage
   * @param fileName - Name of file to delete
   */
  delete(fileName: string): Promise<void>;

  /**
   * Check if a file exists
   * @param fileName - Name of file to check
   * @returns Boolean indicating existence
   */
  exists(fileName: string): Promise<boolean>;

  /**
   * List files in storage (optional, for debugging)
   * @param prefix - Optional prefix to filter files
   * @returns Array of file names
   */
  list(prefix?: string): Promise<string[]>;

  /**
   * Get the local file path (for local storage streaming)
   * @param fileName - Name of file
   * @returns Local file system path
   */
  getFilePath(fileName: string): Promise<string>;
}
