import { VectorStoreEntry } from './types';

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a ** 2, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b ** 2, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Sort entries by similarity to a query embedding
 */
export const sortBySimilarity = (
  entries: VectorStoreEntry[],
  queryEmbedding: number[],
  topK?: number
): VectorStoreEntry[] => {
  const sorted = entries
    .map(entry => ({
      ...entry,
      similarity: cosineSimilarity(queryEmbedding, entry.embedding)
    }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  return topK ? sorted.slice(0, topK) : sorted;
};

/**
 * Generate a unique ID for a vector store entry
 */
export const generateEntryId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Get current timestamp in ISO format
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
}; 