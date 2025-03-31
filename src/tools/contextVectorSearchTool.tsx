import { z } from "zod";
import dedent from "dedent";
import { ToolDescriptor } from "./registry";
import { VectorStore, GenerateEmbeddings, EmbeddingResult } from "@/data/client/vector";
import { tool } from "ai";

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a ** 2, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b ** 2, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

export function createContextVectorSearchTool(
  vectorStore: VectorStore,
  generateEmbeddings: GenerateEmbeddings
): ToolDescriptor {
  return {
    displayName: "Search documents in vector store",
    tool: tool({
      description: "Search for documents in the vector store using semantic similarity.",
      parameters: z.object({
        query: z.string().describe("Search query"),
        topK: z.number().int().positive().default(5).describe("Number of top results to return"),
      }),
      execute: async ({ query, topK }) => {
        const queryEmbedding = await generateEmbeddings(query);
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
      },
    }),
  };
}
