/**
 * prisma.config.ts — Prisma Configuration (Prisma v7+)
 *
 * WHY THIS FILE:
 * Prisma v7 introduced prisma.config.ts as the canonical way to configure
 * datasource URLs, migration paths, and schema location — separate from
 * schema.prisma. This allows runtime env variable loading (via dotenv)
 * without embedding connection strings in schema files.
 *
 * The DATABASE_URL is loaded from the environment at config-read time,
 * which means prisma commands (migrate, studio, generate) automatically
 * pick up the correct URL for each environment (dev, CI, prod).
 */

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Loaded from .env (DATABASE_URL)
    // Docker dev: postgresql://postgres:postgres@postgres:5432/flowmind?schema=public
    // Host direct: postgresql://postgres:postgres@localhost:5432/flowmind?schema=public
    url: process.env['DATABASE_URL'],
  },
});
