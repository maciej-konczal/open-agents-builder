// File: src/app/api/memory/[filename]/records/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { createDiskVectorStoreManager, createOpenAIEmbeddings } from "oab-vector-store";
import path from 'path';
import { VectorStoreEntry, VectorStore } from "oab-vector-store";
import { authorizeRequestContext } from "@/lib/authorization-api";

async function getOrCreateStore(databaseIdHash: string, storeName: string): Promise<VectorStore> {
  const storeManager = createDiskVectorStoreManager({
    baseDir: path.resolve(process.cwd(), 'data', databaseIdHash, 'memory-store')
  });

  let store = await storeManager.getStore(databaseIdHash, storeName);
  
  if (!store) {
    const generateEmbeddings = createOpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY
    });

    store = await storeManager.createStore({
      storeName,
      partitionKey: databaseIdHash,
      baseDir: path.resolve(process.cwd(), 'data', databaseIdHash, 'memory-store'),
      generateEmbeddings
    });
  }

  return store;
}

/**
 * GET /api/memory/[filename]/records
 * Query or vector-search records in a single memory JSON file.
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
    const requestContext = await authorizeRequestContext(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const embeddingSearch = searchParams.get('embeddingSearch');
    const topK = parseInt(searchParams.get('topK') || '5');

    const store = await getOrCreateStore(requestContext.databaseIdHash, params.filename);

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

/**
 * POST /api/memory/[filename]/records
 * Save a new record to the vector store.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const requestContext = await authorizeRequestContext(request);
    const record = await request.json();
    const { id, content, metadata: recordMetadata, embedding } = record;

    if (!id || !content || !embedding) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'memory-store')
    });

    const store = await getOrCreateStore(requestContext.databaseIdHash, params.filename);

    const entry: VectorStoreEntry = {
      id,
      content,
      metadata: recordMetadata || {},
      embedding
    };

    await store.set(id, entry);

    // Get the updated total count
    const { total } = await store.entries();
    
    // Update the store metadata
    const storeMetadata = await store.getMetadata();
    await storeManager.updateStoreMetadata(requestContext.databaseIdHash, params.filename, {
      ...storeMetadata,
      itemCount: total,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving record:', error);
    return NextResponse.json(
      { error: 'Failed to save record' },
      { status: 500 }
    );
  }
}
