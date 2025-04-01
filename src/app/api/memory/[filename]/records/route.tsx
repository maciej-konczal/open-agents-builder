// File: src/app/api/memory/[filename]/records/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { createDiskVectorStoreManager } from "@oab/vector-store";
import path from 'path';
import { VectorStoreEntry } from "@oab/vector-store";
import { authorizeRequestContext } from "@/lib/authorization-api";
import fs from "fs";

interface StoreMetadata {
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface StoreIndex {
  [storeName: string]: StoreMetadata;
}

function updateIndex(databaseIdHash: string, storeName: string, itemCount: number) {
  const indexPath = path.resolve(process.cwd(), 'data', databaseIdHash, 'memory-index.json');
  let index: StoreIndex = {};
  
  // Ensure the directory exists
  const dir = path.dirname(indexPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    index = JSON.parse(indexContent);
  }

  if (!index[storeName]) {
    index[storeName] = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 0
    };
  }

  index[storeName].itemCount = itemCount;
  index[storeName].updatedAt = new Date().toISOString();

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
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

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'memory-store')
    });

    const store = await storeManager.getStore(requestContext.databaseIdHash, params.filename);
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
    
    // Update the index with the current item count
    updateIndex(requestContext.databaseIdHash, params.filename, total);

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
    const { id, content, metadata, embedding } = record;

    if (!id || !content || !embedding) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'memory-store')
    });

    const store = await storeManager.getStore(requestContext.databaseIdHash, params.filename);
    if (!store) {
      throw new Error('Store not found');
    }

    const entry: VectorStoreEntry = {
      id,
      content,
      metadata: metadata || {},
      embedding
    };

    await store.set(id, entry);

    // Get the updated total count and update the index
    const { total } = await store.entries();
    updateIndex(requestContext.databaseIdHash, params.filename, total);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving record:', error);
    return NextResponse.json(
      { error: 'Failed to save record' },
      { status: 500 }
    );
  }
}
