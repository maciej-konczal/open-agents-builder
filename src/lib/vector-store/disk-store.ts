import { StorageService } from "@/lib/storage-service";
import { VectorStore, VectorStoreConfig, VectorStoreEntry } from './types';
import { getCurrentTimestamp, sortBySimilarity } from './utils';
import { GenerateEmbeddings } from './types';

interface DiskStoreData {
  config: VectorStoreConfig;
  entries: Record<string, VectorStoreEntry>;
}

export class DiskVectorStore implements VectorStore {
  private storageService: StorageService;
  private config: VectorStoreConfig;
  private generateEmbeddings: GenerateEmbeddings;
  private fileName: string;

  constructor(config: VectorStoreConfig, generateEmbeddings: GenerateEmbeddings) {
    this.config = config;
    this.generateEmbeddings = generateEmbeddings;
    this.storageService = new StorageService(config.partitionKey || 'default', 'vector-store');
    this.fileName = `${config.storeName}.json`;
  }

  private async readData(): Promise<DiskStoreData> {
    try {
      return this.storageService.readPlainJSONAttachment<DiskStoreData>(this.fileName);
    } catch {
      // If file doesn't exist or is invalid, return empty store
      return {
        config: this.config,
        entries: {}
      };
    }
  }

  private async writeData(data: DiskStoreData): Promise<void> {
    await this.storageService.acquireLock(this.fileName);
    try {
      this.storageService.writePlainJSONAttachment(this.fileName, data, this.config.maxFileSizeMB);
    } finally {
      this.storageService.releaseLock(this.fileName);
    }
  }

  async set(id: string, entry: Omit<VectorStoreEntry, 'id'>): Promise<void> {
    const data = await this.readData();
    data.entries[id] = {
      ...entry,
      id,
      createdAt: entry.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await this.writeData(data);
  }

  async get(id: string): Promise<VectorStoreEntry | null> {
    const data = await this.readData();
    return data.entries[id] || null;
  }

  async delete(id: string): Promise<void> {
    const data = await this.readData();
    delete data.entries[id];
    await this.writeData(data);
  }

  async upsert(id: string, entry: Omit<VectorStoreEntry, 'id'>): Promise<void> {
    const existing = await this.get(id);
    if (existing) {
      await this.set(id, {
        ...entry,
        createdAt: existing.createdAt,
        updatedAt: getCurrentTimestamp()
      });
    } else {
      await this.set(id, entry);
    }
  }

  async entries(): Promise<VectorStoreEntry[]> {
    const data = await this.readData();
    return Object.values(data.entries);
  }

  async search(query: string, topK?: number): Promise<VectorStoreEntry[]> {
    const queryEmbedding = await this.generateEmbeddings(query);
    const allEntries = await this.entries();
    return sortBySimilarity(allEntries, queryEmbedding, topK);
  }

  getConfig(): VectorStoreConfig {
    return this.config;
  }

  async clear(): Promise<void> {
    const data = await this.readData();
    data.entries = {};
    await this.writeData(data);
  }
}

export const createDiskVectorStore = (
  config: VectorStoreConfig,
  generateEmbeddings: GenerateEmbeddings
): VectorStore => {
  return new DiskVectorStore(config, generateEmbeddings);
}; 