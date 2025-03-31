// File: src/app/api/short-memory/[filename]/records/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { StorageService } from "@/lib/storage-service";
import { cosineSimilarity, openAIEmbeddings } from "@/data/client/vector";


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
    // Authorization checks, etc.
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    const storageSchema = await authorizeStorageSchema(request);

    const generateEmbeddings = openAIEmbeddings();

    // Parse incoming query parameters
    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit") ?? "10";
    const offsetParam = url.searchParams.get("offset") ?? "0";
    const embeddingQuery = url.searchParams.get("embeddingSearch") ?? "";
    const topKParam = url.searchParams.get("topK") ?? "5";

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);
    const topK = parseInt(topKParam, 10);

    // Load the file from disk
    const storageService = new StorageService(requestContext.databaseIdHash, storageSchema);
    const rawContent = storageService.readShortMemoryJsonFile(params.filename);

    // The file should be an object keyed by record ID -> { content, embedding, metadata }
    // If that fails, we handle the error.
    let data: Record<string, any>;
    try {
      data = JSON.parse(rawContent);
    } catch (err) {
      return NextResponse.json(
        { message: "File is not valid JSON", status: 400 },
        { status: 400 }
      );
    }

    const allKeys = Object.keys(data);
    // If no vector search, just do a normal slice
    if (!embeddingQuery) {
      const total = allKeys.length;
      const sliced = allKeys.slice(offset, offset + limit).map((id) => {
        const rec = data[id];
        return {
          id,
          metadata: rec.metadata ?? {},
          content: rec.content ?? "",
          // Return a truncated embedding if present
          embeddingPreview: Array.isArray(rec.embedding)
            ? rec.embedding.slice(0, 8)
            : [],
        };
      });
      return NextResponse.json({
        total,
        rows: sliced,
      });
    }

    // Otherwise, do vector search
    const queryEmbedding = await generateEmbeddings(embeddingQuery);
    // Convert our map to an array
    const allRecords = allKeys.map((id) => {
      const rec = data[id];
      return {
        id,
        ...rec,
      };
    });

    // Compute similarity
    const results = allRecords
      .map((rec) => {
        if (!Array.isArray(rec.embedding)) {
          // If it has no embedding, similarity is 0
          return { ...rec, similarity: 0 };
        }
        const sim = cosineSimilarity(queryEmbedding, rec.embedding);
        return { ...rec, similarity: sim };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((r) => ({
        id: r.id,
        metadata: r.metadata ?? {},
        content: r.content ?? "",
        similarity: r.similarity,
        embeddingPreview: Array.isArray(r.embedding)
          ? r.embedding.slice(0, 8)
          : [],
      }));

    return NextResponse.json({
      total: results.length,
      rows: results,
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
