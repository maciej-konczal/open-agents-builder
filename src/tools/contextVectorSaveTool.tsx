import { z } from "zod";
import { ToolDescriptor } from "./registry";
import { VectorStore, GenerateEmbeddings, EmbeddingResult } from "@/data/client/vector";
import { tool } from "ai";

export function createContextVectorSaveTool(
  vectorStore: VectorStore,
  generateEmbeddings: GenerateEmbeddings
): ToolDescriptor {
  return {
    displayName: "Save document to current context vector store",
    tool: tool({
      description: "Save a document and its metadata to the current context vector store.",
      parameters: z.object({
        id: z.string().describe("Unique identifier for the document"),
        content: z.string().describe("Content of the document"),
        metadata: z.string().describe("Additional metadata for the document"),
      }),
      execute: async ({ id, content, metadata }) => {
        const embedding = await generateEmbeddings(content);
        await vectorStore.set(id, { content, metadata, embedding });
        return `Document saved with id: ${id}`;
      },
    }),
  };
}
