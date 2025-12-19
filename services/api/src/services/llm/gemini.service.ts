/**
 * Gemini Service - Real Google Gemini API Integration
 *
 * Uses Gemini 1.5 Flash for vision-based strike classification
 * Free tier: 15 requests per minute, 1500 per day
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiService implements ILLMService {
  private genAI: GoogleGenerativeAI;
  private visionModel: any;
  private textModel: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini Pro Vision for vision analysis (available in free tier)
    this.visionModel = this.genAI.getGenerativeModel({
      model: 'gemini-pro-vision',
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent classification
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    this.textModel = this.genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7, // Higher temperature for more creative reports
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
  }

  /**
   * Classify a strike in a video frame using Gemini Vision
   */
  async classifyStrike(
    request: StrikeClassificationRequest
  ): Promise<StrikeClassificationResponse> {
    try {
      const prompt = generateStrikeClassificationPrompt({
        sportType: request.sportType || 'boxing',
        frameNumber: request.frameNumber,
        timestamp: request.timestamp,
      });

      // Convert buffer to base64 for Gemini
      const imageBase64 = request.image.toString('base64');

      // Call Gemini Vision API
      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = this.parseJSONResponse(text);

      // Validate and return
      return this.validateStrikeResponse(parsed);
    } catch (error) {
      console.error('[Gemini] Strike classification error:', error);

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

      // Call Gemini for report generation
      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = this.parseJSONResponse(text);

      // Validate and return
      return this.validateReportResponse(parsed);
    } catch (error) {
      console.error('[Gemini] Report generation error:', error);

      // Return fallback report on error
      return this.generateFallbackReport(request);
    }
  }

  /**
   * Parse JSON from Gemini response (handles markdown code blocks)
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
      console.error('[Gemini] JSON parse error:', error);
      console.error('[Gemini] Raw text:', text);
      throw new Error('Failed to parse Gemini response as JSON');
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
      response.thrower = data.thrower || undefined;
      response.receiver = data.receiver || undefined;
      response.targetZone = data.targetZone || undefined;
      response.outcome = data.outcome || undefined;
      response.confidence = typeof data.confidence === 'number'
        ? Math.max(0, Math.min(1, data.confidence))
        : undefined;
    }

    return response;
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
   * Generate fallback report when Gemini fails
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
