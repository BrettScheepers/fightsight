/**
 * Storage Service Factory
 *
 * Provides a unified storage interface that can swap between:
 * - Local filesystem (development)
 * - Google Cloud Storage (production)
 * - AWS S3 (future)
 */

import { StorageProvider } from './types';
import { LocalStorage } from './local-storage';

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: 'local' | 'gcs' | 's3';

  // Local storage config
  local?: {
    uploadsDir: string;
    baseUrl: string;
  };

  // GCS config (future)
  gcs?: {
    projectId: string;
    bucketName: string;
    credentialsPath: string;
  };

  // S3 config (future)
  s3?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Create storage provider based on configuration
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.type) {
    case 'local':
      if (!config.local) {
        throw new Error('Local storage config is required when type is "local"');
      }
      return new LocalStorage(config.local);

    case 'gcs':
      // TODO: Implement GCS provider
      throw new Error('GCS storage provider not yet implemented');

    case 's3':
      // TODO: Implement S3 provider
      throw new Error('S3 storage provider not yet implemented');

    default:
      throw new Error(`Unknown storage type: ${config.type}`);
  }
}

/**
 * Get storage provider from environment variables
 */
export function getStorageProvider(): StorageProvider {
  const storageType = (process.env.STORAGE_TYPE || 'local') as StorageConfig['type'];

  const config: StorageConfig = {
    type: storageType,
    local: {
      uploadsDir: process.env.UPLOADS_DIR || './uploads',
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    },
    // Add other configs when implemented
  };

  return createStorageProvider(config);
}

// Export singleton instance
let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = getStorageProvider();
  }
  return storageInstance;
}

// Export types and classes
export * from './types';
export { LocalStorage } from './local-storage';
