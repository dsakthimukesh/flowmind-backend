/**
 * src/prisma/prisma.ts — Canonical Prisma Singleton Export
 *
 * WHY THIS FILE EXISTS ALONGSIDE client.ts:
 * client.ts contains the factory logic and globalThis anti-pattern guard.
 * This file is the public-facing import surface — every module in the
 * codebase imports from here, not from client.ts directly.
 *
 * This indirection means we can swap the underlying client implementation
 * (e.g., add middleware, swap to Prisma Accelerate, add tracing) in one
 * place without touching every consumer.
 *
 * Convention: always import prisma from '@/prisma/prisma.js'
 */

export { prisma, default } from './client.js';
