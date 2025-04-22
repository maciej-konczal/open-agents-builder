import type { Database } from 'better-sqlite3';
import { Migration } from '../types';

export const migration: Migration = {
  version: 2,
  name: 'add_item_count',
  up: (db: Database) => {
    // Add itemCount column to stores_index table
    db.prepare(`
      ALTER TABLE stores_index
      ADD COLUMN itemCount INTEGER NOT NULL DEFAULT 0
    `).run();
  },
  down: (db: Database) => {
    // SQLite doesn't support dropping columns directly
    // We need to recreate the table without the itemCount column
    db.prepare(`
      CREATE TABLE stores_index_temp (
        partitionKey TEXT NOT NULL,
        storeName TEXT NOT NULL,
        baseDir TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastAccessed TEXT,
        PRIMARY KEY (partitionKey, storeName)
      )
    `).run();

    db.prepare(`
      INSERT INTO stores_index_temp (partitionKey, storeName, baseDir, createdAt, updatedAt, lastAccessed)
      SELECT partitionKey, storeName, baseDir, createdAt, updatedAt, lastAccessed
      FROM stores_index
    `).run();

    db.prepare('DROP TABLE stores_index').run();
    db.prepare('ALTER TABLE stores_index_temp RENAME TO stores_index').run();

    // Recreate the index
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_stores_partition 
      ON stores_index(partitionKey)
    `).run();
  }
}; 