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
  const sourceKey = node.config['sourceKey'] as string;
  const maxLength = node.config['maxLength'] as number | undefined;
  const style     = node.config['style'] as 'paragraph' | 'bullet' | undefined;
  const outputKey = (node.config['outputKey'] as string) ?? 'summary';

  const text = context.data[sourceKey];
  if (typeof text !== 'string' || text.trim() === '') {
    throw new AppError(
      `SUMMARIZE node: context.data.${sourceKey} is missing or not a string`,
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
