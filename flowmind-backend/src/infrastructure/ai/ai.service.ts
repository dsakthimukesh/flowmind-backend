/**
 * src/infrastructure/ai/ai.service.ts — AI Service Facade
 *
 * Single entry point for all AI operations across the codebase.
 * Resolves the active provider and delegates. Node executors import
 * this — never a concrete provider directly.
 *
 * Provider selection: GEMINI_API_KEY → Gemini (default)
 * Future: OPENAI_API_KEY → OpenAI, OPENROUTER_API_KEY → OpenRouter
 */

import type { AiProvider } from './ai-provider.interface.js';
import { getGeminiProvider } from './providers/gemini.provider.js';

export type {
  GenerateTextOptions,
  ChatOptions,
  SummarizeOptions,
  ClassifyOptions,
  TextResult,
  ClassifyResult,
} from './ai-provider.interface.js';

function resolveProvider(): AiProvider {
  // Priority: Gemini → (future) OpenAI
  if (process.env['GEMINI_API_KEY']) {
    return getGeminiProvider();
  }

  // Fallback error — no provider configured
  throw new Error(
    'No AI provider configured. Set GEMINI_API_KEY in your environment.',
  );
}

// Lazy singleton — provider is resolved on first call, not at module load
let _provider: AiProvider | null = null;

function getProvider(): AiProvider {
  if (!_provider) _provider = resolveProvider();
  return _provider;
}

// ─── Exported methods ─────────────────────────────────────────────────────────

export const aiService = {
  generateText: (opts: Parameters<AiProvider['generateText']>[0]) =>
    getProvider().generateText(opts),

  chat: (opts: Parameters<AiProvider['chat']>[0]) =>
    getProvider().chat(opts),

  summarize: (opts: Parameters<AiProvider['summarize']>[0]) =>
    getProvider().summarize(opts),

  classify: (opts: Parameters<AiProvider['classify']>[0]) =>
    getProvider().classify(opts),

  get providerName(): string {
    return getProvider().name;
  },
};
