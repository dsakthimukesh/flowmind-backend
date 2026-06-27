/**
 * SUMMARIZE node — condense text from context.data.
 *
 * Config shape:
 *   {
 *     sourceKey: string,   // key in context.data containing text to summarize
 *     maxLength?: number,  // target word count
 *     style?: "paragraph" | "bullet",
 *     outputKey?: string   // default: "summary"
 *   }
 */

import { aiService } from '../../infrastructure/ai/ai.service.js';
import type { NodeExecutor } from './types.js';
import { AppError } from '../../common/errors/index.js';

export const summarizeExecutor: NodeExecutor = async (node, context) => {
  let sourceKey = node.config['sourceKey'] as string | undefined;

  // Smart fallback chain if sourceKey is not configured (or is undefined in UI)
  if (!sourceKey) {
    if ('promptResult' in context.data) {
      sourceKey = 'promptResult';
    } else if ('chatResult' in context.data) {
      sourceKey = 'chatResult';
    } else if ('transformed' in context.data) {
      sourceKey = 'transformed';
    } else if ('httpResponse' in context.data) {
      sourceKey = 'httpResponse';
    } else {
      const stringKeys = Object.keys(context.data).filter(
        (key) => typeof context.data[key] === 'string' && (context.data[key] as string).trim() !== '',
      );
      sourceKey = stringKeys[0];
    }
  }

  const maxLength = node.config['maxLength'] as number | undefined;
  const style     = node.config['style'] as 'paragraph' | 'bullet' | undefined;
  const outputKey = (node.config['outputKey'] as string) ?? 'summary';

  const text = sourceKey ? context.data[sourceKey] : undefined;
  if (typeof text !== 'string' || text.trim() === '') {
    throw new AppError(
      `SUMMARIZE node: context.data.${sourceKey || 'undefined'} is missing or not a string`,
      400,
      'NODE_CONFIG_ERROR',
    );
  }

  const result = await aiService.summarize({ text, maxLength, style });

  context.data[outputKey] = result.text;

  return {
    output: {
      [outputKey]: result.text,
      _meta: { model: result.model, usage: result.usage },
    },
  };
};
