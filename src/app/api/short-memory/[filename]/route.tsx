import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { StorageService } from "@/lib/storage-service";

/**
 * GET /api/short-memory/[filename]
 * Returns the content of a short-memory .json file as text (UTF-8).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    const storageSchema = await authorizeStorageSchema(request);

    const storageService = new StorageService(requestContext.databaseIdHash, storageSchema);
    const content = storageService.readShortMemoryJsonFile(params.filename);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error), status: 500 },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/short-memory/[filename]
 * Deletes the specified short-memory .json file from disk.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    const storageSchema = await authorizeStorageSchema(request);

    const storageService = new StorageService(requestContext.databaseIdHash, storageSchema);

    if (!storageService.fileExists(params.filename)) {
      return NextResponse.json({ message: "File not found", status: 404 }, { status: 404 });
    }

    storageService.deleteShortMemoryFile(params.filename);
    return NextResponse.json({ message: "File deleted", status: 200 }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error), status: 500 },
      { status: 500 }
    );
  }
}
