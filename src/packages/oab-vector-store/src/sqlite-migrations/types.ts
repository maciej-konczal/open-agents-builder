import type { Database } from 'better-sqlite3';

export interface Migration {
  version: number;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

export interface MigrationMetadata {
  version: number;
  appliedAt: string;
  name: string;
} 