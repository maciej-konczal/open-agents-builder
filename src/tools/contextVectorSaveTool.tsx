import { z } from "zod";
import { ToolDescriptor } from "./registry";
import { VectorStore, GenerateEmbeddings, EmbeddingResult, createDiskBackedVectorStore } from "@/data/client/vector";
import { tool } from "ai";
import { Agent } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";

export function createContextVectorSaveTool(
  databaseIdHash: string,
  sessionId: string,
  storageKey: string | null | undefined,
  agent: Agent,
  generateEmbeddings: GenerateEmbeddings,
  vectorStore: VectorStore | null = null
): ToolDescriptor {
  return {
    displayName: "Save document to current context vector store",
    tool: tool({
      description: "Save a document and its metadata to the current context vector store.",
      parameters: z.object({
        id: z.string().describe("Unique identifier for the document"),
        content: z.string().describe("Content of the document"),
        metadata: z.string().describe("Additional metadata for the document"),
        shardName: z.string().optional().describe("Data Shard to search in - can be default for default shard"),
        sessionOnly: z.boolean().optional().default(false).describe("Whether to search only in the current session")        
      }),
      execute: async ({ id, content, metadata, shardName, sessionOnly }) => {
        try {
          console.log(id, content, metadata, shardName, sessionOnly);
          const embedding = await generateEmbeddings(content);

          if (vectorStore === null) {
            vectorStore = createDiskBackedVectorStore(databaseIdHash, 'vector-store', agent?.id ?? '', (shardName ?? 'default')  + (sessionOnly ? '-' + sessionId : '')); 
          }
          await vectorStore.set(id, { content, metadata, embedding });    
          return `Document saved with id: ${id}`;
        } catch (err) {
          return `Error saving document: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
