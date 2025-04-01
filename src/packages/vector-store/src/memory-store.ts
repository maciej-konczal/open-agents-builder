import { VectorStore, VectorStoreConfig, VectorStoreEntry } from './types';
import { getCurrentTimestamp, sortBySimilarity } from './utils';
import { GenerateEmbeddings } from './types';

export class InMemoryVectorStore implements VectorStore {
  private store: Map<string, VectorStoreEntry> = new Map();
  private config: VectorStoreConfig;
  private generateEmbeddings: GenerateEmbeddings;

  constructor(config: VectorStoreConfig, generateEmbeddings: GenerateEmbeddings) {
    this.config = config;
    this.generateEmbeddings = generateEmbeddings;
  }

  async set(id: string, entry: Omit<VectorStoreEntry, 'id'>): Promise<void> {
    this.store.set(id, {
      ...entry,
      id,
      createdAt: entry.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    });
  }

  async get(id: string): Promise<VectorStoreEntry | null> {
    return this.store.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
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
    return Array.from(this.store.values());
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
    this.store.clear();
  }
}

export const createInMemoryVectorStore = (
  config: VectorStoreConfig,
  generateEmbeddings: GenerateEmbeddings
): VectorStore => {
  return new InMemoryVectorStore(config, generateEmbeddings);
}; 