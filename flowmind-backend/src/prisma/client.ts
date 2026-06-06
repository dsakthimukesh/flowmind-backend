/**
 * src/prisma/client.ts — Prisma Client Singleton
 *
 * WHY SINGLETON:
 * Prisma Client maintains a connection pool internally. In development with
 * hot reload (tsx --watch), every file change re-evaluates modules, which would
 * create a new PrismaClient instance — and therefore a new connection pool —
 * on every save. This quickly exhausts PostgreSQL's max_connections (default: 100).
 *
 * The solution: store the client on globalThis in development so it survives
 * hot reloads. In production, the module cache ensures a single instance anyway.
 *
 * This is the official Prisma recommendation for Next.js/Node.js with hot reload.
 */

import { PrismaClient } from '../generated/prisma/client.js';

// Declare the globalThis extension for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// ─── Client Factory ──────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  // Prisma v7 requires options to be passed.
  // The datasource URL is resolved from DATABASE_URL env var via prisma.config.ts.
  // Query logging can be enabled at runtime via: DEBUG=prisma:query pnpm dev
  const client = new PrismaClient({} as any);

  return client;
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  // Persist across hot reloads in development only
  globalThis.__prisma = prisma;
}

export default prisma;
