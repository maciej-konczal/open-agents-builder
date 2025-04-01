import fs from 'fs';
import path from 'path';
import { VectorStoreManager, VectorStoreConfig, VectorStoreMetadata, PaginationParams, PaginatedResult, VectorStore } from './types';
import { createDiskVectorStore } from './disk-store';
import { getCurrentTimestamp } from './utils';

interface StoreIndex {
  stores: Record<string, Record<string, VectorStoreMetadata>>;
}

export class DiskVectorStoreManager implements VectorStoreManager {
  private baseDir: string;
  private indexPath: string;

  constructor(config: { baseDir: string }) {
    this.baseDir = config.baseDir;
    this.indexPath = path.join(this.baseDir, 'index.json');
    this.ensureIndexFile();
  }

  private ensureIndexFile(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.indexPath)) {
      const initialIndex: StoreIndex = { stores: {} };
      fs.writeFileSync(this.indexPath, JSON.stringify(initialIndex, null, 2));
    }
  }

  private async readIndex(): Promise<StoreIndex> {
    const raw = fs.readFileSync(this.indexPath, 'utf8');
    return JSON.parse(raw);
  }

  private async writeIndex(index: StoreIndex): Promise<void> {
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  async createStore(config: VectorStoreConfig): Promise<VectorStore> {
    const index = await this.readIndex();
    const partitionKey = config.partitionKey;
    const storeName = config.storeName;

    if (index.stores[partitionKey]?.[storeName]) {
      throw new Error(`Store ${storeName} already exists in partition ${partitionKey}`);
    }

    const store = createDiskVectorStore(config);
    const metadata: VectorStoreMetadata = {
      name: storeName,
      partitionKey,
      itemCount: 0,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    if (!index.stores[partitionKey]) {
      index.stores[partitionKey] = {};
    }
    index.stores[partitionKey][storeName] = metadata;
    await this.writeIndex(index);

    return store;
  }

  async deleteStore(partitionKey: string, storeName: string): Promise<void> {
    const index = await this.readIndex();
    if (!index.stores[partitionKey]?.[storeName]) {
      throw new Error(`Store ${storeName} not found in partition ${partitionKey}`);
    }

    const store = await this.getStore(partitionKey, storeName);
    if (store) {
      await store.clear();
    }

    delete index.stores[partitionKey][storeName];
    if (Object.keys(index.stores[partitionKey]).length === 0) {
      delete index.stores[partitionKey];
    }
    await this.writeIndex(index);
  }

  async getStore(partitionKey: string, storeName: string): Promise<VectorStore | null> {
    const index = await this.readIndex();
    if (!index.stores[partitionKey]?.[storeName]) {
      return null;
    }

    const metadata = index.stores[partitionKey][storeName];
    metadata.lastAccessed = getCurrentTimestamp();
    await this.writeIndex(index);

    return createDiskVectorStore({
      storeName,
      partitionKey,
      baseDir: this.baseDir,
      generateEmbeddings: async () => [], // This will be set by the caller
    });
  }

  async listStores(partitionKey: string, params?: PaginationParams): Promise<PaginatedResult<VectorStoreMetadata>> {
    const index = await this.readIndex();
    const stores = index.stores[partitionKey] || {};
    const allStores = Object.values(stores);
    const total = allStores.length;

    if (!params) {
      return {
        items: allStores,
        total,
        hasMore: false,
      };
    }

    const { limit, offset } = params;
    const items = allStores.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      items,
      total,
      hasMore,
    };
  }

  async searchStores(partitionKey: string, query: string, topK: number = 5): Promise<VectorStoreMetadata[]> {
    const index = await this.readIndex();
    const stores = index.stores[partitionKey] || {};
    const allStores = Object.values(stores);

    // Simple text-based search for now
    const queryLower = query.toLowerCase();
    return allStores
      .filter(store => 
        store.name.toLowerCase().includes(queryLower) ||
        store.partitionKey.toLowerCase().includes(queryLower)
      )
      .slice(0, topK);
  }
}

export function createDiskVectorStoreManager(config: { baseDir: string }): VectorStoreManager {
  return new DiskVectorStoreManager(config);
} 