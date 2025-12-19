/**
 * LLM Service Types
 *
 * Abstraction for vision-based strike classification
 * Supports multiple providers: Gemini, Claude, etc.
 */

export interface StrikeClassificationRequest {
  image: Buffer;
  frameNumber: number;
  timestamp: number;
  sportType?: string;
}

export interface StrikeClassificationResponse {
  strikeDetected: boolean;
  technique?: string;
  strikeCategory?: 'hand' | 'kick' | 'elbow' | 'knee';
  thrower?: 'fighter_a' | 'fighter_b';
  receiver?: 'fighter_a' | 'fighter_b';
  throwerStance?: 'orthodox' | 'southpaw' | 'switch';
  targetZone?: 'head' | 'body' | 'legs';
  outcome?: 'landed_clean' | 'partially_landed' | 'blocked' | 'slipped' | 'parried' | 'rolled' | 'missed' | 'countered';
  confidence?: number;
}

export interface ReportGenerationRequest {
  strikes: Array<{
    technique: string;
    thrower: string;
    targetZone: string;
    outcome: string;
    timestamp: number;
  }>;
  combinations: Array<{
    combinationName: string;
    strikeCount: number;
    strikesLanded: number;
  }>;
  fighters: Array<{
    displayName: string;
    totalStrikesThrown: number;
    totalStrikesLanded: number;
    totalStrikesReceived: number;
  }>;
  sportType: string;
}

export interface ReportGenerationResponse {
  overview: string;
  keyInsights: string[];
  strengths: string[];
  areasForImprovement: string[];
}

export interface ILLMService {
  /**
   * Classify a strike in a video frame
   */
  classifyStrike(request: StrikeClassificationRequest): Promise<StrikeClassificationResponse>;

  /**
   * Generate analysis report from aggregated data
   */
  generateReport(request: ReportGenerationRequest): Promise<ReportGenerationResponse>;
}
