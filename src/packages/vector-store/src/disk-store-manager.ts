import fs from 'fs';
import path from 'path';
import { VectorStoreManager, VectorStoreConfig, VectorStoreMetadata, PaginationParams, PaginatedResult, VectorStore } from './types';
import { createDiskVectorStore } from './disk-store';
import { getCurrentTimestamp } from './utils';

interface StoreIndex {
  [storeName: string]: {
    name: string;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
    lastAccessed?: string;
  };
}

// Global lock map to handle concurrent access across instances
const lockMap = new Map<string, { acquiredAt: number, timeout: NodeJS.Timeout }>();

export class DiskVectorStoreManager implements VectorStoreManager {
  private baseDir: string;
  private indexPath: string;
  private readonly lockTimeout: number = 500; // 500ms timeout

  constructor(config: { baseDir: string }) {
    this.baseDir = config.baseDir;
    this.indexPath = path.join(this.baseDir, 'index.json');
    
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private async acquireLock(): Promise<void> {
    const startTime = Date.now();
    console.debug('[DiskVectorStoreManager] Attempting to acquire lock');
    
    while (true) {
      const existingLock = lockMap.get(this.indexPath);
      
      if (!existingLock) {
        // No lock exists, create one
        const timeout = setTimeout(() => {
          console.warn('[DiskVectorStoreManager] Lock timeout triggered');
          this.releaseLock().catch(console.error);
        }, this.lockTimeout);
        
        lockMap.set(this.indexPath, { acquiredAt: Date.now(), timeout });
        console.debug(`[DiskVectorStoreManager] Lock acquired at ${Date.now()}`);
        return;
      }
      
      // Check if the existing lock has expired
      if (Date.now() - existingLock.acquiredAt > this.lockTimeout) {
        console.warn('[DiskVectorStoreManager] Found expired lock, cleaning up');
        await this.releaseLock();
        continue;
      }
      
      // Check if we've exceeded our own timeout
      if (Date.now() - startTime > this.lockTimeout) {
        throw new Error('Failed to acquire lock: timeout exceeded');
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private async releaseLock(): Promise<void> {
    const lock = lockMap.get(this.indexPath);
    if (lock) {
      clearTimeout(lock.timeout);
      lockMap.delete(this.indexPath);
      console.debug(`[DiskVectorStoreManager] Lock released after ${Date.now() - lock.acquiredAt}ms`);
    }
  }

  private async ensureIndexFile(): Promise<void> {
    if (!fs.existsSync(this.indexPath)) {
      console.debug('[DiskVectorStoreManager] Creating new index file');
      const initialIndex: StoreIndex = {};
      await fs.promises.writeFile(this.indexPath, JSON.stringify(initialIndex, null, 2));
    }
  }

  private async readIndex(): Promise<StoreIndex> {
    try {
      await this.ensureIndexFile();
      const content = await fs.promises.readFile(this.indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[DiskVectorStoreManager] Error reading index:', error);
      return {};
    }
  }

  private async writeIndex(index: StoreIndex): Promise<void> {
    await fs.promises.writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  async createStore(config: VectorStoreConfig): Promise<VectorStore> {
    try {
      await this.acquireLock();
      const index = await this.readIndex();
      const storeName = config.storeName;

      if (index[storeName]) {
        throw new Error(`Store ${storeName} already exists`);
      }

      const store = createDiskVectorStore({
        ...config,
        baseDir: this.baseDir
      });

      const metadata = {
        name: storeName,
        itemCount: 0,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        lastAccessed: getCurrentTimestamp()
      };

      index[storeName] = metadata;
      await this.writeIndex(index);

      return store;
    } finally {
      await this.releaseLock();
    }
  }

  async getStore(partitionKey: string, storeName: string): Promise<VectorStore | null> {
    await this.acquireLock();
    try {
      const index = await this.readIndex();
      const metadata = index[storeName];

      if (!metadata) {
        return null;
      }

      // Update last accessed timestamp
      metadata.lastAccessed = getCurrentTimestamp();
      await this.writeIndex(index);

      return createDiskVectorStore({
        storeName,
        partitionKey,
        baseDir: this.baseDir,
        generateEmbeddings: async () => [], // This will be set when actually using the store
      });
    } finally {
      await this.releaseLock();
    }
  }

  async deleteStore(partitionKey: string, storeName: string): Promise<void> {
    await this.acquireLock();
    try {
      const index = await this.readIndex();
      
      if (index[storeName]) {
        delete index[storeName];
        await this.writeIndex(index);
      }

      const filePath = path.join(this.baseDir, `${storeName}.json`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } finally {
      await this.releaseLock();
    }
  }

  async listStores(partitionKey: string, params?: PaginationParams): Promise<PaginatedResult<VectorStoreMetadata>> {
    console.debug('[DiskVectorStoreManager] Starting listStores operation');
    try {
      await this.acquireLock();
      console.debug('[DiskVectorStoreManager] Lock acquired for listStores');
      
      const index = await this.readIndex();
      const stores = Object.entries(index).map(([storeName, metadata]) => ({
        ...metadata,
        name: storeName,
        partitionKey
      }));

      const offset = params?.offset || 0;
      const limit = params?.limit || 10;

      const result = {
        items: stores.slice(offset, offset + limit),
        total: stores.length,
        hasMore: offset + limit < stores.length
      };

      console.debug('[DiskVectorStoreManager] ListStores operation completed successfully');
      return result;
    } catch (error) {
      console.error('[DiskVectorStoreManager] Error in listStores:', error);
      throw error;
    } finally {
      console.debug('[DiskVectorStoreManager] Releasing lock in listStores');
      await this.releaseLock().catch(error => {
        console.error('[DiskVectorStoreManager] Error releasing lock in listStores:', error);
      });
    }
  }

  async searchStores(partitionKey: string, query: string, topK: number = 5): Promise<VectorStoreMetadata[]> {
    await this.acquireLock();
    try {
      const index = await this.readIndex();
      const stores = Object.entries(index).map(([storeName, metadata]) => ({
        ...metadata,
        name: storeName,
        partitionKey
      }));

      const queryLower = query.toLowerCase();
      return stores
        .filter(store => store.name.toLowerCase().includes(queryLower))
        .slice(0, topK);
    } finally {
      await this.releaseLock();
    }
  }

  async updateStoreMetadata(partitionKey: string, storeName: string, metadata: Partial<VectorStoreMetadata>): Promise<void> {
    await this.acquireLock();
    try {
      const index = await this.readIndex();
      if (!index[storeName]) {
        throw new Error(`Store ${storeName} not found`);
      }

      index[storeName] = {
        ...index[storeName],
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      await this.writeIndex(index);
    } finally {
      await this.releaseLock();
    }
  }
}

export function createDiskVectorStoreManager(config: { baseDir: string }): VectorStoreManager {
  return new DiskVectorStoreManager(config);
} 