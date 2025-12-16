/**
 * Mock Gemini Service Tests
 *
 * Verify mock service generates realistic responses
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockGeminiService } from '../mock-gemini.service';
import { StrikeClassificationRequest } from '../types';

describe('MockGeminiService', () => {
  let service: MockGeminiService;

  beforeEach(() => {
    service = new MockGeminiService();
  });

  describe('classifyStrike', () => {
    it('should return valid strike classification', async () => {
      const request: StrikeClassificationRequest = {
        image: Buffer.from('mock-image'),
        frameNumber: 100,
        timestamp: 5.0,
        sportType: 'boxing',
      };

      const response = await service.classifyStrike(request);

      expect(response).toBeDefined();
      expect(typeof response.strikeDetected).toBe('boolean');

      if (response.strikeDetected) {
        expect(response.technique).toBeDefined();
        expect(response.thrower).toMatch(/fighter_a|fighter_b/);
        expect(response.receiver).toMatch(/fighter_a|fighter_b/);
        expect(response.thrower).not.toBe(response.receiver);
        expect(response.targetZone).toMatch(/head|body|legs/);
        expect(response.outcome).toMatch(
          /landed_clean|partially_landed|blocked|slipped|missed/
        );
        expect(response.confidence).toBeGreaterThanOrEqual(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should simulate API latency', async () => {
      const request: StrikeClassificationRequest = {
        image: Buffer.from('mock-image'),
        frameNumber: 100,
        timestamp: 5.0,
      };

      const start = Date.now();
      await service.classifyStrike(request);
      const duration = Date.now() - start;

      // Should take at least 100ms (our minimum delay)
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should return different results for multiple calls', async () => {
      const request: StrikeClassificationRequest = {
        image: Buffer.from('mock-image'),
        frameNumber: 100,
        timestamp: 5.0,
      };

      const response1 = await service.classifyStrike(request);
      const response2 = await service.classifyStrike(request);

      // Results should vary (not deterministic)
      // At least one of these should be different
      const isDifferent =
        response1.strikeDetected !== response2.strikeDetected ||
        response1.technique !== response2.technique ||
        response1.outcome !== response2.outcome;

      expect(isDifferent).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should return valid analysis report', async () => {
      const request = {
        strikes: [
          {
            technique: 'jab',
            thrower: 'Fighter A',
            targetZone: 'head',
            outcome: 'landed_clean',
            timestamp: 10.5,
          },
          {
            technique: 'cross',
            thrower: 'Fighter B',
            targetZone: 'body',
            outcome: 'blocked',
            timestamp: 12.0,
          },
        ],
        combinations: [],
        fighters: [
          {
            displayName: 'Fighter A',
            totalStrikesThrown: 45,
            totalStrikesLanded: 32,
            totalStrikesReceived: 28,
          },
          {
            displayName: 'Fighter B',
            totalStrikesThrown: 38,
            totalStrikesLanded: 25,
            totalStrikesReceived: 32,
          },
        ],
        sportType: 'boxing',
      };

      const response = await service.generateReport(request);

      expect(response).toBeDefined();
      expect(typeof response.overview).toBe('string');
      expect(response.overview.length).toBeGreaterThan(0);
      expect(Array.isArray(response.keyInsights)).toBe(true);
      expect(response.keyInsights.length).toBeGreaterThan(0);
      expect(Array.isArray(response.strengths)).toBe(true);
      expect(response.strengths.length).toBeGreaterThan(0);
      expect(Array.isArray(response.areasForImprovement)).toBe(true);
      expect(response.areasForImprovement.length).toBeGreaterThan(0);
    });

    it('should include fighter-specific information in report', async () => {
      const request = {
        strikes: [],
        combinations: [],
        fighters: [
          {
            displayName: 'John Doe',
            totalStrikesThrown: 50,
            totalStrikesLanded: 40,
            totalStrikesReceived: 30,
          },
          {
            displayName: 'Jane Smith',
            totalStrikesThrown: 45,
            totalStrikesLanded: 35,
            totalStrikesReceived: 40,
          },
        ],
        sportType: 'boxing',
      };

      const response = await service.generateReport(request);

      // Report should mention fighter names
      const fullReport = JSON.stringify(response).toLowerCase();
      expect(fullReport).toContain('john doe');
      expect(fullReport).toContain('jane smith');
    });

    it('should simulate API latency for report generation', async () => {
      const request = {
        strikes: [],
        combinations: [],
        fighters: [
          {
            displayName: 'Fighter A',
            totalStrikesThrown: 50,
            totalStrikesLanded: 40,
            totalStrikesReceived: 30,
          },
        ],
        sportType: 'boxing',
      };

      const start = Date.now();
      await service.generateReport(request);
      const duration = Date.now() - start;

      // Should take at least 500ms (our minimum delay for reports)
      expect(duration).toBeGreaterThanOrEqual(500);
    });
  });
});
