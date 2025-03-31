import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { StorageService } from "@/lib/storage-service";

/**
 * GET /api/short-memory/query
 * Lists ShortMemory JSON files from disk, with optional pagination & search.
 * Query params: ?limit=10&offset=0&query=partialName
 */
export async function GET(request: NextRequest) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    const storageSchema = await authorizeStorageSchema(request);

    // Parse query params
    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit") ?? "10";
    const offsetParam = url.searchParams.get("offset") ?? "0";
    const queryParam = url.searchParams.get("query") ?? "";

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    const storageService = new StorageService(requestContext.databaseIdHash, storageSchema);

    const { files, total } = storageService.listShortMemoryJsonFiles(queryParam, offset, limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      files,
      limit,
      offset,
      hasMore,
      total
    });
  } catch (err) {
    return NextResponse.json(
      { message: getErrorMessage(err), status: 500 },
      { status: 500 }
    );
  }
}
