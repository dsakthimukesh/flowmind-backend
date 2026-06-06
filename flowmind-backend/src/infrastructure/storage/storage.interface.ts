/**
 * src/infrastructure/storage/storage.interface.ts
 *
 * Provider-agnostic file storage contract.
 * MVP: LocalStorageProvider (disk). Production: S3-compatible (swap here only).
 */

export interface UploadOptions {
  key: string;           // storage path / object key
  content: Buffer;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  /** Persist a file and return the storage key. */
  upload(options: UploadOptions): Promise<string>;

  /** Delete a file by key. No-op if not found. */
  delete(key: string): Promise<void>;

  /** Return a URL or local path to access the file. */
  getUrl(key: string): Promise<string>;
}
