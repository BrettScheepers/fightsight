/**
 * LLM Service Factory
 *
 * Creates appropriate LLM service instance based on configuration
 */

import { ILLMService } from './types';
import { MockGeminiService } from './mock-gemini.service';

export type LLMProvider = 'mock' | 'gemini' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  useMock?: boolean;
}

/**
 * Create LLM service instance based on configuration
 */
export function createLLMService(config?: LLMConfig): ILLMService {
  // Default to mock service for development
  const provider = config?.provider || 'mock';
  const useMock = config?.useMock ?? true;

  // If explicitly set to use mock or no API key provided, use mock
  if (useMock || !config?.apiKey) {
    console.log('[LLM Service] Using MockGeminiService (development mode)');
    return new MockGeminiService();
  }

  // TODO: Implement real Gemini service
  // if (provider === 'gemini') {
  //   return new GeminiService(config.apiKey);
  // }

  // TODO: Implement Claude service
  // if (provider === 'claude') {
  //   return new ClaudeService(config.apiKey);
  // }

  // Fallback to mock
  console.warn(`[LLM Service] Provider '${provider}' not yet implemented, falling back to mock`);
  return new MockGeminiService();
}

/**
 * Get LLM service from environment configuration
 */
export function getLLMService(): ILLMService {
  const config: LLMConfig = {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || 'mock',
    apiKey: process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY,
    useMock: process.env.NODE_ENV !== 'production' && !process.env.GEMINI_API_KEY,
  };

  return createLLMService(config);
}

// Export types and implementations
export * from './types';
export { MockGeminiService } from './mock-gemini.service';
