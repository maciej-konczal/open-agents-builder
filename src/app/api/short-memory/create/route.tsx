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
 * Validates a store name to ensure it only contains valid filesystem characters
 */
function validateStoreName(storeName: string): { isValid: boolean; error?: string } {
  // Check if the name is empty or only whitespace
  if (!storeName.trim()) {
    return { isValid: false, error: 'Store name cannot be empty' };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (invalidChars.test(storeName)) {
    return { 
      isValid: false, 
      error: 'Store name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed.' 
    };
  }

  // Check if the name starts or ends with a space or dot
  if (storeName.startsWith('.') || storeName.endsWith('.') || 
      storeName.startsWith(' ') || storeName.endsWith(' ')) {
    return { 
      isValid: false, 
      error: 'Store name cannot start or end with a space or dot' 
    };
  }

  // Check length (max 255 characters is a common filesystem limit)
  if (storeName.length > 255) {
    return { 
      isValid: false, 
      error: 'Store name is too long. Maximum length is 255 characters.' 
    };
  }

  return { isValid: true };
}

/**
 * POST /api/short-memory/create
 * Creates a new vector store with the given name.
 * Body: { storeName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const requestContext = await authorizeRequestContext(request);
    await authorizeSaasContext(request);
    await authorizeStorageSchema(request);

    const body = await request.json();
    const { storeName } = body;

    if (!storeName || typeof storeName !== 'string') {
      return NextResponse.json(
        { error: 'Store name is required' },
        { status: 400 }
      );
    }

    // Validate store name
    const validation = validateStoreName(storeName);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Create store manager instance
    const storeManager = createDiskVectorStoreManager({
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'short-memory-store')
    });

    // Check if store already exists
    const existingStore = await storeManager.getStore(requestContext.databaseIdHash, storeName);
    if (existingStore) {
      return NextResponse.json(
        { error: 'Store already exists' },
        { status: 400 }
      );
    }

    // Create a new store with the file directly in the base directory
    await storeManager.createStore({
      storeName,
      partitionKey: requestContext.databaseIdHash,
      baseDir: path.resolve(process.cwd(), 'data', requestContext.databaseIdHash, 'short-memory-store'),
      generateEmbeddings: async () => [], // This will be set when actually using the store
    });

    // Initialize the store to ensure it's properly created
    const store = await storeManager.getStore(requestContext.databaseIdHash, storeName);
    if (!store) {
      throw new Error('Failed to initialize store');
    }

    // Update the index.json file
    const indexPath = path.resolve(process.cwd(), 'data', 'short-memory-store', 'index.json');
    
    // Ensure the directory exists
    const dir = path.dirname(indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let index: StoreIndex = {};
    
    // Read existing index if it exists
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    }
    
    // Initialize the database section if it doesn't exist
    if (!index[requestContext.databaseIdHash]) {
      index[requestContext.databaseIdHash] = {};
    }

    // Add the new store to the index
    index[requestContext.databaseIdHash][storeName] = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 0
    };

    // Write the updated index back to disk
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    return NextResponse.json({ message: 'Store created successfully' });
  } catch (err) {
    console.error('Error creating store:', err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
} 