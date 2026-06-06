/**
 * CLASSIFY node — categorise text from context.data into one or more labels.
 *
 * Config shape:
 *   {
 *     sourceKey: string,     // key in context.data containing text
 *     labels: string[],      // candidate labels
 *     multiLabel?: boolean,  // default false
 *     outputKey?: string     // default: "classification"
 *   }
 *
 * Output stored in context.data[outputKey]:
 *   { labels: string[], confidence?: number }
 *
 * Downstream CONDITION nodes can branch on context.data.classification.labels[0].
 */

import { aiService } from '../../infrastructure/ai/ai.service.js';
import type { NodeExecutor } from './types.js';
import { AppError } from '../../common/errors/index.js';

export const classifyExecutor: NodeExecutor = async (node, context) => {
  const sourceKey  = node.config['sourceKey'] as string;
  const labels     = node.config['labels'] as string[];
  const multiLabel = node.config['multiLabel'] as boolean | undefined;
  const outputKey  = (node.config['outputKey'] as string) ?? 'classification';

  if (!Array.isArray(labels) || labels.length === 0) {
    throw new AppError('CLASSIFY node: labels must be a non-empty array', 400, 'NODE_CONFIG_ERROR');
  }

  const text = context.data[sourceKey];
  if (typeof text !== 'string' || text.trim() === '') {
    throw new AppError(
      `CLASSIFY node: context.data.${sourceKey} is missing or not a string`,
      400,
      'NODE_CONFIG_ERROR',
    );
  }

  const result = await aiService.classify({ text, labels, multiLabel });

  const output = { labels: result.labels, confidence: result.confidence };
  context.data[outputKey] = output;

  return {
    output: {
      [outputKey]: output,
      _meta: { model: result.model },
    },
  };
};
