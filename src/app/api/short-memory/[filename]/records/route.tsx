// File: src/app/api/short-memory/[filename]/records/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { createDiskVectorStoreManager } from "@oab/vector-store";
import path from 'path';
import { VectorStoreEntry } from "@oab/vector-store";

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

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data')
    });

    const store = await storeManager.getStore('short-memory', params.filename);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (embeddingSearch) {
      const results = await store.search(embeddingSearch, topK);
      return NextResponse.json({ results });
    }

    const { items, total, hasMore } = await store.entries({ limit, offset });
    return NextResponse.json({
      items: items.map((entry: VectorStoreEntry) => ({
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
