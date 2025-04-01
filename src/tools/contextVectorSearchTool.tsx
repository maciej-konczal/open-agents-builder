import { z } from "zod";
import { ToolDescriptor } from "./registry";
import { createDiskVectorStore, createOpenAIEmbeddings, VectorStore } from "@oab/vector-store";
import { tool } from "ai";
import { Agent } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";
import path from "path";

export function createContextVectorSearchTool(
  databaseIdHash: string,
  sessionId: string,
  storageKey: string | null | undefined,
  agent: Agent,
  vectorStore: VectorStore | null = null
): ToolDescriptor {
  return {
    displayName: "Search documents in vector store",
    tool: tool({
      description: "Search for documents in the short term memory vector store using semantic similarity.",
      parameters: z.object({
        query: z.string().describe("Search query"),
        shardName: z.string().optional().describe("Data Shard to search in - can be default for default shard"),
        sessionOnly: z.boolean().optional().default(false).describe("Whether to search only in the current session"),
        topK: z.number().int().positive().default(5).describe("Number of top results to return"),
      }),
      execute: async ({ query, shardName, sessionOnly, topK }) => {
        try {
          console.log(query, shardName, sessionOnly, topK);

          // Create vector store if not provided
          if (!vectorStore) {
            const generateEmbeddings = createOpenAIEmbeddings({
              apiKey: process.env.OPENAI_API_KEY
            });

            vectorStore = createDiskVectorStore({
              storeName: storageKey || 'default',
              partitionKey: databaseIdHash,
              maxFileSizeMB: 10,
              baseDir: path.resolve(process.cwd(), 'data'),
              generateEmbeddings
            });
          }

          const results = await vectorStore.search(query, topK);
          return results;

        } catch (err) {
          console.error(err)
          return `Error searching document: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
