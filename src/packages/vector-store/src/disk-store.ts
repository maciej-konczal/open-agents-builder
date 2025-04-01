import fs from 'fs';
import path from 'path';
import { VectorStore, VectorStoreConfig, VectorStoreEntry, GenerateEmbeddings, PaginationParams, PaginatedResult } from './types';
import { generateEntryId, getCurrentTimestamp } from './utils';

export class DiskVectorStore implements VectorStore {
  private storePath: string;
  private lockPath: string;
  private config: VectorStoreConfig;
  private generateEmbeddings: GenerateEmbeddings;

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.generateEmbeddings = config.generateEmbeddings;
    
    // Create base directory structure using the configured baseDir
    const baseDir = path.join(config.baseDir, config.partitionKey, 'vector-store');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // Set up file paths
    this.storePath = path.join(baseDir, `${config.storeName}.json`);
    this.lockPath = `${this.storePath}.lock`;
  }

  private async acquireLock(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (fs.existsSync(this.lockPath)) {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error(`Could not acquire lock after ${maxAttempts} attempts`);
      }
      await delay(100);
    }

    fs.writeFileSync(this.lockPath, '');
  }

  private releaseLock(): void {
    if (fs.existsSync(this.lockPath)) {
      fs.unlinkSync(this.lockPath);
    }
  }

  private async readData(): Promise<Record<string, VectorStoreEntry>> {
    if (!fs.existsSync(this.storePath)) {
      return {};
    }
    const raw = fs.readFileSync(this.storePath, 'utf8');
    return JSON.parse(raw);
  }

  private async writeData(data: Record<string, VectorStoreEntry>): Promise<void> {
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString, 'utf8');

    if (size > (this.config.maxFileSizeMB || 10) * 1024 * 1024) {
      throw new Error(`File size limit of ${this.config.maxFileSizeMB || 10}MB exceeded`);
    }

    fs.writeFileSync(this.storePath, jsonString, 'utf8');
  }

  async set(id: string, entry: VectorStoreEntry): Promise<void> {
    await this.acquireLock();
    try {
      const data = await this.readData();
      data[id] = {
        ...entry,
        updatedAt: getCurrentTimestamp()
      };
      await this.writeData(data);
    } finally {
      this.releaseLock();
    }
  }

  async get(id: string): Promise<VectorStoreEntry | null> {
    await this.acquireLock();
    try {
      const data = await this.readData();
      return data[id] || null;
    } finally {
      this.releaseLock();
    }
  }

  async delete(id: string): Promise<void> {
    await this.acquireLock();
    try {
      const data = await this.readData();
      delete data[id];
      await this.writeData(data);
    } finally {
      this.releaseLock();
    }
  }

  async upsert(entry: VectorStoreEntry): Promise<void> {
    const id = entry.id || generateEntryId();
    await this.set(id, entry);
  }

  async entries(params?: PaginationParams): Promise<PaginatedResult<VectorStoreEntry>> {
    await this.acquireLock();
    try {
      const data = await this.readData();
      const allEntries = Object.values(data);
      const total = allEntries.length;

      if (!params) {
        return {
          items: allEntries,
          total,
          hasMore: false
        };
      }

      const { limit, offset } = params;
      const items = allEntries.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        items,
        total,
        hasMore
      };
    } finally {
      this.releaseLock();
    }
  }

  async search(query: string, topK: number = 5): Promise<VectorStoreEntry[]> {
    const queryEmbedding = await this.generateEmbeddings(query);
    const { items } = await this.entries();
    
    return items
      .map((entry: VectorStoreEntry) => ({
        ...entry,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding)
      }))
      .sort((a: VectorStoreEntry & { similarity: number }, b: VectorStoreEntry & { similarity: number }) => 
        (b.similarity || 0) - (a.similarity || 0)
      )
      .slice(0, topK);
  }

  getConfig(): VectorStoreConfig {
    return this.config;
  }

  async clear(): Promise<void> {
    await this.acquireLock();
    try {
      await this.writeData({});
    } finally {
      this.releaseLock();
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a ** 2, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b ** 2, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export function createDiskVectorStore(config: VectorStoreConfig): VectorStore {
  return new DiskVectorStore(config);
} 