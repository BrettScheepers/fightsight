/**
 * LLM Service Factory
 *
 * Creates appropriate LLM service instance based on configuration
 */

import { ILLMService } from './types';
import { MockGeminiService } from './mock-gemini.service';
import { GeminiService } from './gemini.service';
import { ClaudeService } from './claude.service';

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

  // If explicitly set to use mock, use mock
  if (useMock) {
    console.log('[LLM Service] Using MockGeminiService (development mode)');
    return new MockGeminiService();
  }

  // Real Gemini service
  if (provider === 'gemini' && config?.apiKey) {
    console.log('[LLM Service] Using GeminiService (Gemini 1.5 Flash)');
    return new GeminiService(config.apiKey);
  }

  // Real Claude service
  if (provider === 'claude' && config?.apiKey) {
    console.log('[LLM Service] Using ClaudeService (Claude 3.5 Sonnet)');
    return new ClaudeService(config.apiKey);
  }

  // Fallback to mock if no API key
  if (!config?.apiKey) {
    console.warn('[LLM Service] No API key provided, falling back to mock');
    return new MockGeminiService();
  }

  // Fallback to mock
  console.warn(`[LLM Service] Provider '${provider}' not yet implemented, falling back to mock`);
  return new MockGeminiService();
}

/**
 * Get LLM service from environment configuration
 */
export function getLLMService(): ILLMService {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || 'gemini';

  // Select API key based on provider
  let apiKey: string | undefined;
  if (provider === 'claude') {
    apiKey = process.env.ANTHROPIC_API_KEY;
  } else if (provider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY;
  }

  const config: LLMConfig = {
    provider,
    apiKey,
    useMock: !apiKey, // Use mock only if no API key is provided
  };

  return createLLMService(config);
}

// Export types and implementations
export * from './types';
export { MockGeminiService } from './mock-gemini.service';
export { GeminiService } from './gemini.service';
export { ClaudeService } from './claude.service';
