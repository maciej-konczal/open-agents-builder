import fs from 'fs';
import path from 'path';
import { VectorStore, VectorStoreConfig, VectorStoreEntry } from './types';
import { getCurrentTimestamp, sortBySimilarity } from './utils';
import { GenerateEmbeddings } from './types';

interface DiskStoreData {
  config: VectorStoreConfig;
  entries: Record<string, VectorStoreEntry>;
}

export class DiskVectorStore implements VectorStore {
  private config: VectorStoreConfig;
  private generateEmbeddings: GenerateEmbeddings;
  private filePath: string;
  private lockFilePath: string;

  constructor(config: VectorStoreConfig, generateEmbeddings: GenerateEmbeddings) {
    this.config = config;
    this.generateEmbeddings = generateEmbeddings;
    
    // Create base directory if it doesn't exist
    const baseDir = path.join(process.cwd(), 'data', config.partitionKey || 'default', 'vector-store');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.filePath = path.join(baseDir, `${config.storeName}.json`);
    this.lockFilePath = `${this.filePath}.lock`;
  }

  private async acquireLock(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (fs.existsSync(this.lockFilePath)) {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error(`Could not acquire lock for "${this.filePath}" after ${maxAttempts} attempts`);
      }
      await delay(100);
    }

    fs.writeFileSync(this.lockFilePath, '');
  }

  private releaseLock(): void {
    if (fs.existsSync(this.lockFilePath)) {
      fs.unlinkSync(this.lockFilePath);
    }
  }

  private async readData(): Promise<DiskStoreData> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {
          config: this.config,
          entries: {}
        };
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as DiskStoreData;
    } catch (error) {
      // If file is invalid, return empty store
      return {
        config: this.config,
        entries: {}
      };
    }
  }

  private async writeData(data: DiskStoreData): Promise<void> {
    await this.acquireLock();
    try {
      const jsonString = JSON.stringify(data);
      const size = Buffer.byteLength(jsonString, 'utf8');
      const maxSize = (this.config.maxFileSizeMB || 10) * 1024 * 1024;

      if (size > maxSize) {
        throw new Error(`File size limit of ${this.config.maxFileSizeMB}MB exceeded for ${this.filePath}`);
      }

      fs.writeFileSync(this.filePath, jsonString, 'utf8');
    } finally {
      this.releaseLock();
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