import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { VectorStore, VectorStoreConfig, VectorStoreEntry, GenerateEmbeddings, PaginationParams, PaginatedResult, VectorStoreMetadata } from './types';
import { generateEntryId, getCurrentTimestamp } from './utils';

interface DatabaseRow {
  id: string;
  content: string;
  embedding: Buffer;
  metadata: Buffer;
  createdAt: string;
  updatedAt: string;
}

interface MetadataRow {
  key: string;
  value: string;
}

interface CountRow {
  count: number;
}

export class SQLiteVectorStore implements VectorStore {
  private db: DatabaseType;
  private storeName: string;
  private generateEmbeddings: GenerateEmbeddings;
  private partitionKey: string;
  private dbPath: string;

  constructor(config: VectorStoreConfig) {
    this.storeName = config.storeName;
    this.partitionKey = config.partitionKey;
    this.generateEmbeddings = config.generateEmbeddings;
    
    // Store files directly in the base directory
    this.dbPath = path.join(config.baseDir, `${config.storeName}.sqlite`);
    
    // Ensure directory exists
    const dirPath = path.dirname(this.dbPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Check if we can access the directory
    try {
      fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      throw new Error(`Cannot access directory ${dirPath}: ${err}`);
    }

    // Log the full path we're trying to use
    console.log('Attempting to open database at:', this.dbPath);
    
    // Initialize SQLite database with verbose error handling
    try {
      this.db = new Database(this.dbPath);
    } catch (err) {
      throw new Error(`Failed to open database at ${this.dbPath}: ${err}`);
    }

    try {
      sqliteVec.load(this.db);
    } catch (err) {
      throw new Error(`Failed to load SQLite vector extension: ${err}`);
    }

    try {
      this.initializeDatabase();
    } catch (err) {
      throw new Error(`Failed to initialize database: ${err}`);
    }
  }

  private initializeDatabase(): void {
    try {
      // Create tables if they don't exist
      this.db.prepare(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vector_index USING vec0(
          embedding float[1536]
        )
      `).run();

      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          metadata TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `).run();

      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `).run();

      // Initialize metadata if not exists
      const row = this.db.prepare('SELECT * FROM metadata WHERE key = ?').get('itemCount') as MetadataRow | undefined;
      if (!row) {
        this.db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('itemCount', '0');
      }
    } catch (err) {
      throw new Error(`Failed to initialize database tables: ${err}`);
    }
  }

  async set(id: string, entry: VectorStoreEntry): Promise<void> {
    const now = getCurrentTimestamp();
    const metadataBlob = Buffer.from(JSON.stringify(entry.metadata));

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Insert into entries table
      this.db.prepare(
        `INSERT OR REPLACE INTO entries (id, content, metadata, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`
      ).run(id, entry.content, metadataBlob, now, now);

      // Insert into vector index
      const embeddingJson = JSON.stringify(entry.embedding);
      this.db.prepare(
        `INSERT OR REPLACE INTO vector_index (rowid, embedding)
         VALUES (?, ?)`
      ).run(id, embeddingJson);

      // Update item count
      this.db.prepare(
        'UPDATE metadata SET value = (SELECT COUNT(*) FROM entries) WHERE key = ?'
      ).run('itemCount');
    });

    transaction();
  }

  async get(id: string): Promise<VectorStoreEntry | null> {
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as DatabaseRow | undefined;
    if (!row) return null;

    const vecRow = this.db.prepare('SELECT embedding FROM vector_index WHERE rowid = ?').get(id) as { embedding: Buffer } | undefined;
    if (!vecRow) throw new Error('Embedding not found');

    return {
      id: row.id,
      content: row.content,
      embedding: JSON.parse(vecRow.embedding.toString()),
      metadata: JSON.parse(row.metadata.toString()),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async delete(id: string): Promise<void> {
    const transaction = this.db.transaction(() => {
      // Delete from entries table
      this.db.prepare('DELETE FROM entries WHERE id = ?').run(id);

      // Delete from vector index
      this.db.prepare('DELETE FROM vector_index WHERE rowid = ?').run(id);

      // Update item count
      this.db.prepare(
        'UPDATE metadata SET value = (SELECT COUNT(*) FROM entries) WHERE key = ?'
      ).run('itemCount');
    });

    transaction();
  }

  async clear(): Promise<void> {
    const transaction = this.db.transaction(() => {
      // Delete from entries table
      this.db.prepare('DELETE FROM entries').run();

      // Delete from vector index
      this.db.prepare('DELETE FROM vector_index').run();

      // Update item count
      this.db.prepare(
        'UPDATE metadata SET value = ? WHERE key = ?'
      ).run('0', 'itemCount');
    });

    transaction();
  }

  async entries(params?: PaginationParams): Promise<PaginatedResult<VectorStoreEntry>> {
    const query = params
      ? 'SELECT * FROM entries LIMIT ? OFFSET ?'
      : 'SELECT * FROM entries';
    
    const queryParams = params ? [params.limit, params.offset] : [];
    const rows = this.db.prepare(query).all(...queryParams) as DatabaseRow[];

    const items = await Promise.all(rows.map(async row => {
      const vecRow = this.db.prepare('SELECT embedding FROM vector_index WHERE rowid = ?').get(row.id) as { embedding: Buffer };
      return {
        id: row.id,
        content: row.content,
        embedding: JSON.parse(vecRow.embedding.toString()),
        metadata: JSON.parse(row.metadata.toString()),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    }));

    const count = this.db.prepare('SELECT COUNT(*) as count FROM entries').get() as CountRow;

    return {
      items,
      total: count.count,
      hasMore: params ? params.offset + params.limit < count.count : false
    };
  }

  async search(query: string, topK: number = 5): Promise<VectorStoreEntry[]> {
    const queryEmbedding = await this.generateEmbeddings(query);
    const queryEmbeddingJson = JSON.stringify(queryEmbedding);

    const rows = this.db.prepare(
      `SELECT 
        e.*,
        v.distance
      FROM entries e
      JOIN vector_index v ON e.id = v.rowid
      WHERE v.embedding MATCH ?
      ORDER BY v.distance
      LIMIT ?`
    ).all(queryEmbeddingJson, topK) as (DatabaseRow & { distance: number })[];

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      embedding: JSON.parse(row.embedding.toString()),
      metadata: JSON.parse(row.metadata.toString()),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      similarity: 1 - row.distance // Convert distance to similarity
    }));
  }

  async upsert(entry: VectorStoreEntry): Promise<void> {
    const id = entry.id || generateEntryId();
    await this.set(id, entry);
  }

  getConfig(): VectorStoreConfig {
    return {
      storeName: this.storeName,
      partitionKey: this.partitionKey,
      baseDir: path.dirname(this.dbPath),
      generateEmbeddings: this.generateEmbeddings
    };
  }

  async getMetadata(): Promise<VectorStoreMetadata> {
    const row = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('itemCount') as MetadataRow;
    if (!row) throw new Error('Failed to get metadata');

    return {
      name: this.storeName,
      partitionKey: this.partitionKey,
      itemCount: parseInt(row.value),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      lastAccessed: getCurrentTimestamp()
    };
  }
}

export function createSQLiteVectorStore(config: VectorStoreConfig): VectorStore {
  return new SQLiteVectorStore(config);
} 