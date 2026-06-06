/**
 * PROMPT node — single-turn text generation.
 *
 * Config shape:
 *   {
 *     prompt: string,          // supports {{context.data.field}} interpolation
 *     systemPrompt?: string,
 *     temperature?: number,    // 0–1
 *     maxTokens?: number,
 *     outputKey?: string       // default: "promptResult"
 *   }
 */

import { aiService } from '../../infrastructure/ai/ai.service.js';
import type { NodeExecutor } from './types.js';

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const keys = path.trim().replace(/^context\.data\./, '').split('.');
    const val = keys.reduce<unknown>((acc, k) => {
      if (acc !== null && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, data);
    return val !== undefined ? String(val) : '';
  });
}

export const promptExecutor: NodeExecutor = async (node, context) => {
  const rawPrompt    = node.config['prompt'] as string;
  const systemPrompt = node.config['systemPrompt'] as string | undefined;
  const temperature  = node.config['temperature'] as number | undefined;
  const maxTokens    = node.config['maxTokens'] as number | undefined;
  const outputKey    = (node.config['outputKey'] as string) ?? 'promptResult';

  const prompt = interpolate(rawPrompt, context.data);

  const result = await aiService.generateText({ prompt, systemPrompt, temperature, maxTokens });

  context.data[outputKey] = result.text;

  return {
    output: {
      [outputKey]: result.text,
      _meta: { model: result.model, usage: result.usage },
    },
  };
};
