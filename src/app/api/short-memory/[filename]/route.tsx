import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStore, createOpenAIEmbeddings } from "@oab/vector-store";

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

    // Create vector store instance
    const generateEmbeddings = createOpenAIEmbeddings();
    const vectorStore = createDiskVectorStore({
      storeName: params.filename,
      partitionKey: requestContext.databaseIdHash,
      maxFileSizeMB: 10
    }, generateEmbeddings);

    // Get all entries
    const entries = await vectorStore.entries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
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

    // Create vector store instance
    const generateEmbeddings = createOpenAIEmbeddings();
    const vectorStore = createDiskVectorStore({
      storeName: params.filename,
      partitionKey: requestContext.databaseIdHash,
      maxFileSizeMB: 10
    }, generateEmbeddings);

    // Clear all entries
    await vectorStore.clear();

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: getErrorMessage(error), status: 500 },
      { status: 500 }
    );
  }
}
