import { z } from "zod";
import { ToolDescriptor } from "./registry";
import { createDiskVectorStore, createOpenAIEmbeddings, VectorStore, VectorStoreEntry } from "@oab/vector-store";
import { tool } from "ai";
import { Agent } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";
import path from "path";

export function createShortMemorySearchTool(
  databaseIdHash: string,
  sessionId: string,
  storageKey: string | null | undefined,
  agent: Agent,
  vectorStore: VectorStore | null = null
): ToolDescriptor {
  return {
    displayName: "Search in short-term memory store",
    tool: tool({
      description: "Search for documents in the short-term memory store based on a query.",
      parameters: z.object({
        query: z.string().describe("Search query"),
        storeName: z.string().optional().describe("Name of the store to search in - if not provided will use 'default'"),
        sessionOnly: z.boolean().optional().default(false).describe("Whether to search only in the current session"),
        limit: z.number().optional().default(5).describe("Maximum number of results to return")
      }),
      execute: async ({ query, storeName, sessionOnly, limit }) => {
        try {
          // Create vector store if not provided
          if (!vectorStore) {
            const generateEmbeddings = createOpenAIEmbeddings({
              apiKey: process.env.OPENAI_API_KEY
            });

            vectorStore = createDiskVectorStore({
              storeName: storeName || 'default',
              partitionKey: databaseIdHash,
              maxFileSizeMB: 10,
              baseDir: path.resolve(process.cwd(), 'data', databaseIdHash, 'short-memory-store'),
              generateEmbeddings
            });
          }

          const results = await vectorStore.search(query, limit);
          return JSON.stringify(results);
        } catch (err) {
          return `Error searching documents: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
