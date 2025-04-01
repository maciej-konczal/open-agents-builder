import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStoreManager } from "@oab/vector-store";
import path from "path";

/**
 * POST /api/short-memory/create
 * Creates a new vector store with the given name.
 * Body: { storeName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    const body = await request.json();
    const { storeName } = body;

    if (!storeName || typeof storeName !== 'string') {
      return NextResponse.json(
        { error: 'Store name is required' },
        { status: 400 }
      );
    }

    // Create store manager instance
    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data')
    });

    // Check if store already exists
    const existingStore = await storeManager.getStore(requestContext.databaseIdHash, storeName);
    if (existingStore) {
      return NextResponse.json(
        { error: 'Store already exists' },
        { status: 400 }
      );
    }

    // Create a new store
    await storeManager.createStore({
      storeName,
      partitionKey: requestContext.databaseIdHash,
      baseDir: path.resolve(process.cwd(), 'data'),
      generateEmbeddings: async () => [], // This will be set when actually using the store
    });

    return NextResponse.json({ message: 'Store created successfully' });
  } catch (err) {
    console.error('Error creating store:', err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
} 