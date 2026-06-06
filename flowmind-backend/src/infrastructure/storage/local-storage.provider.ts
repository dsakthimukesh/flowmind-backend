/**
 * src/infrastructure/storage/local-storage.provider.ts
 *
 * Stores files on the local filesystem under ./uploads/.
 * Suitable for Docker development — mount a volume to persist across restarts.
 * Swap for S3Provider in production without changing any caller code.
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../common/logger.js';
import type { StorageProvider, UploadOptions } from './storage.interface.js';

const log = createLogger('local-storage');

const BASE_DIR = path.resolve(process.cwd(), 'uploads');

export class LocalStorageProvider implements StorageProvider {
  async upload(options: UploadOptions): Promise<string> {
    const fullPath = path.join(BASE_DIR, options.key);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, options.content);

    log.debug({ key: options.key, size: options.size }, 'File stored locally');
    return options.key;
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(BASE_DIR, key));
    } catch {
      // File not found — treat as success (idempotent delete)
    }
  }

  async getUrl(key: string): Promise<string> {
    // In dev, return a relative path. In production replace with a signed S3 URL.
    return `/uploads/${key}`;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: LocalStorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_instance) _instance = new LocalStorageProvider();
  return _instance;
}
