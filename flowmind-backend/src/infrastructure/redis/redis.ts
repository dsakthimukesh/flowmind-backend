/**
 * src/infrastructure/redis/redis.ts — Redis Client Singleton
 *
 * WHY SINGLETON:
 * Redis connections are expensive. Each createClient() call opens a new TCP
 * connection. In a hot-reload dev environment or if modules are imported
 * multiple times, naive instantiation creates connection leaks.
 * The globalThis guard mirrors the Prisma singleton pattern.
 *
 * WHY NODE-REDIS (not ioredis):
 * The installed `redis` package (v6) is the official node-redis client.
 * It's actively maintained, Promise-native, and has built-in TypeScript
 * support. BullMQ ships its own ioredis instance internally — this client
 * is for application-level cache and pub/sub, not for BullMQ queues.
 *
 * CONNECTION URL vs HOST/PORT:
 * We build a URL from REDIS_HOST + REDIS_PORT env vars. This keeps the
 * env var surface simple and compatible with Docker service names.
 * Redis Sentinel or Cluster URLs can replace this in production without
 * changing any consumer code.
 *
 * ERROR HANDLING:
 * node-redis v6 emits 'error' events. Without a listener, unhandled 'error'
 * events crash the Node process. We attach a logger-based listener so
 * Redis connection issues surface as structured log entries, not crashes.
 */

import { createClient, type RedisClientType } from 'redis';
import { createLogger } from '../../common/logger.js';

const log = createLogger('redis');

// ─── Global type augmentation ─────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __redis: RedisClientType | undefined;
}

// ─── Client Factory ───────────────────────────────────────────────────────────

function createRedisClient(): RedisClientType {
  const host = process.env['REDIS_HOST'] ?? 'localhost';
  const port = process.env['REDIS_PORT'] ?? '6379';
  const url = `redis://${host}:${port}`;

  const client = createClient({ url }) as RedisClientType;

  // Must attach error listener BEFORE connect() — node-redis emits errors
  // during reconnection attempts and the listener must already be present.
  client.on('error', (err: Error) => {
    log.error({ err }, 'Redis client error');
  });

  client.on('connect', () => {
    log.info({ host, port }, 'Redis client connected');
  });

  client.on('reconnecting', () => {
    log.warn({ host, port }, 'Redis client reconnecting...');
  });

  client.on('ready', () => {
    log.debug('Redis client ready');
  });

  return client;
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const redis: RedisClientType =
  globalThis.__redis ?? createRedisClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__redis = redis;
}

/**
 * Connect the Redis client. Call this once during server bootstrap.
 * Idempotent — calling it when already connected is a no-op.
 */
export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

/**
 * Gracefully disconnect the Redis client. Call this during shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis.isOpen) {
    await redis.quit();
    log.info('Redis client disconnected');
  }
}

export default redis;
