import { Request, Response } from 'express';
import { getStorage } from '../services/storage';

export class StorageController {
  private storage = getStorage();

  requestUploadUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName, contentType, metadata } = req.body;

      // Validate
      if (!fileName || !contentType) {
        res.status(400).json({ error: 'fileName and contentType required' });
        return;
      }

      // Generate URL
      const result = await this.storage.generateUploadUrl(fileName, {
        contentType,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };

  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({ error: 'Upload token required' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Save the uploaded file using storage service
      const fileName = await this.storage.saveUpload(token, req.file.buffer);

      res.json({
        success: true,
        data: {
          fileName,
          size: req.file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ error: message });
    }
  };

  getFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        res.status(400).json({ error: 'fileName required' });
        return;
      }

      // TODO: Verify user owns file (check database)
      // For now, we'll allow any authenticated user to access files

      // Check if file exists
      const exists = await this.storage.exists(fileName);
      if (!exists) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Get file stats for range requests
      const filePath = await this.storage.getFilePath(fileName);
      const fs = await import('fs');
      const stat = await fs.promises.stat(filePath);
      const fileSize = stat.size;

      // Determine content type from file extension
      const ext = fileName.split('.').pop()?.toLowerCase();
      const contentTypeMap: Record<string, string> = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm',
        avi: 'video/x-msvideo',
      };
      const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

      // Always set Accept-Ranges header to indicate range request support
      res.setHeader('Accept-Ranges', 'bytes');

      // Handle range requests for video streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);
        res.setHeader('Content-Type', contentType);
        fileStream.pipe(res);
      } else {
        // Non-range request - send entire file
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };
}
