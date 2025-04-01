// File: src/app/api/memory/query/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStoreManager, VectorStoreMetadata } from "oab-vector-store";
import path from "path";

/**
 * GET /api/memory/query
 * Returns an array of vector stores with their metadata, including item counts.
 *
 * Query params: ?limit=10&offset=0&query=partialName
 */
export async function GET(request: NextRequest) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    const url = request.nextUrl;
    const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const query = url.searchParams.get("query") ?? "";

    // Create store manager instance
    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'memory-store')
    });

    // Get stores with metadata from the store manager
    const { items: stores } = await storeManager.listStores(requestContext.databaseIdHash, { limit, offset });

    // Convert stores to files array
    const files = stores.map((metadata: VectorStoreMetadata) => ({
      file: metadata.name,
      displayName: metadata.name,
      itemCount: metadata.itemCount,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      lastAccessed: metadata.lastAccessed
    }));

    // Apply search filter if query is provided
    let filteredFiles = files;
    if (query) {
      const q = query.toLowerCase();
      filteredFiles = files.filter(file => 
        file.displayName.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      files: filteredFiles,
      limit,
      offset,
      hasMore: offset + limit < filteredFiles.length,
      total: filteredFiles.length,
    });
  } catch (err) {
    console.error('Error listing stores:', err);
    return NextResponse.json(
      { message: getErrorMessage(err), status: 500 },
      { status: 500 }
    );
  }
}
