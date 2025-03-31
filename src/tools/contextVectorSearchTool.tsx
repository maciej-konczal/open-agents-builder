import { z } from "zod";
import dedent from "dedent";
import { ToolDescriptor } from "./registry";
import { VectorStore, GenerateEmbeddings, EmbeddingResult, createDiskBackedVectorStore } from "@/data/client/vector";
import { tool } from "ai";
import { Agent } from "@/data/client/models";
import { vector } from "drizzle-orm/pg-core";
import { getErrorMessage } from "@/lib/utils";

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a ** 2, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b ** 2, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

export function createContextVectorSearchTool(
  databaseIdHash: string,
  sessionId: string,
  storageKey: string | null | undefined,
  agent: Agent,
  generateEmbeddings: GenerateEmbeddings,
  vectorStore: VectorStore | null = null
): ToolDescriptor {
  return {
    displayName: "Search documents in vector store",
    tool: tool({
      description: "Search for documents in the vector store using semantic similarity.",
      parameters: z.object({
        query: z.string().describe("Search query"),
        shardName: z.string().optional().describe("Data Shard to search in - can be default for default shard"),
        sessionOnly: z.boolean().optional().default(false).describe("Whether to search only in the current session"),
        topK: z.number().int().positive().default(5).describe("Number of top results to return"),
      }),
      execute: async ({ query, shardName, sessionOnly, topK }) => {

        try {
          console.log(query, shardName, sessionOnly, topK);
          const queryEmbedding = await generateEmbeddings(query);

          if (vectorStore === null) {
            vectorStore = createDiskBackedVectorStore(databaseIdHash, 'vector-store', agent?.id ?? '', (shardName ?? 'default') + (sessionOnly ? '-' + sessionId : ''));
          }

          const entries = await vectorStore.entries();

          const results = entries
            .map(([id, entry]: [string, EmbeddingResult]) => {
              const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
              return { ...entry, id, similarity };
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);

          return results
            .map(entry => dedent`
            ID: ${entry.id}
            Content: ${entry.content}
            Metadata: ${JSON.stringify(entry.metadata)}
          `).join("\n");

        } catch (err) {
          console.error(err)
          return `Error searching document: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
