// File: src/app/api/short-memory/query/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { StorageService } from "@/lib/storage-service";
import fs from "fs";

/**
 * GET /api/short-memory/query
 * Returns an array of { file: string, itemCount?: number } so we can display
 * how many records are inside each file if it's a valid JSON vector store.
 *
 * Query params: ?limit=10&offset=0&query=partialName
 */
export async function GET(request: NextRequest) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    const storageSchema = await authorizeStorageSchema(request);

    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit") ?? "10";
    const offsetParam = url.searchParams.get("offset") ?? "0";
    const queryParam = url.searchParams.get("query") ?? "";

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    // We'll use the StorageService method to list .json files
    const storageService = new StorageService(requestContext.databaseIdHash, storageSchema);
    const { files, total } = storageService.listShortMemoryJsonFiles(queryParam, offset, limit);

    // Now figure out how many items are in each file
    const results = files.map((f) => {
      let itemCount: number | undefined;
      try {
        const raw = storageService.readShortMemoryJsonFile(f);
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          itemCount = Object.keys(parsed).length;
        }
      } catch {
        // If parse fails, itemCount stays undefined
      }
      return { file: f, itemCount };
    });

    const hasMore = offset + limit < total;
    return NextResponse.json({
      files: results,
      limit,
      offset,
      hasMore,
      total,
    });
  } catch (err) {
    return NextResponse.json(
      { message: getErrorMessage(err), status: 500 },
      { status: 500 }
    );
  }
}
