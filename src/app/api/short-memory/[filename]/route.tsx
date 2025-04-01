import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { createDiskVectorStoreManager } from "@oab/vector-store";
import path from "path";
import fs from "fs";

interface StoreMetadata {
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface StoreIndex {
  [databaseIdHash: string]: {
    [storeName: string]: StoreMetadata;
  };
}

/**
 * GET /api/short-memory/[filename]
 * Returns the raw file content of a short-memory JSON file.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', 'short-memory-store')
    });

    const store = await storeManager.getStore(requestContext.databaseIdHash, params.filename);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const { items } = await store.entries();
    return NextResponse.json(items);
  } catch (err) {
    console.error('Error fetching store:', err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/short-memory/[filename]
 * Deletes a short-memory JSON file.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'short-memory-store')
    });

    // Even if the store file doesn't exist, we should clean up the index
    const indexPath = path.resolve(process.cwd(), 'data', 'short-memory-store', 'index.json');
    let indexCleaned = false;

    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const index: StoreIndex = JSON.parse(indexContent);

      // Remove the store from the index if it exists
      if (index[requestContext.databaseIdHash]?.[params.filename]) {
        delete index[requestContext.databaseIdHash][params.filename];
        indexCleaned = true;

        // If this was the last store for this database, remove the database entry too
        if (Object.keys(index[requestContext.databaseIdHash]).length === 0) {
          delete index[requestContext.databaseIdHash];
        }

        // Write the updated index back to disk
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      }
    }

    // Try to delete the actual store if it exists
    const store = await storeManager.getStore(requestContext.databaseIdHash, params.filename);
    if (store) {
      await storeManager.deleteStore(requestContext.databaseIdHash, params.filename);
      return NextResponse.json({ message: 'Store deleted successfully', status: 200 });
    } else if (indexCleaned) {
      // If we cleaned up the index but store file wasn't found
      return NextResponse.json({ message: 'Store index entry removed', status: 200 });
    } else {
      // If neither store nor index entry existed
      return NextResponse.json(
        { message: `Store '${params.filename}' not found`, status: 404 },
        { status: 404 }
      );
    }
  } catch (err) {
    console.error('Error deleting store:', err);
    return NextResponse.json(
      { message: getErrorMessage(err), status: 500 },
      { status: 500 }
    );
  }
}
