import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getStorage } from '../services/storage';
import { AnalysisService } from '../services/analysis.service';

const prisma = new PrismaClient();
const analysisService = new AnalysisService();

// Default test user ID for development (before auth is implemented)
const DEFAULT_TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export class VideoController {
  private storage = getStorage();

  /**
   * Ensure test user exists in database
   */
  private async ensureTestUser(): Promise<string> {
    try {
      // Try to find existing test user
      let user = await prisma.user.findUnique({
        where: { email: 'test@fightsight.dev' },
      });

      // Create test user if it doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: DEFAULT_TEST_USER_ID,
            email: 'test@fightsight.dev',
            passwordHash: 'not-used-yet',
            fullName: 'Test User',
            role: 'user',
            emailVerified: true,
          },
        });
      }

      return user.id;
    } catch (error) {
      console.error('Error ensuring test user:', error);
      // Return a valid UUID format even if creation fails
      return DEFAULT_TEST_USER_ID;
    }
  }

  /**
   * Get recent videos with their analysis status
   */
  getRecentVideos = async (_req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Get userId from authenticated request
      const userId = await this.ensureTestUser();

      const videos = await prisma.video.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          analysisSessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              completedAt: true,
              totalStrikesDetected: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Convert BigInt fields to strings for JSON serialization
      const serializedVideos = videos.map((video: any) => ({
        ...video,
        fileSizeBytes: video.fileSizeBytes.toString(),
      }));

      res.json({
        success: true,
        data: serializedVideos,
      });
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };

  /**
   * Create an analysis job for an uploaded video
   */
  createAnalysisJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName, metadata } = req.body;

      if (!fileName) {
        res.status(400).json({ error: 'fileName required' });
        return;
      }

      // TODO: Get userId from authenticated request
      // For now, ensure test user exists and use that
      const userId = await this.ensureTestUser();

      // Verify file exists in storage
      const fileExists = await this.storage.exists(fileName);
      if (!fileExists) {
        res.status(404).json({ error: 'File not found in storage' });
        return;
      }

      // Create video record in database
      const video = await prisma.video.create({
        data: {
          userId,
          originalFilename: fileName,
          storagePath: fileName,
          fileSizeBytes: metadata?.size || 0,
          mimeType: metadata?.contentType || 'video/mp4',
          durationSeconds: 0, // Will be updated by analysis worker
          uploadStatus: 'uploaded',
        },
      });

      // Create analysis session
      const analysisSession = await prisma.analysisSession.create({
        data: {
          videoId: video.id,
          userId,
          sportType: metadata?.sportType || 'boxing',
          status: 'pending',
          progressPercentage: 0,
        },
      });

      res.json({
        success: true,
        data: {
          videoId: video.id,
          analysisSessionId: analysisSession.id,
          status: 'pending',
        },
      });
    } catch (error) {
      console.error('Error creating analysis job:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };

  /**
   * Get video and analysis status
   */
  getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        res.status(400).json({ error: 'videoId required' });
        return;
      }

      // Get video with analysis sessions
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          analysisSessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      const latestSession = video.analysisSessions[0];

      res.json({
        success: true,
        data: {
          videoId: video.id,
          uploadStatus: video.uploadStatus,
          analysisStatus: latestSession?.status || 'pending',
          progressPercentage: latestSession?.progressPercentage || 0,
          startedAt: latestSession?.startedAt,
          completedAt: latestSession?.completedAt,
          errorMessage: latestSession?.errorMessage,
        },
      });
    } catch (error) {
      console.error('Error getting video status:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };

  /**
   * Start analysis on a video
   */
  startAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        res.status(400).json({ error: 'videoId required' });
        return;
      }

      // Get video with latest analysis session
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          analysisSessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      const latestSession = video.analysisSessions[0];

      if (!latestSession) {
        res.status(400).json({ error: 'No analysis session found for this video' });
        return;
      }

      if (latestSession.status === 'processing') {
        res.status(400).json({ error: 'Analysis already in progress' });
        return;
      }

      if (latestSession.status === 'completed') {
        res.status(400).json({ error: 'Analysis already completed' });
        return;
      }

      // Start analysis (runs in background)
      await analysisService.analyzeVideo(videoId, latestSession.id);

      console.log(`[VideoController] Started analysis for video ${videoId}`);

      res.json({
        success: true,
        data: {
          videoId: video.id,
          analysisSessionId: latestSession.id,
          status: 'processing',
          message: 'Analysis started',
        },
      });
    } catch (error) {
      console.error('Error starting analysis:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };

  /**
   * Delete a video and all associated data
   */
  deleteVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        res.status(400).json({ error: 'videoId required' });
        return;
      }

      // Get video to retrieve storage path
      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Delete from storage
      try {
        await this.storage.delete(video.storagePath);
      } catch (error) {
        console.warn(`Failed to delete file from storage: ${error}`);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database (cascade will handle related records)
      await prisma.video.delete({
        where: { id: videoId },
      });

      console.log(`[VideoController] Deleted video ${videoId}`);

      res.json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };

  /**
   * Get analysis results for a video
   */
  getAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        res.status(400).json({ error: 'videoId required' });
        return;
      }

      // Get video with full analysis data
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          analysisSessions: {
            include: {
              sessionFighters: true,
              strikeEvents: {
                include: {
                  thrower: {
                    select: {
                      id: true,
                      displayName: true,
                      fighterLabel: true,
                    },
                  },
                  receiver: {
                    select: {
                      id: true,
                      displayName: true,
                      fighterLabel: true,
                    },
                  },
                },
                orderBy: { timestampSeconds: 'asc' },
              },
              combinations: {
                orderBy: { startTimestampSeconds: 'asc' },
                take: 50,
              },
              analysisReports: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      const latestSession = video.analysisSessions[0];

      if (!latestSession || latestSession.status !== 'completed') {
        res.status(400).json({
          error: 'Analysis not complete',
          status: latestSession?.status || 'pending',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          videoId: video.id,
          video: {
            id: video.id,
            originalFilename: video.originalFilename,
            storagePath: video.storagePath,
            durationSeconds: video.durationSeconds,
          },
          analysisSession: latestSession,
        },
      });
    } catch (error) {
      console.error('Error getting analysis:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };
}
