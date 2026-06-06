/**
 * src/queues/queue-names.ts — Queue Name Registry
 *
 * Centralizing queue names as a const enum prevents typos that would
 * cause jobs to be added to one queue and consumed from another — a
 * silent failure that is very difficult to debug in production.
 */

export const QUEUE_NAMES = {
  WORKFLOW: 'workflow',
  AI: 'ai',
  EMAIL: 'email',
  DOCUMENT_INDEXING: 'document-indexing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
