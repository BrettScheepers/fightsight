/**
 * Direct Analysis Service (No Queue)
 *
 * Simplified service for demo - runs analysis directly in API process
 */

import { PrismaClient } from '@prisma/client';
import { VideoProcessor } from './video-processor';
import { getLLMService } from './llm';

const prisma = new PrismaClient();

export interface StrikeEvent {
  technique: string;
  category: 'hand' | 'kick' | 'elbow' | 'knee';
  thrower: string;
  receiver?: string;
  targetZone: string;
  outcome: string;
  timestamp: number;
  frameNumber?: number;
  confidence?: number;
}

export interface Combination {
  strikeCount: number;
  thrower: string;
  startTimestampSeconds: number;
  endTimestampSeconds: number;
  techniques: string[];
}

export class AnalysisService {
  private videoProcessor = new VideoProcessor();
  private llmService = getLLMService();

  /**
   * Determine strike category from technique name
   */
  private determineStrikeCategory(technique: string): 'hand' | 'kick' | 'elbow' | 'knee' {
    const techLower = technique.toLowerCase();

    // Elbow strikes
    if (techLower.includes('elbow')) {
      return 'elbow';
    }

    // Knee strikes
    if (techLower.includes('knee')) {
      return 'knee';
    }

    // Kicks
    if (techLower.includes('kick') ||
        techLower.includes('teep') ||
        techLower.includes('roundhouse') ||
        techLower.includes('front_kick') ||
        techLower.includes('side_kick') ||
        techLower.includes('spinning') ||
        techLower.includes('axe_kick') ||
        techLower.includes('heel') ||
        techLower.includes('sweep')) {
      return 'kick';
    }

    // Default to hand for punches and everything else
    return 'hand';
  }

  /**
   * Run analysis on a video (async, non-blocking)
   */
  async analyzeVideo(videoId: string, analysisSessionId: string): Promise<void> {
    // Run analysis in background (don't await)
    this.runAnalysis(videoId, analysisSessionId).catch((error) => {
      console.error(`[Analysis] Failed for video ${videoId}:`, error);
    });
  }

  /**
   * Internal analysis runner
   */
  private async runAnalysis(videoId: string, analysisSessionId: string): Promise<void> {
    console.log(`[Analysis] Starting analysis for video ${videoId}`);

    try {
      // Get video and session details
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          analysisSessions: {
            where: { id: analysisSessionId },
          },
        },
      });

      if (!video) {
        throw new Error('Video not found');
      }

      const session = video.analysisSessions[0];
      if (!session) {
        throw new Error('Analysis session not found');
      }

      // Update status to processing
      await this.updateProgress(analysisSessionId, 'processing', 0, 'Starting analysis');

      // Stage 1: Extract frames
      await this.updateProgress(analysisSessionId, 'processing', 5, 'Extracting frames');

      const samplingRate = parseInt(process.env.FRAME_SAMPLING_RATE || '2');
      const frames = await this.videoProcessor.extractFrames(
        video.storagePath,
        samplingRate,
        (processed, total) => {
          const percentage = 5 + Math.floor((processed / total) * 15);
          this.updateProgress(analysisSessionId, 'processing', percentage, 'Extracting frames');
        }
      );

      console.log(`[Analysis] Extracted ${frames.length} frames`);

      // Update video duration
      if (frames.length > 0) {
        const durationSeconds = frames[frames.length - 1].timestamp;
        await prisma.video.update({
          where: { id: videoId },
          data: { durationSeconds },
        });
      }

      // Stage 2: Classify strikes
      await this.updateProgress(analysisSessionId, 'processing', 25, 'Analyzing frames for strikes');

      const strikeEvents: StrikeEvent[] = [];
      const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_LLM_CALLS || '10');

      // Process frames in batches
      for (let i = 0; i < frames.length; i += maxConcurrent) {
        const batch = frames.slice(i, i + maxConcurrent);
        const batchPromises = batch.map((frame) =>
          this.llmService.classifyStrike({
            image: frame.imageBuffer,
            frameNumber: frame.frameNumber,
            timestamp: frame.timestamp,
            sportType: session.sportType,
          })
        );

        const batchResults = await Promise.all(batchPromises);

        // Collect strikes
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.strikeDetected && result.technique) {
            const category = this.determineStrikeCategory(result.technique);
            strikeEvents.push({
              technique: result.technique,
              category,
              thrower: result.thrower || 'unknown',
              receiver: result.receiver,
              targetZone: result.targetZone || 'unknown',
              outcome: result.outcome || 'unknown',
              timestamp: batch[j].timestamp,
              frameNumber: batch[j].frameNumber,
              confidence: result.confidence,
            });
          }
        }

        // Update progress
        const processed = Math.min(i + maxConcurrent, frames.length);
        const percentage = 25 + Math.floor((processed / frames.length) * 50);
        await this.updateProgress(
          analysisSessionId,
          'processing',
          percentage,
          `Analyzed ${processed}/${frames.length} frames`
        );
      }

      console.log(`[Analysis] Detected ${strikeEvents.length} strikes`);

      // Clean up frames
      await this.videoProcessor.cleanupFrames(frames);

      // Stage 3: Detect combinations
      await this.updateProgress(analysisSessionId, 'processing', 80, 'Analyzing combinations');
      const combinations = this.detectCombinations(strikeEvents);

      // Stage 4: Generate report
      await this.updateProgress(analysisSessionId, 'processing', 85, 'Generating report');

      const fighterStats = this.calculateFighterStats(strikeEvents);
      const report = await this.llmService.generateReport({
        strikes: strikeEvents,
        combinations: combinations.map(c => ({
          combinationName: c.techniques.join(' → '),
          strikeCount: c.strikeCount,
          strikesLanded: c.strikeCount, // All strikes in combo are landed
        })),
        fighters: fighterStats,
        sportType: session.sportType,
      });

      // Stage 5: Save results
      await this.updateProgress(analysisSessionId, 'processing', 90, 'Saving results');
      await this.saveResults(analysisSessionId, strikeEvents, combinations, fighterStats, report);

      // Complete!
      await this.updateProgress(analysisSessionId, 'completed', 100, 'Analysis complete');

      console.log(`[Analysis] Completed for video ${videoId}: ${strikeEvents.length} strikes`);

    } catch (error) {
      console.error(`[Analysis] Error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.analysisSession.update({
        where: { id: analysisSessionId },
        data: {
          status: 'failed',
          errorMessage,
        },
      });
    }
  }

  /**
   * Detect strike combinations
   */
  private detectCombinations(strikes: StrikeEvent[]): Combination[] {
    const combinations: Combination[] = [];
    const maxComboGapSeconds = 2.0;

    let currentCombo: StrikeEvent[] = [];
    let currentThrower: string | null = null;

    for (const strike of strikes) {
      const isLanded = ['landed_clean', 'partially_landed'].includes(strike.outcome);
      if (!isLanded) continue;

      if (
        currentThrower === strike.thrower &&
        currentCombo.length > 0 &&
        strike.timestamp - currentCombo[currentCombo.length - 1].timestamp <= maxComboGapSeconds
      ) {
        currentCombo.push(strike);
      } else {
        if (currentCombo.length >= 2) {
          combinations.push({
            strikeCount: currentCombo.length,
            thrower: currentThrower!,
            startTimestampSeconds: currentCombo[0].timestamp,
            endTimestampSeconds: currentCombo[currentCombo.length - 1].timestamp,
            techniques: currentCombo.map((s) => s.technique),
          });
        }
        currentCombo = [strike];
        currentThrower = strike.thrower;
      }
    }

    if (currentCombo.length >= 2 && currentThrower) {
      combinations.push({
        strikeCount: currentCombo.length,
        thrower: currentThrower,
        startTimestampSeconds: currentCombo[0].timestamp,
        endTimestampSeconds: currentCombo[currentCombo.length - 1].timestamp,
        techniques: currentCombo.map((s) => s.technique),
      });
    }

    return combinations;
  }

  /**
   * Calculate fighter statistics
   */
  private calculateFighterStats(strikes: StrikeEvent[]) {
    const fighterMap = new Map<string, {
      displayName: string;
      totalStrikesThrown: number;
      totalStrikesLanded: number;
      totalStrikesReceived: number;
    }>();

    for (const strike of strikes) {
      if (!fighterMap.has(strike.thrower)) {
        fighterMap.set(strike.thrower, {
          displayName: strike.thrower,
          totalStrikesThrown: 0,
          totalStrikesLanded: 0,
          totalStrikesReceived: 0,
        });
      }

      const throwerStats = fighterMap.get(strike.thrower)!;
      throwerStats.totalStrikesThrown++;

      if (['landed_clean', 'partially_landed'].includes(strike.outcome)) {
        throwerStats.totalStrikesLanded++;
      }

      if (strike.receiver) {
        if (!fighterMap.has(strike.receiver)) {
          fighterMap.set(strike.receiver, {
            displayName: strike.receiver,
            totalStrikesThrown: 0,
            totalStrikesLanded: 0,
            totalStrikesReceived: 0,
          });
        }

        const receiverStats = fighterMap.get(strike.receiver)!;
        if (['landed_clean', 'partially_landed'].includes(strike.outcome)) {
          receiverStats.totalStrikesReceived++;
        }
      }
    }

    return Array.from(fighterMap.values());
  }

  /**
   * Save analysis results to database
   */
  private async saveResults(
    analysisSessionId: string,
    strikes: StrikeEvent[],
    combinations: Combination[],
    fighterStats: any[],
    report: any
  ) {
    // Create fighters
    const fighterRecords = await Promise.all(
      fighterStats.map(async (stats) => {
        return prisma.sessionFighter.upsert({
          where: {
            unique_fighter_per_session: {
              analysisSessionId: analysisSessionId,
              fighterLabel: stats.displayName,
            },
          },
          create: {
            analysisSessionId: analysisSessionId,
            displayName: stats.displayName,
            fighterLabel: stats.displayName,
            stance: 'orthodox', // Default stance
            totalStrikesThrown: stats.totalStrikesThrown,
            totalStrikesLanded: stats.totalStrikesLanded,
            totalStrikesReceived: stats.totalStrikesReceived,
          },
          update: {
            totalStrikesThrown: stats.totalStrikesThrown,
            totalStrikesLanded: stats.totalStrikesLanded,
            totalStrikesReceived: stats.totalStrikesReceived,
          },
        });
      })
    );

    const fighterIdMap = new Map<string, string>();
    for (const fighter of fighterRecords) {
      fighterIdMap.set(fighter.displayName, fighter.id);
    }

    // Save strikes
    await Promise.all(
      strikes.map((strike) =>
        prisma.strikeEvent.create({
          data: {
            analysisSessionId: analysisSessionId,
            technique: strike.technique,
            strikeCategory: strike.category,
            throwerId: fighterIdMap.get(strike.thrower)!,
            receiverId: strike.receiver ? fighterIdMap.get(strike.receiver) : null,
            targetZone: strike.targetZone,
            outcome: strike.outcome,
            timestampSeconds: strike.timestamp,
            frameNumber: strike.frameNumber || 0,
            detectionConfidence: strike.confidence,
            throwerStance: 'orthodox', // Default stance for demo
          },
        })
      )
    );

    // Save combinations
    await Promise.all(
      combinations.map((combo) =>
        prisma.combination.create({
          data: {
            analysisSessionId: analysisSessionId,
            throwerId: fighterIdMap.get(combo.thrower)!,
            strikeCount: combo.strikeCount,
            startTimestampSeconds: combo.startTimestampSeconds,
            endTimestampSeconds: combo.endTimestampSeconds,
            durationSeconds: combo.endTimestampSeconds - combo.startTimestampSeconds,
          },
        })
      )
    );

    // Save report
    await prisma.analysisReport.create({
      data: {
        analysisSessionId: analysisSessionId,
        reportType: 'full_analysis',
        reportFormat: 'json',
        keyInsights: report.keyInsights,
        strengths: report.strengths,
        areasForImprovement: report.areasForImprovement,
      },
    });

    // Update session stats
    await prisma.analysisSession.update({
      where: { id: analysisSessionId },
      data: {
        totalStrikesDetected: strikes.length,
        totalCombinationsDetected: combinations.length,
      },
    });
  }

  /**
   * Update progress
   */
  private async updateProgress(
    sessionId: string,
    status: string,
    percentage: number,
    message?: string
  ) {
    const updateData: any = {
      status,
      progressPercentage: percentage,
    };

    if (status === 'processing' && percentage === 0) {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    await prisma.analysisSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    console.log(`[Analysis] ${sessionId}: ${percentage}% - ${message || status}`);
  }
}
