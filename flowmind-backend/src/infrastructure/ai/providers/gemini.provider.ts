/**
 * src/infrastructure/ai/providers/gemini.provider.ts
 *
 * Google Gemini Flash implementation of AiProvider.
 * Uses gemini-2.0-flash for all operations — fast, cost-effective,
 * suitable for workflow automation tasks.
 *
 * Singleton pattern: one GoogleGenAI client, one provider instance.
 */

import { GoogleGenAI } from '@google/genai';
import type {
  AiProvider,
  GenerateTextOptions,
  ChatOptions,
  SummarizeOptions,
  ClassifyOptions,
  TextResult,
  ClassifyResult,
} from '../ai-provider.interface.js';
import { AppError } from '../../../common/errors/index.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('gemini-provider');

const MODEL = 'gemini-2.0-flash';

// ─── Provider ─────────────────────────────────────────────────────────────────

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  // ─── generateText ──────────────────────────────────────────────────────────

  async generateText(options: GenerateTextOptions): Promise<TextResult> {
    const { prompt, systemPrompt, temperature = 0.7, maxTokens = 1024 } = options;

    log.debug({ promptLength: prompt.length }, 'generateText request');

    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const text = response.text ?? '';

      return {
        text,
        model: MODEL,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (err) {
      log.error({ err }, 'Gemini generateText failed');
      throw new AppError('AI generation failed', 502, 'AI_PROVIDER_ERROR');
    }
  }

  // ─── chat ──────────────────────────────────────────────────────────────────

  async chat(options: ChatOptions): Promise<TextResult> {
    const { messages, systemPrompt, temperature = 0.7, maxTokens = 1024 } = options;

    log.debug({ messageCount: messages.length }, 'chat request');

    try {
      // Build Gemini content array from ChatMessage array
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      // Prepend system message into first user turn if no explicit systemPrompt
      const sysInstruction =
        systemPrompt ??
        messages.find((m) => m.role === 'system')?.content;

      const response = await this.client.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: sysInstruction,
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      return {
        text: response.text ?? '',
        model: MODEL,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (err) {
      log.error({ err }, 'Gemini chat failed');
      throw new AppError('AI chat failed', 502, 'AI_PROVIDER_ERROR');
    }
  }

  // ─── summarize ─────────────────────────────────────────────────────────────

  async summarize(options: SummarizeOptions): Promise<TextResult> {
    const { text, maxLength = 150, style = 'paragraph' } = options;

    const styleInstruction =
      style === 'bullet'
        ? 'Respond with a concise bullet-point summary.'
        : 'Respond with a concise paragraph summary.';

    const prompt = `${styleInstruction} Target length: ~${maxLength} words.\n\nText to summarize:\n${text}`;

    return this.generateText({ prompt, temperature: 0.3, maxTokens: maxLength * 2 });
  }

  // ─── classify ──────────────────────────────────────────────────────────────

  async classify(options: ClassifyOptions): Promise<ClassifyResult> {
    const { text, labels, multiLabel = false } = options;

    const instruction = multiLabel
      ? `Classify the following text into one or more of these categories: ${labels.join(', ')}. Return only the matching category names separated by commas.`
      : `Classify the following text into exactly one of these categories: ${labels.join(', ')}. Return only the category name, nothing else.`;

    const prompt = `${instruction}\n\nText:\n${text}`;

    try {
      const result = await this.generateText({
        prompt,
        temperature: 0.1,  // low temperature for deterministic classification
        maxTokens: 64,
      });

      const selected = result.text
        .split(',')
        .map((l) => l.trim())
        .filter((l) => labels.includes(l));

      return {
        labels: selected.length > 0 ? selected : [labels[0]!],
        model: MODEL,
      };
    } catch (err) {
      log.error({ err }, 'Gemini classify failed');
      throw new AppError('AI classification failed', 502, 'AI_PROVIDER_ERROR');
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: GeminiProvider | null = null;

export function getGeminiProvider(): GeminiProvider {
  if (_instance) return _instance;

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new AppError(
      'GEMINI_API_KEY is not set. Configure it in .env to use AI nodes.',
      500,
      'AI_NOT_CONFIGURED',
    );
  }

  _instance = new GeminiProvider(apiKey);
  return _instance;
}
