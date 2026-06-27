/**
 * src/infrastructure/ai/providers/groq.provider.ts
 *
 * Groq LPU implementation of AiProvider.
 * Uses llama-3.1-8b-instant for all operations — fast, cost-effective,
 * and reliable for workflow automation tasks.
 *
 * Singleton pattern: one OpenAI/Groq client, one provider instance.
 */

import OpenAI from 'openai';
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

const log = createLogger('groq-provider');

const MODEL = 'llama-3.1-8b-instant';

export class GroqProvider implements AiProvider {
  readonly name = 'groq';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  // ─── generateText ──────────────────────────────────────────────────────────

  async generateText(options: GenerateTextOptions): Promise<TextResult> {
    const { prompt, systemPrompt, temperature = 0.7, maxTokens = 1024 } = options;

    log.debug({ promptLength: prompt.length }, 'generateText request');

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const text = response.choices[0]?.message?.content ?? '';

      return {
        text,
        model: MODEL,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (err) {
      log.error({ err }, 'Groq generateText failed');
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(`AI generation failed: ${msg}`, 502, 'AI_PROVIDER_ERROR');
    }
  }

  // ─── chat ──────────────────────────────────────────────────────────────────

  async chat(options: ChatOptions): Promise<TextResult> {
    const { messages, systemPrompt, temperature = 0.7, maxTokens = 1024 } = options;

    log.debug({ messageCount: messages.length }, 'chat request');

    try {
      const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        formattedMessages.push({ role: 'system', content: systemPrompt });
      }

      for (const m of messages) {
        formattedMessages.push({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content,
        });
      }

      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const text = response.choices[0]?.message?.content ?? '';

      return {
        text,
        model: MODEL,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (err) {
      log.error({ err }, 'Groq chat failed');
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(`AI chat failed: ${msg}`, 502, 'AI_PROVIDER_ERROR');
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
        temperature: 0.1,
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
      log.error({ err }, 'Groq classify failed');
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppError(`AI classification failed: ${msg}`, 502, 'AI_PROVIDER_ERROR');
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: GroqProvider | null = null;

export function getGroqProvider(): GroqProvider {
  if (_instance) return _instance;

  const apiKey = process.env['GROQ_API_KEY'];
  if (!apiKey) {
    throw new AppError(
      'GROQ_API_KEY is not set. Configure it in .env to use AI nodes.',
      500,
      'AI_NOT_CONFIGURED',
    );
  }

  log.info({ keyPrefix: apiKey.substring(0, 7) + '...' }, 'Initializing GroqProvider');

  _instance = new GroqProvider(apiKey);
  return _instance;
}
