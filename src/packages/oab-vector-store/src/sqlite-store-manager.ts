import path from 'path';
import fs from 'fs';
import { Database } from 'sqlite3';
import { VectorStoreManager, VectorStoreConfig, VectorStoreMetadata, PaginationParams, PaginatedResult, VectorStore } from './types';
import { createSQLiteVectorStore } from './sqlite-store';
import { getCurrentTimestamp } from './utils';

interface StoreIndexRow {
  storeName: string;
  partitionKey: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;
}

export class SQLiteVectorStoreManager implements VectorStoreManager {
  private baseDir: string;
  private db: Database;
  private dbPath: string;

  constructor(config: { baseDir: string }) {
    this.baseDir = config.baseDir;
    this.dbPath = path.join(this.baseDir, 'stores_index.sqlite');
    
    // Ensure the base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    // Initialize SQLite database
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      // Create stores index table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS stores_index (
          storeName TEXT PRIMARY KEY,
          partitionKey TEXT NOT NULL,
          itemCount INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          lastAccessed TEXT
        )
      `);
    });
  }

  async createStore(config: VectorStoreConfig): Promise<VectorStore> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Check if store exists
        this.db.get(
          'SELECT storeName FROM stores_index WHERE storeName = ?',
          [config.storeName],
          (err: Error | null, row: { storeName: string } | undefined) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            if (row) {
              this.db.run('ROLLBACK');
              reject(new Error(`Store ${config.storeName} already exists`));
              return;
            }

            // Create the store
            const store = createSQLiteVectorStore({
              ...config,
              baseDir: this.baseDir
            });

            // Insert into index
            const now = getCurrentTimestamp();
            this.db.run(
              `INSERT INTO stores_index (
                storeName, partitionKey, itemCount, createdAt, updatedAt, lastAccessed
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [config.storeName, config.partitionKey, 0, now, now, now],
              (err: Error | null) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Commit transaction
                this.db.run('COMMIT', (err: Error | null) => {
                  if (err) reject(err);
                  else resolve(store);
                });
              }
            );
          }
        );
      });
    });
  }

  async getStore(partitionKey: string, storeName: string): Promise<VectorStore | null> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Check if store exists
        this.db.get(
          'SELECT * FROM stores_index WHERE storeName = ?',
          [storeName],
          (err: Error | null, row: StoreIndexRow | undefined) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            if (!row) {
              this.db.run('ROLLBACK');
              resolve(null);
              return;
            }

            // Update last accessed timestamp
            const now = getCurrentTimestamp();
            this.db.run(
              'UPDATE stores_index SET lastAccessed = ? WHERE storeName = ?',
              [now, storeName],
              (err: Error | null) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Commit transaction
                this.db.run('COMMIT', (err: Error | null) => {
                  if (err) reject(err);
                  else {
                    resolve(createSQLiteVectorStore({
                      storeName,
                      partitionKey,
                      baseDir: this.baseDir,
                      generateEmbeddings: async () => [], // This will be set when actually using the store
                    }));
                  }
                });
              }
            );
          }
        );
      });
    });
  }

  async deleteStore(partitionKey: string, storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Delete from index
        this.db.run(
          'DELETE FROM stores_index WHERE storeName = ?',
          [storeName],
          (err: Error | null) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            // Delete the store file
            const filePath = path.join(this.baseDir, `${storeName}.sqlite`);
            if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (err: NodeJS.ErrnoException | null) => {
                if (err && err.code !== 'ENOENT') {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Commit transaction
                this.db.run('COMMIT', (err: Error | null) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            } else {
              // Commit transaction
              this.db.run('COMMIT', (err: Error | null) => {
                if (err) reject(err);
                else resolve();
              });
            }
          }
        );
      });
    });
  }

  async listStores(partitionKey: string, params?: PaginationParams): Promise<PaginatedResult<VectorStoreMetadata>> {
    return new Promise((resolve, reject) => {
      const offset = params?.offset || 0;
      const limit = params?.limit || 10;

      this.db.serialize(() => {
        // Get total count
        this.db.get(
          'SELECT COUNT(*) as count FROM stores_index WHERE partitionKey = ?',
          [partitionKey],
          (err: Error | null, row: { count: number } | undefined) => {
            if (err) reject(err);
            else if (!row) reject(new Error('Failed to get count'));
            else {
              // Get paginated stores
              this.db.all(
                `SELECT * FROM stores_index 
                 WHERE partitionKey = ? 
                 ORDER BY lastAccessed DESC 
                 LIMIT ? OFFSET ?`,
                [partitionKey, limit, offset],
                (err: Error | null, rows: StoreIndexRow[]) => {
                  if (err) reject(err);
                  else {
                    resolve({
                      items: rows.map(row => ({
                        name: row.storeName,
                        partitionKey: row.partitionKey,
                        itemCount: row.itemCount,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        lastAccessed: row.lastAccessed
                      })),
                      total: row.count,
                      hasMore: offset + limit < row.count
                    });
                  }
                }
              );
            }
          }
        );
      });
    });
  }

  async searchStores(partitionKey: string, query: string, topK: number = 5): Promise<VectorStoreMetadata[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM stores_index 
         WHERE partitionKey = ? 
         AND storeName LIKE ? 
         ORDER BY lastAccessed DESC 
         LIMIT ?`,
        [partitionKey, `%${query.toLowerCase()}%`, topK],
        (err: Error | null, rows: StoreIndexRow[]) => {
          if (err) reject(err);
          else {
            resolve(rows.map(row => ({
              name: row.storeName,
              partitionKey: row.partitionKey,
              itemCount: row.itemCount,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              lastAccessed: row.lastAccessed
            })));
          }
        }
      );
    });
  }

  async updateStoreMetadata(partitionKey: string, storeName: string, metadata: Partial<VectorStoreMetadata>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Begin transaction
        this.db.run('BEGIN TRANSACTION');

        // Check if store exists
        this.db.get(
          'SELECT storeName FROM stores_index WHERE storeName = ?',
          [storeName],
          (err: Error | null, row: { storeName: string } | undefined) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            if (!row) {
              this.db.run('ROLLBACK');
              reject(new Error(`Store ${storeName} not found`));
              return;
            }

            // Update metadata
            const updates: string[] = [];
            const values: any[] = [];

            if (metadata.itemCount !== undefined) {
              updates.push('itemCount = ?');
              values.push(metadata.itemCount);
            }

            if (metadata.lastAccessed !== undefined) {
              updates.push('lastAccessed = ?');
              values.push(metadata.lastAccessed);
            }

            updates.push('updatedAt = ?');
            values.push(getCurrentTimestamp());

            values.push(storeName);

            this.db.run(
              `UPDATE stores_index 
               SET ${updates.join(', ')} 
               WHERE storeName = ?`,
              values,
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
      });
    });
  }
}

export function createSQLiteVectorStoreManager(config: { baseDir: string }): VectorStoreManager {
  return new SQLiteVectorStoreManager(config);
} 