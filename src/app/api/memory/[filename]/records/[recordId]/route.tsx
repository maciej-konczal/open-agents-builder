import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStoreManager } from "oab-vector-store";
import path from "path";

/**
 * DELETE /api/memory/[filename]/records/[recordId]
 * Deletes a specific record from a vector store.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string; recordId: string } }
) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'memory-store')
    });

    // Get the store
    const store = await storeManager.getStore(requestContext.databaseIdHash, params.filename);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Delete the record
    await store.delete(params.recordId);

    return NextResponse.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Error deleting record:', err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
} 