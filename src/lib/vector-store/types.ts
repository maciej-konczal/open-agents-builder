import { z } from 'zod';

/**
 * Core types for vector store entries
 */
export const vectorStoreEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  embedding: z.array(z.number()),
  metadata: z.record(z.unknown()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type VectorStoreEntry = z.infer<typeof vectorStoreEntrySchema>;

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  storeName: string;
  maxFileSizeMB?: number;
  partitionKey?: string; // e.g. agentId, userId etc.
}

/**
 * Core vector store interface that all implementations must follow
 */
export interface VectorStore {
  // Core CRUD operations
  set: (id: string, entry: Omit<VectorStoreEntry, 'id'>) => Promise<void>;
  get: (id: string) => Promise<VectorStoreEntry | null>;
  delete: (id: string) => Promise<void>;
  upsert: (id: string, entry: Omit<VectorStoreEntry, 'id'>) => Promise<void>;
  
  // Query operations
  entries: () => Promise<VectorStoreEntry[]>;
  search: (query: string, topK?: number) => Promise<VectorStoreEntry[]>;
  
  // Store management
  getConfig: () => VectorStoreConfig;
  clear: () => Promise<void>;
}

/**
 * Factory function type for creating vector stores
 */
export type VectorStoreFactory = (config: VectorStoreConfig) => VectorStore;

/**
 * Embedding generation function type
 */
export type GenerateEmbeddings = (content: string) => Promise<number[]>; 