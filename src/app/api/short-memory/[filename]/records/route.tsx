// File: src/app/api/short-memory/[filename]/records/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { createDiskVectorStore } from "@oab/vector-store";
import { createOpenAIEmbeddings } from "@oab/vector-store";
import path from 'path';

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
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const embeddingSearch = searchParams.get('embeddingSearch');
    const topK = parseInt(searchParams.get('topK') || '5');

    const generateEmbeddings = createOpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });

    const vectorStore = createDiskVectorStore({
      partitionKey: 'short-memory',
      storeName: params.filename,
      maxFileSizeMB: 10,
      baseDir: path.resolve(process.cwd(), 'data'),
      generateEmbeddings
    });

    if (embeddingSearch) {
      const results = await vectorStore.search(embeddingSearch, topK);
      return NextResponse.json({ results });
    }

    const { items, total, hasMore } = await vectorStore.entries({ limit, offset });
    return NextResponse.json({
      items: items.map(entry => ({
        id: entry.id,
        metadata: entry.metadata,
        content: entry.content,
        embeddingPreview: entry.embedding.slice(0, 8)
      })),
      total,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}
