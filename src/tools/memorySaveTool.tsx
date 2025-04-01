import { z } from "zod";
import { ToolDescriptor } from "./registry";
import { createDiskVectorStore, createOpenAIEmbeddings, VectorStore, VectorStoreEntry } from "oab-vector-store";
import { tool } from "ai";
import { Agent } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";
import { nanoid } from "nanoid";
import path from "path";

export function createMemorySaveTool(
  databaseIdHash: string,
  sessionId: string,
  storageKey: string | null | undefined,
  agent: Agent,
  vectorStore: VectorStore | null = null
): ToolDescriptor {
  return {
    displayName: "Save document to memory store",
    tool: tool({
      description: "Save a document and its metadata to the memory store.",
      parameters: z.object({
        id: z.string().describe("Unique identifier for the document. When not provided will be generated").optional(),
        content: z.string().describe("Content of the document"),
        metadata: z.string().describe("Additional metadata for the document"),
        storeName: z.string().optional().describe("Name of the store to save in - if not provided will use 'default'"),
        sessionOnly: z.boolean().optional().default(false).describe("Whether to search only in the current session")        
      }),
      execute: async ({ id, content, metadata, storeName, sessionOnly }) => {
        try {
          if (!id) id = nanoid();
          // Create vector store if not provided
          if (!vectorStore) {
            const generateEmbeddings = createOpenAIEmbeddings({
              apiKey: process.env.OPENAI_API_KEY
            });

            vectorStore = createDiskVectorStore({
              storeName: storeName || 'default',
              partitionKey: databaseIdHash,
              maxFileSizeMB: 10,
              baseDir: path.resolve(process.cwd(), 'data', databaseIdHash, 'memory-store'),
              generateEmbeddings
            });
          }

          // Create the entry
          const entry: VectorStoreEntry = {
            id,
            content,
            metadata: JSON.parse(metadata),
            embedding: await vectorStore.getConfig().generateEmbeddings(content)
          };

          await vectorStore.set(id, entry);    
          return `Document saved with id: ${id}`;
        } catch (err) {
          console.error(err);
          return `Error saving document: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
