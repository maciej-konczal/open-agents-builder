// File: src/app/api/short-memory/query/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStoreManager } from "@oab/vector-store";
import path from "path";

/**
 * GET /api/short-memory/query
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
      baseDir: path.resolve(process.cwd(), 'data')
    });

    // List stores for this database
    let items, total, hasMore;
    if (query) {
      // If there's a search query, use searchStores
      const searchResults = await storeManager.searchStores(requestContext.databaseIdHash, query);
      items = searchResults;
      total = searchResults.length;
      hasMore = false;
    } else {
      // Otherwise use paginated listStores
      const result = await storeManager.listStores(requestContext.databaseIdHash, { limit, offset });
      items = result.items;
      total = result.total;
      hasMore = result.hasMore;
    }

    // Map to the expected response format
    const files = items.map(store => ({
      file: store.name,
      itemCount: store.itemCount
    }));

    return NextResponse.json({
      files,
      limit,
      offset,
      hasMore,
      total,
    });
  } catch (err) {
    console.error('Error listing stores:', err);
    return NextResponse.json(
      { message: getErrorMessage(err), status: 500 },
      { status: 500 }
    );
  }
}
