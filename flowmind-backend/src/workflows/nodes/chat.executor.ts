/**
 * CHAT node — multi-turn conversation.
 *
 * Config shape:
 *   {
 *     messages: Array<{ role: "user"|"assistant"|"system", content: string }>,
 *     systemPrompt?: string,
 *     temperature?: number,
 *     maxTokens?: number,
 *     outputKey?: string   // default: "chatResult"
 *   }
 *
 * `messages` content strings support {{context.data.field}} interpolation.
 */

import { aiService } from '../../infrastructure/ai/ai.service.js';
import type { NodeExecutor } from './types.js';
import type { ChatMessage } from '../../infrastructure/ai/ai-provider.interface.js';

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

export const chatExecutor: NodeExecutor = async (node, context) => {
  const rawMessages  = node.config['messages'] as ChatMessage[];
  const systemPrompt = node.config['systemPrompt'] as string | undefined;
  const temperature  = node.config['temperature'] as number | undefined;
  const maxTokens    = node.config['maxTokens'] as number | undefined;
  const outputKey    = (node.config['outputKey'] as string) ?? 'chatResult';

  const messages: ChatMessage[] = rawMessages.map((m) => ({
    role: m.role,
    content: interpolate(m.content, context.data),
  }));

  const result = await aiService.chat({ messages, systemPrompt, temperature, maxTokens });

  context.data[outputKey] = result.text;

  return {
    output: {
      [outputKey]: result.text,
      _meta: { model: result.model, usage: result.usage },
    },
  };
};
