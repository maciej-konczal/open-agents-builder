import path from 'path';
import { Database } from 'sqlite3';
import { VectorStore, VectorStoreConfig, VectorStoreEntry, GenerateEmbeddings, PaginationParams, PaginatedResult, VectorStoreMetadata } from './types';
import { generateEntryId, getCurrentTimestamp } from './utils';

interface DatabaseRow {
  id: string;
  content: string;
  embedding: Buffer;
  metadata: Buffer;
  created_at: string;
  updated_at: string;
}

interface MetadataRow {
  key: string;
  value: string;
}

interface CountRow {
  count: number;
}

export class SQLiteVectorStore implements VectorStore {
  private db: Database;
  private storeName: string;
  private generateEmbeddings: GenerateEmbeddings;
  private partitionKey: string;
  private dbPath: string;

  constructor(config: VectorStoreConfig) {
    this.storeName = config.storeName;
    this.partitionKey = config.partitionKey;
    this.generateEmbeddings = config.generateEmbeddings;
    
    // Remove .sqlite extension if present in storeName
    const baseStoreName = this.storeName.replace(/\.sqlite$/, '');
    
    // Store files directly in the data directory
    this.dbPath = path.join(config.baseDir, `${baseStoreName}.sqlite`);
    
    // Initialize SQLite database
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create tables if they don't exist
    this.db.serialize(() => {
      // Load the sqlite-vec extension
      this.db.run('SELECT load_extension("sqlite-vec")');

      // Create virtual table for vector search
      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vector_index USING vec0(
          embedding float[1536]
        )
      `);

      // Create entries table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create metadata table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Initialize metadata if not exists
      this.db.get('SELECT * FROM metadata WHERE key = ?', ['itemCount'], (err: Error | null, row: MetadataRow | undefined) => {
        if (!row) {
          this.db.run(
            'INSERT INTO metadata (key, value) VALUES (?, ?)',
            ['itemCount', '0']
          );
        }
      });
    });
  }

  async set(id: string, entry: VectorStoreEntry): Promise<void> {
    const now = getCurrentTimestamp();
    const metadataBlob = Buffer.from(JSON.stringify(entry.metadata));

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Insert into entries table
        this.db.run(
          `INSERT OR REPLACE INTO entries (id, content, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [id, entry.content, metadataBlob, now, now],
          (err: Error | null) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            // Insert into vector index
            const embeddingJson = JSON.stringify(entry.embedding);
            this.db.run(
              `INSERT OR REPLACE INTO vector_index (rowid, embedding)
               VALUES (?, ?)`,
              [id, embeddingJson],
              (err: Error | null) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Update item count
                this.db.run(
                  'UPDATE metadata SET value = (SELECT COUNT(*) FROM entries) WHERE key = ?',
                  ['itemCount'],
                  (err: Error | null) => {
                    if (err) {
                      this.db.run('ROLLBACK');
                      reject(err);
                      return;
                    }

                    // Commit transaction
                    this.db.run('COMMIT', (err: Error | null) => {
                      if (err) reject(err);
                      else resolve();
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  async get(id: string): Promise<VectorStoreEntry | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM entries WHERE id = ?',
        [id],
        (err: Error | null, row: DatabaseRow | undefined) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            // Get embedding from vector index
            this.db.get(
              'SELECT embedding FROM vector_index WHERE rowid = ?',
              [id],
              (err: Error | null, vecRow: { embedding: Buffer } | undefined) => {
                if (err) reject(err);
                else if (!vecRow) reject(new Error('Embedding not found'));
                else {
                  resolve({
                    id: row.id,
                    content: row.content,
                    embedding: JSON.parse(vecRow.embedding.toString()),
                    metadata: JSON.parse(row.metadata.toString()),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                  });
                }
              }
            );
          }
        }
      );
    });
  }

  async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Delete from entries table
        this.db.run('DELETE FROM entries WHERE id = ?', [id], (err: Error | null) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }

          // Delete from vector index
          this.db.run('DELETE FROM vector_index WHERE rowid = ?', [id], (err: Error | null) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            // Update item count
            this.db.run(
              'UPDATE metadata SET value = (SELECT COUNT(*) FROM entries) WHERE key = ?',
              ['itemCount'],
              (err: Error | null) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Commit transaction
                this.db.run('COMMIT', (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }
            );
          });
        });
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Delete from entries table
        this.db.run('DELETE FROM entries', (err: Error | null) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }

          // Delete from vector index
          this.db.run('DELETE FROM vector_index', (err: Error | null) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            // Update item count
            this.db.run(
              'UPDATE metadata SET value = ? WHERE key = ?',
              ['0', 'itemCount'],
              (err: Error | null) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Commit transaction
                this.db.run('COMMIT', (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              }
            );
          });
        });
      });
    });
  }

  async entries(params?: PaginationParams): Promise<PaginatedResult<VectorStoreEntry>> {
    return new Promise((resolve, reject) => {
      const query = params
        ? 'SELECT * FROM entries LIMIT ? OFFSET ?'
        : 'SELECT * FROM entries';
      
      const queryParams = params ? [params.limit, params.offset] : [];

      this.db.all(query, queryParams, (err: Error | null, rows: DatabaseRow[]) => {
        if (err) reject(err);
        else {
          const items = rows.map(row => ({
            id: row.id,
            content: row.content,
            metadata: JSON.parse(row.metadata.toString()),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          // Get embeddings for all entries
          Promise.all(items.map(item => 
            new Promise<VectorStoreEntry>((resolve, reject) => {
              this.db.get(
                'SELECT embedding FROM vector_index WHERE rowid = ?',
                [item.id],
                (err: Error | null, vecRow: { embedding: Buffer } | undefined) => {
                  if (err) reject(err);
                  else if (!vecRow) reject(new Error(`Embedding not found for id ${item.id}`));
                  else {
                    resolve({
                      ...item,
                      embedding: JSON.parse(vecRow.embedding.toString())
                    });
                  }
                }
              );
            })
          )).then(itemsWithEmbeddings => {
            this.db.get('SELECT COUNT(*) as count FROM entries', (err: Error | null, row: CountRow | undefined) => {
              if (err) reject(err);
              else if (!row) reject(new Error('Failed to get count'));
              else {
                resolve({
                  items: itemsWithEmbeddings,
                  total: row.count,
                  hasMore: params ? params.offset + params.limit < row.count : false
                });
              }
            });
          }).catch(reject);
        }
      });
    });
  }

  async search(query: string, topK: number = 5): Promise<VectorStoreEntry[]> {
    const queryEmbedding = await this.generateEmbeddings(query);
    const queryEmbeddingJson = JSON.stringify(queryEmbedding);

    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          e.*,
          v.distance
        FROM entries e
        JOIN vector_index v ON e.id = v.rowid
        WHERE v.embedding MATCH ?
        ORDER BY v.distance
        LIMIT ?`,
        [queryEmbeddingJson, topK],
        (err: Error | null, rows: (DatabaseRow & { distance: number })[]) => {
          if (err) reject(err);
          else {
            resolve(rows.map(row => ({
              id: row.id,
              content: row.content,
              embedding: JSON.parse(row.embedding.toString()),
              metadata: JSON.parse(row.metadata.toString()),
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              similarity: 1 - row.distance // Convert distance to similarity
            })));
          }
        }
      );
    });
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
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM metadata WHERE key = ?', ['itemCount'], (err: Error | null, row: MetadataRow | undefined) => {
        if (err) reject(err);
        else if (!row) reject(new Error('Failed to get metadata'));
        else {
          resolve({
            name: this.storeName,
            partitionKey: this.partitionKey,
            itemCount: parseInt(row.value),
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            lastAccessed: getCurrentTimestamp()
          });
        }
      });
    });
  }
}

export function createSQLiteVectorStore(config: VectorStoreConfig): VectorStore {
  return new SQLiteVectorStore(config);
} 