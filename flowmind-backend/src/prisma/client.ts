/**
 * src/prisma/client.ts — Prisma Client Singleton
 *
 * Prisma v7 uses engine type "client" which requires an explicit database
 * adapter. We use @prisma/adapter-pg (the official pg/postgres.js adapter).
 *
 * The adapter reads DATABASE_URL from the environment. The globalThis guard
 * prevents connection pool exhaustion during hot-reload in development.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // PrismaPg creates a connection pool using the pg library.
  // Pool size defaults to 10 — tune via DATABASE_URL parameters if needed.
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
