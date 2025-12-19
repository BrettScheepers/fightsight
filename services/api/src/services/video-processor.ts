/**
 * Video Processing Service
 *
 * Handles FFmpeg operations for extracting frames from videos
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { getStorage } from './storage';

export interface ExtractedFrame {
  frameNumber: number;
  timestamp: number;
  imagePath: string;
  imageBuffer: Buffer;
}

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  format: string;
}

export class VideoProcessor {
  private storage = getStorage();
  private tempDir = process.env.TEMP_DIR || '/tmp/fightsight';

  constructor() {
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Get video metadata using FFmpeg probe
   */
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`FFprobe failed: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const duration = metadata.format.duration || 0;
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;

        // Calculate FPS from r_frame_rate (e.g., "30/1" or "60000/1001")
        let fps = 30; // Default
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          fps = num / den;
        }

        resolve({
          durationSeconds: duration,
          width,
          height,
          fps,
          format: metadata.format.format_name || 'unknown',
        });
      });
    });
  }

  /**
   * Extract frames from video at specified sampling rate
   *
   * @param storagePath - Path to video in storage
   * @param samplingRate - Frames per second to extract (default: 2 fps)
   * @param onProgress - Optional progress callback
   * @returns Array of extracted frames with metadata
   */
  async extractFrames(
    storagePath: string,
    samplingRate: number = 2,
    onProgress?: (processed: number, total: number) => void
  ): Promise<ExtractedFrame[]> {
    // Download video from storage to temp location
    const tempVideoPath = path.join(this.tempDir, `video-${Date.now()}.mp4`);
    await this.storage.downloadToFile(storagePath, tempVideoPath);

    try {
      // Get video metadata to calculate total frames
      const metadata = await this.getVideoMetadata(tempVideoPath);
      const totalFramesToExtract = Math.ceil(metadata.durationSeconds * samplingRate);

      // Create temp directory for frames
      const framesDir = path.join(this.tempDir, `frames-${Date.now()}`);
      await fs.mkdir(framesDir, { recursive: true });

      // Extract frames using FFmpeg
      await this.extractFramesWithFFmpeg(
        tempVideoPath,
        framesDir,
        samplingRate,
        totalFramesToExtract,
        onProgress
      );

      // Read extracted frames
      const frameFiles = await fs.readdir(framesDir);
      frameFiles.sort(); // Ensure frames are in order

      const frames: ExtractedFrame[] = [];
      for (let i = 0; i < frameFiles.length; i++) {
        const framePath = path.join(framesDir, frameFiles[i]);
        const imageBuffer = await fs.readFile(framePath);

        frames.push({
          frameNumber: i + 1,
          timestamp: i / samplingRate,
          imagePath: framePath,
          imageBuffer,
        });
      }

      return frames;
    } finally {
      // Clean up temp video file
      try {
        await fs.unlink(tempVideoPath);
      } catch (error) {
        console.error('Error cleaning up temp video:', error);
      }
    }
  }

  /**
   * Extract frames using FFmpeg
   */
  private extractFramesWithFFmpeg(
    videoPath: string,
    outputDir: string,
    fps: number,
    totalFrames: number,
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let processedFrames = 0;

      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${fps}`, // Sample at specified FPS
          '-q:v 2', // High quality JPEG
        ])
        .output(path.join(outputDir, 'frame-%04d.jpg'))
        .on('start', (cmd) => {
          console.log('[FFmpeg] Started:', cmd);
        })
        .on('progress', (progress) => {
          // FFmpeg progress includes frames processed
          if (progress.frames) {
            processedFrames = progress.frames;
            onProgress?.(processedFrames, totalFrames);
          }
        })
        .on('end', () => {
          console.log('[FFmpeg] Extraction complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('[FFmpeg] Error:', err);
          reject(new Error(`FFmpeg extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Clean up temporary frame files
   */
  async cleanupFrames(frames: ExtractedFrame[]): Promise<void> {
    for (const frame of frames) {
      try {
        await fs.unlink(frame.imagePath);
      } catch (error) {
        console.error(`Error deleting frame ${frame.frameNumber}:`, error);
      }
    }

    // Clean up frame directories
    try {
      const frameDirs = await fs.readdir(this.tempDir);
      for (const dir of frameDirs) {
        if (dir.startsWith('frames-')) {
          const dirPath = path.join(this.tempDir, dir);
          await fs.rm(dirPath, { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.error('Error cleaning up frame directories:', error);
    }
  }
}
