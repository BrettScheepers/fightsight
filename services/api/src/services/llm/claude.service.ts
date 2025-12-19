/**
 * Claude Service - Anthropic Claude API Integration
 *
 * Uses Claude 3.5 Sonnet for vision-based strike classification
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ILLMService,
  StrikeClassificationRequest,
  StrikeClassificationResponse,
  ReportGenerationRequest,
  ReportGenerationResponse,
} from './types';
import {
  generateStrikeClassificationPrompt,
  generateReportGenerationPrompt,
} from './prompts';

export class ClaudeService implements ILLMService {
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Claude API key is required');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Classify a strike in a video frame using Claude Vision
   */
  async classifyStrike(
    request: StrikeClassificationRequest
  ): Promise<StrikeClassificationResponse> {
    try {
      console.log(`[Claude] Analyzing frame ${request.frameNumber} at ${request.timestamp}s`);

      const prompt = generateStrikeClassificationPrompt({
        sportType: request.sportType || 'boxing',
        frameNumber: request.frameNumber,
        timestamp: request.timestamp,
      });

      // Convert buffer to base64
      const imageBase64 = request.image.toString('base64');

      // Call Claude Vision API
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract text from response
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      console.log(`[Claude] Raw response for frame ${request.frameNumber}:`, textContent.text);

      // Parse JSON response
      const parsed = this.parseJSONResponse(textContent.text);

      // Validate and return
      const validated = this.validateStrikeResponse(parsed);

      console.log(`[Claude] Frame ${request.frameNumber} result:`, JSON.stringify(validated, null, 2));

      return validated;
    } catch (error) {
      console.error(`[Claude] Strike classification error on frame ${request.frameNumber}:`, error);

      // Return no strike detected on error to avoid breaking the pipeline
      return {
        strikeDetected: false,
      };
    }
  }

  /**
   * Generate analysis report from aggregated data
   */
  async generateReport(
    request: ReportGenerationRequest
  ): Promise<ReportGenerationResponse> {
    try {
      // Calculate session duration
      const lastStrike = request.strikes[request.strikes.length - 1];
      const totalDuration = lastStrike?.timestamp || 0;

      // Prepare strike data summary
      const strikeData = this.formatStrikeDataForReport(request);

      const prompt = generateReportGenerationPrompt(
        {
          sportType: request.sportType || 'boxing',
          totalStrikes: request.strikes.length,
          totalDuration,
          fighterCount: request.fighters.length,
        },
        strikeData
      );

      // Call Claude for report generation
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      // Parse JSON response
      const parsed = this.parseJSONResponse(textContent.text);

      // Validate and return
      return this.validateReportResponse(parsed);
    } catch (error) {
      console.error('[Claude] Report generation error:', error);

      // Return fallback report on error
      return this.generateFallbackReport(request);
    }
  }

  /**
   * Parse JSON from Claude response (handles markdown code blocks)
   */
  private parseJSONResponse(text: string): any {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      return JSON.parse(cleanText);
    } catch (error) {
      console.error('[Claude] JSON parse error:', error);
      console.error('[Claude] Raw text:', text);
      throw new Error('Failed to parse Claude response as JSON');
    }
  }

  /**
   * Validate strike classification response
   */
  private validateStrikeResponse(data: any): StrikeClassificationResponse {
    const response: StrikeClassificationResponse = {
      strikeDetected: Boolean(data.strikeDetected),
    };

    if (response.strikeDetected) {
      response.technique = data.technique || undefined;
      response.strikeCategory = this.validateStrikeCategory(data.strikeCategory);
      response.thrower = data.thrower || undefined;
      response.receiver = data.receiver || undefined;
      response.throwerStance = this.validateStance(data.throwerStance);
      response.targetZone = this.validateTargetZone(data.targetZone);
      response.outcome = this.validateOutcome(data.outcome);
      response.confidence = typeof data.confidence === 'number'
        ? Math.max(0, Math.min(1, data.confidence))
        : undefined;
    }

    return response;
  }

  /**
   * Validate strikeCategory to enum values (hand, kick, elbow, knee)
   */
  private validateStrikeCategory(category: string | undefined): 'hand' | 'kick' | 'elbow' | 'knee' | undefined {
    if (!category) return undefined;
    const normalized = category.toLowerCase();

    if (['hand', 'punch', 'fist'].some(v => normalized.includes(v))) return 'hand';
    if (['kick', 'foot'].some(v => normalized.includes(v))) return 'kick';
    if (['elbow'].some(v => normalized.includes(v))) return 'elbow';
    if (['knee'].some(v => normalized.includes(v))) return 'knee';

    // Default to hand for unknown
    return 'hand';
  }

  /**
   * Validate throwerStance to enum values (orthodox, southpaw, switch)
   */
  private validateStance(stance: string | undefined): 'orthodox' | 'southpaw' | 'switch' | undefined {
    if (!stance) return undefined;
    const normalized = stance.toLowerCase();

    if (normalized.includes('orthodox')) return 'orthodox';
    if (normalized.includes('southpaw')) return 'southpaw';
    if (normalized.includes('switch')) return 'switch';

    // Default to orthodox for unknown
    return 'orthodox';
  }

  /**
   * Validate targetZone to enum values (head, body, legs)
   */
  private validateTargetZone(targetZone: string | undefined): 'head' | 'body' | 'legs' | undefined {
    if (!targetZone) return undefined;
    const normalized = targetZone.toLowerCase();

    if (['head', 'face', 'neck', 'chin', 'temple'].some(v => normalized.includes(v))) return 'head';
    if (['body', 'torso', 'chest', 'stomach', 'ribs', 'liver', 'solar'].some(v => normalized.includes(v))) return 'body';
    if (['leg', 'thigh', 'calf', 'foot', 'knee'].some(v => normalized.includes(v))) return 'legs';

    // Default to body for unknown
    return 'body';
  }

  /**
   * Validate outcome to enum values
   */
  private validateOutcome(outcome: string | undefined): 'landed_clean' | 'partially_landed' | 'blocked' | 'slipped' | 'parried' | 'rolled' | 'missed' | 'countered' | undefined {
    if (!outcome) return undefined;
    const normalized = outcome.toLowerCase().replace(/[_\s-]/g, '');

    if (normalized === 'landedclean' || normalized === 'landed' || normalized === 'clean') return 'landed_clean';
    if (normalized.includes('partial')) return 'partially_landed';
    if (normalized.includes('block')) return 'blocked';
    if (normalized.includes('slip') || normalized.includes('dodge') || normalized.includes('evade')) return 'slipped';
    if (normalized.includes('parr')) return 'parried';
    if (normalized.includes('roll')) return 'rolled';
    if (normalized.includes('miss')) return 'missed';
    if (normalized.includes('counter')) return 'countered';

    // Default to missed for unknown
    return 'missed';
  }

  /**
   * Validate report generation response
   */
  private validateReportResponse(data: any): ReportGenerationResponse {
    return {
      overview: data.overview || 'Analysis completed successfully.',
      keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights : [],
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      areasForImprovement: Array.isArray(data.areasForImprovement) ? data.areasForImprovement : [],
    };
  }

  /**
   * Format strike data for report generation
   */
  private formatStrikeDataForReport(request: ReportGenerationRequest): string {
    const lines: string[] = [];

    // Fighter stats
    lines.push('Fighter Statistics:');
    request.fighters.forEach((fighter) => {
      const accuracy = fighter.totalStrikesThrown > 0
        ? ((fighter.totalStrikesLanded / fighter.totalStrikesThrown) * 100).toFixed(1)
        : '0.0';

      lines.push(
        `- ${fighter.displayName}: ${fighter.totalStrikesThrown} thrown, ${fighter.totalStrikesLanded} landed (${accuracy}%), ${fighter.totalStrikesReceived} received`
      );
    });

    lines.push('');

    // Combination stats
    if (request.combinations.length > 0) {
      lines.push('Combinations:');
      request.combinations.forEach((combo) => {
        const accuracy = combo.strikeCount > 0
          ? ((combo.strikesLanded / combo.strikeCount) * 100).toFixed(1)
          : '0.0';

        lines.push(
          `- ${combo.combinationName}: ${combo.strikeCount} strikes, ${combo.strikesLanded} landed (${accuracy}%)`
        );
      });
      lines.push('');
    }

    // Technique breakdown
    const techniqueCount: Record<string, number> = {};
    request.strikes.forEach((strike) => {
      techniqueCount[strike.technique] = (techniqueCount[strike.technique] || 0) + 1;
    });

    lines.push('Technique Breakdown:');
    Object.entries(techniqueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([technique, count]) => {
        lines.push(`- ${technique}: ${count}`);
      });

    return lines.join('\n');
  }

  /**
   * Generate fallback report when Claude fails
   */
  private generateFallbackReport(request: ReportGenerationRequest): ReportGenerationResponse {
    const totalStrikes = request.strikes.length;
    const landedStrikes = request.strikes.filter(
      (s) => s.outcome === 'landed_clean' || s.outcome === 'partially_landed'
    ).length;
    const accuracy = totalStrikes > 0 ? ((landedStrikes / totalStrikes) * 100).toFixed(1) : '0.0';

    return {
      overview: `Analysis completed with ${totalStrikes} strikes detected across ${request.fighters.length} fighters. Overall accuracy: ${accuracy}%.`,
      keyInsights: [
        `Total strikes thrown: ${totalStrikes}`,
        `Total strikes landed: ${landedStrikes}`,
        `Overall accuracy: ${accuracy}%`,
      ],
      strengths: [
        'Active engagement throughout the session',
        'Good volume of strikes thrown',
      ],
      areasForImprovement: [
        'Focus on increasing strike accuracy',
        'Work on defensive techniques',
      ],
    };
  }
}
