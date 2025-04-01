import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStoreManager } from "@oab/vector-store";
import path from "path";

/**
 * GET /api/short-memory/[filename]
 * Get the full content of a short-memory file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Authorization checks
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    // Create store manager instance
    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data')
    });

    // Get the store
    const store = await storeManager.getStore(requestContext.databaseIdHash, params.filename);
    if (!store) {
      return NextResponse.json(
        { message: "Store not found", status: 404 },
        { status: 404 }
      );
    }

    // Get all entries
    const { items } = await store.entries();
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { message: getErrorMessage(error), status: 500 },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/short-memory/[filename]
 * Delete a short-memory file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // Authorization checks
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    // Create store manager instance
    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data')
    });

    // Delete the store
    await storeManager.deleteStore(requestContext.databaseIdHash, params.filename);

    return NextResponse.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { message: getErrorMessage(error), status: 500 },
      { status: 500 }
    );
  }
}
