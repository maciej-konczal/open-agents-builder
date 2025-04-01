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
export const vectorStoreConfigSchema = z.object({
  storeName: z.string(),
  partitionKey: z.string(),
  maxFileSizeMB: z.number().optional(),
  generateEmbeddings: z.function()
    .args(z.string())
    .returns(z.promise(z.array(z.number())))
});

export type VectorStoreConfig = z.infer<typeof vectorStoreConfigSchema>;

/**
 * Core vector store interface that all implementations must follow
 */
export interface VectorStore {
  // Core CRUD operations
  set: (id: string, entry: VectorStoreEntry) => Promise<void>;
  get: (id: string) => Promise<VectorStoreEntry | null>;
  delete: (id: string) => Promise<void>;
  upsert: (entry: VectorStoreEntry) => Promise<void>;
  
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