/**
 * Mock Gemini Service for Development
 *
 * Simulates Gemini API responses without making actual API calls
 * Useful for local development and testing
 */

import {
  ILLMService,
  StrikeClassificationRequest,
  StrikeClassificationResponse,
  ReportGenerationRequest,
  ReportGenerationResponse,
} from './types';

export class MockGeminiService implements ILLMService {
  private readonly techniques = [
    'jab',
    'cross',
    'hook',
    'uppercut',
    'body_shot',
    'overhand',
    'straight',
  ];

  private readonly outcomes: Array<'landed_clean' | 'partially_landed' | 'blocked' | 'slipped' | 'missed'> = [
    'landed_clean',
    'partially_landed',
    'blocked',
    'slipped',
    'missed',
  ];

  private readonly targetZones: Array<'head' | 'body' | 'legs'> = [
    'head',
    'body',
    'legs',
  ];

  private readonly fighters: Array<'fighter_a' | 'fighter_b'> = [
    'fighter_a',
    'fighter_b',
  ];

  /**
   * Simulate network delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Randomly select item from array
   */
  private randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate random confidence score (higher for cleaner outcomes)
   */
  private generateConfidence(outcome: string): number {
    if (outcome === 'landed_clean') {
      return 0.85 + Math.random() * 0.15; // 0.85-1.0
    } else if (outcome === 'partially_landed') {
      return 0.7 + Math.random() * 0.15; // 0.7-0.85
    } else if (outcome === 'blocked' || outcome === 'slipped') {
      return 0.75 + Math.random() * 0.2; // 0.75-0.95
    } else {
      return 0.6 + Math.random() * 0.2; // 0.6-0.8
    }
  }

  /**
   * Classify a strike in a video frame (MOCK)
   */
  async classifyStrike(
    _request: StrikeClassificationRequest
  ): Promise<StrikeClassificationResponse> {
    // Simulate API call latency (100-300ms)
    await this.delay(100 + Math.random() * 200);

    // 85% chance of strike detection
    const strikeDetected = Math.random() < 0.85;

    if (!strikeDetected) {
      return { strikeDetected: false };
    }

    // Generate realistic strike classification
    const technique = this.randomItem(this.techniques);
    const strikeCategory: 'hand' | 'kick' | 'elbow' | 'knee' =
      technique.includes('kick') ? 'kick' :
      technique.includes('elbow') ? 'elbow' :
      technique.includes('knee') ? 'knee' : 'hand';
    const thrower = this.randomItem(this.fighters);
    const receiver = thrower === 'fighter_a' ? 'fighter_b' : 'fighter_a';
    const throwerStance: 'orthodox' | 'southpaw' | 'switch' = Math.random() < 0.7 ? 'orthodox' : Math.random() < 0.5 ? 'southpaw' : 'switch';
    const targetZone = this.randomItem(this.targetZones);
    const outcome = this.randomItem(this.outcomes);
    const confidence = this.generateConfidence(outcome);

    return {
      strikeDetected: true,
      technique,
      strikeCategory,
      thrower,
      receiver,
      throwerStance,
      targetZone,
      outcome,
      confidence,
    };
  }

  /**
   * Generate analysis report from aggregated data (MOCK)
   */
  async generateReport(
    _request: ReportGenerationRequest
  ): Promise<ReportGenerationResponse> {
    // Simulate API call latency (500-1000ms for longer generation)
    await this.delay(500 + Math.random() * 500);

    const { strikes, fighters, sportType } = _request;

    // Calculate basic stats for report generation
    const totalStrikes = strikes.length;
    const landedStrikes = strikes.filter(
      (s) => s.outcome === 'landed_clean' || s.outcome === 'partially_landed'
    ).length;
    const accuracy = totalStrikes > 0 ? (landedStrikes / totalStrikes) * 100 : 0;

    // Fighter-specific stats
    const fighterStats = fighters.map((fighter) => {
      const fighterStrikes = strikes.filter((s) => s.thrower === fighter.displayName);
      const fighterLanded = fighterStrikes.filter(
        (s) => s.outcome === 'landed_clean' || s.outcome === 'partially_landed'
      ).length;
      const fighterAccuracy = fighterStrikes.length > 0
        ? (fighterLanded / fighterStrikes.length) * 100
        : 0;

      return {
        name: fighter.displayName,
        thrown: fighter.totalStrikesThrown,
        landed: fighter.totalStrikesLanded,
        accuracy: fighterAccuracy,
      };
    });

    // Most common techniques
    const techniqueCount: Record<string, number> = {};
    strikes.forEach((strike) => {
      techniqueCount[strike.technique] = (techniqueCount[strike.technique] || 0) + 1;
    });
    const topTechnique = Object.entries(techniqueCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'jab';

    // Generate mock report sections
    const overview = `This ${sportType} session featured ${totalStrikes} total strikes across ${fighters.length} fighters. The overall striking accuracy was ${accuracy.toFixed(1)}%, with ${landedStrikes} strikes landing cleanly or partially. The ${topTechnique} was the most frequently used technique throughout the session.`;

    const keyInsights = [
      `${fighterStats[0]?.name || 'Fighter A'} threw ${fighterStats[0]?.thrown || 0} strikes with ${fighterStats[0]?.accuracy.toFixed(1)}% accuracy`,
      `${fighterStats[1]?.name || 'Fighter B'} threw ${fighterStats[1]?.thrown || 0} strikes with ${fighterStats[1]?.accuracy.toFixed(1)}% accuracy`,
      `The ${topTechnique} was the dominant technique, showing strong fundamental training`,
      `Strike rate averaged ${(totalStrikes / (strikes[strikes.length - 1]?.timestamp / 60 || 1)).toFixed(1)} strikes per minute`,
    ];

    const strengths = [
      'Good volume of strikes thrown throughout the session',
      'Consistent accuracy across different strike types',
      'Effective use of combinations when opportunities presented',
      'Strong defensive awareness with good slip and block rates',
    ];

    const areasForImprovement = [
      'Increase variety in strike selection to keep opponent guessing',
      'Work on timing to improve landing percentage',
      'Focus on body shots to open up head strike opportunities',
      'Develop better counter-striking after defensive movements',
    ];

    return {
      overview,
      keyInsights,
      strengths,
      areasForImprovement,
    };
  }
}
