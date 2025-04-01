// File: src/app/api/short-memory/[filename]/records/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStore, createOpenAIEmbeddings, VectorStoreEntry } from "@oab/vector-store";


/**
 * GET /api/short-memory/[filename]/records
 * Query or vector-search records in a single short-memory JSON file.
 * Query params:
 *   - limit=10
 *   - offset=0
 *   - embeddingSearch=some text => triggers server-side vector search
 *   - topK=5 (optional, if embeddingSearch is used)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Authorization checks
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    // Parse incoming query parameters
    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit") ?? "10";
    const offsetParam = url.searchParams.get("offset") ?? "0";
    const embeddingQuery = url.searchParams.get("embeddingSearch") ?? "";
    const topKParam = url.searchParams.get("topK") ?? "5";

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);
    const topK = parseInt(topKParam, 10);

    // Create vector store instance
    const generateEmbeddings = createOpenAIEmbeddings();
    const vectorStore = createDiskVectorStore({
      storeName: params.filename,
      partitionKey: requestContext.databaseIdHash,
      maxFileSizeMB: 10
    }, generateEmbeddings);

    // If no vector search, just do a normal slice
    if (!embeddingQuery) {
      const allEntries = await vectorStore.entries();
      const total = allEntries.length;
      const sliced = allEntries.slice(offset, offset + limit).map((entry: VectorStoreEntry) => ({
        id: entry.id,
        metadata: entry.metadata,
        content: entry.content,
        embeddingPreview: entry.embedding.slice(0, 8)
      }));

      return NextResponse.json({
        total,
        rows: sliced,
      });
    }

    // Otherwise, do vector search
    const results = await vectorStore.search(embeddingQuery, topK);
    return NextResponse.json({
      total: results.length,
      rows: results.map((entry: VectorStoreEntry) => ({
        id: entry.id,
        metadata: entry.metadata,
        content: entry.content,
        similarity: entry.similarity,
        embeddingPreview: entry.embedding.slice(0, 8)
      })),
      vectorSearchQuery: embeddingQuery,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: getErrorMessage(error), status: 500 },
      { status: 500 }
    );
  }
}
