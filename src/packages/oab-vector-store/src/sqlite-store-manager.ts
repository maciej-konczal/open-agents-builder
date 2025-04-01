import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { VectorStoreManager, VectorStoreConfig, VectorStoreMetadata, PaginationParams, PaginatedResult, VectorStore } from './types';
import { createSQLiteVectorStore } from './sqlite-store';
import { getCurrentTimestamp } from './utils';

interface StoreIndexRow {
  storeName: string;
  partitionKey: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
}

export class SQLiteVectorStoreManager implements VectorStoreManager {
  private baseDir: string;

  constructor(config: { baseDir: string }) {
    this.baseDir = config.baseDir;
  }

  async getStore(partitionKey: string, storeName: string) {
    const storePath = path.join(this.baseDir, partitionKey, storeName);
    return createSQLiteVectorStore({
      storeName,
      partitionKey,
      baseDir: storePath,
      generateEmbeddings: async (text: string, ...args: unknown[]) => [], // This will be set when actually using the store
    });
  }

  async createStore(config: { storeName: string; partitionKey: string; baseDir: string; generateEmbeddings: (text: string, ...args: unknown[]) => Promise<number[]>; maxFileSizeMB?: number }) {
    const storePath = path.join(this.baseDir, config.partitionKey, config.storeName);
    return createSQLiteVectorStore({
      storeName: config.storeName,
      partitionKey: config.partitionKey,
      baseDir: storePath,
      generateEmbeddings: config.generateEmbeddings,
    });
  }

  async deleteStore(partitionKey: string, storeName: string) {
    const storePath = path.join(this.baseDir, partitionKey, storeName);
    const dbPath = `${storePath}.sqlite`;
    
    // Close any open connections
    const db = new Database(dbPath);
    db.close();
    
    // Delete the database file
    try {
      require('fs').unlinkSync(dbPath);
    } catch (err) {
      // Ignore errors if file doesn't exist
    }
  }

  async listStores(partitionKey: string, params?: PaginationParams): Promise<PaginatedResult<VectorStoreMetadata>> {
    return new Promise((resolve, reject) => {
      const offset = params?.offset || 0;
      const limit = params?.limit || 10;

      const db = new Database(path.join(this.baseDir, 'stores_index.sqlite'));
      const rows = db.prepare(`
        SELECT * FROM stores_index 
        WHERE partitionKey = ? 
        ORDER BY lastAccessed DESC 
        LIMIT ? OFFSET ?
      `).all([partitionKey, limit, offset]) as StoreIndexRow[];

      resolve({
        items: rows.map(row => ({
          name: row.storeName,
          partitionKey: row.partitionKey,
          itemCount: row.itemCount,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          lastAccessed: row.lastAccessed
        })),
        total: rows.length,
        hasMore: offset + limit < rows.length
      });
    });
  }

  async searchStores(partitionKey: string, query: string, topK: number = 5): Promise<VectorStoreMetadata[]> {
    const db = new Database(path.join(this.baseDir, 'stores_index.sqlite'));
    const rows = db.prepare(`
      SELECT * FROM stores_index 
      WHERE partitionKey = ? 
      AND storeName LIKE ? 
      ORDER BY lastAccessed DESC 
      LIMIT ?
    `).all([partitionKey, `%${query.toLowerCase()}%`, topK]) as StoreIndexRow[];

    return rows.map(row => ({
      name: row.storeName,
      partitionKey: row.partitionKey,
      itemCount: row.itemCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessed: row.lastAccessed
    }));
  }

  async updateStoreMetadata(partitionKey: string, storeName: string, metadata: Partial<VectorStoreMetadata>): Promise<void> {
    const db = new Database(path.join(this.baseDir, 'stores_index.sqlite'));
    const updates: string[] = [];
    const values: any[] = [];

    if (metadata.itemCount !== undefined) {
      updates.push('itemCount = ?');
      values.push(metadata.itemCount);
    }
    if (metadata.updatedAt !== undefined) {
      updates.push('updatedAt = ?');
      values.push(metadata.updatedAt);
    }
    if (metadata.lastAccessed !== undefined) {
      updates.push('lastAccessed = ?');
      values.push(metadata.lastAccessed);
    }

    if (updates.length === 0) return;

    values.push(storeName);

    db.prepare(`
      UPDATE stores_index 
      SET ${updates.join(', ')} 
      WHERE storeName = ?
    `).run(values);
  }
}

export function createSQLiteVectorStoreManager(config: { baseDir: string }): VectorStoreManager {
  return new SQLiteVectorStoreManager(config);
} 