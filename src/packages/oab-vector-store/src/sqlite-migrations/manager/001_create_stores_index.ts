import type { Database } from 'better-sqlite3';
import { Migration } from '../types';

export const migration: Migration = {
  version: 1,
  name: 'create_stores_index',
  up: (db: Database) => {
    // Create stores index table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS stores_index (
        partition_key TEXT NOT NULL,
        store_name TEXT NOT NULL,
        base_dir TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_accessed TEXT,
        PRIMARY KEY (partition_key, store_name)
      )
    `).run();

    // Create index for faster lookups
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_stores_partition 
      ON stores_index(partition_key)
    `).run();
  },
  down: (db: Database) => {
    db.prepare('DROP TABLE IF EXISTS stores_index').run();
  }
}; 