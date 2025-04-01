// File: src/app/api/short-memory/query/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import path from "path";
import fs from "fs";

interface StoreMetadata {
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface StoreIndex {
  [storeName: string]: StoreMetadata;
}

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

    // Read the index.json file
    const indexPath = path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'short-memory-index.json');
    let index: StoreIndex = {};
    
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    }

    // Convert index to files array
    let files = Object.entries(index).map(([storeName, metadata]) => ({
      file: `${storeName}.json`,
      displayName: storeName,
      itemCount: metadata.itemCount,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    }));

    // Apply search filter if query is provided
    if (query) {
      const q = query.toLowerCase();
      files = files.filter(file => 
        file.displayName.toLowerCase().includes(q)
      );
    }

    // Apply pagination
    const total = files.length;
    const hasMore = offset + limit < total;
    const paginatedFiles = files.slice(offset, offset + limit);

    return NextResponse.json({
      files: paginatedFiles,
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
