// File: src/data/client/memory-api-client.ts

import { getErrorMessage } from "@/lib/utils";

export interface StoreMetadata {
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface StoreIndex {
  [databaseIdHash: string]: {
    [storeName: string]: StoreMetadata;
  };
}

export interface MemoryListResponse {
  files: {
    file: string;
    displayName: string;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
  limit: number;
  offset: number;
  hasMore: boolean;
  total: number;
}

export interface MemoryQueryParams {
  limit?: number;
  offset?: number;
  query?: string;
}

export interface MemoryRecordsResponse {
  items: any[];
  limit: number;
  offset: number;
  hasMore: boolean;
  total: number;
}

/**
 * Create a new memory store with the given name.
 */
export async function createStore(storeName: string): Promise<void> {
  const response = await fetch(
    `/api/memory/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storeName }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to create store');
  }
}

/**
 * Lists memory files with possible pagination & search by filename.
 */
export async function listFiles(params: MemoryQueryParams = {}): Promise<MemoryListResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.query) searchParams.set('query', params.query);

  const url = `/api/memory/query?` + searchParams.toString();
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to list files');
  }

  return response.json();
}

/**
 * Get all records from a memory file.
 */
export async function getRecords(filename: string): Promise<any[]> {
  const response = await fetch(
    `/api/memory/${filename}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to get records');
  }

  return response.json();
}

/**
 * Lists or vector-searches records in a single memory file.
 */
export async function searchRecords(
  filename: string,
  params: {
    limit?: number;
    offset?: number;
    query?: string;
    embeddings?: number[];
  } = {}
): Promise<MemoryRecordsResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.query) searchParams.set('query', params.query);
  if (params.embeddings) searchParams.set('embeddings', JSON.stringify(params.embeddings));

  const url = `/api/memory/${filename}/records?` + params.toString();
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to search records');
  }

  return response.json();
}

/**
 * Delete the specified memory file from the server.
 */
export async function deleteFile(filename: string): Promise<void> {
  const response = await fetch(
    `/api/memory/${filename}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const data = await response.json();
    if (response.status === 404) {
      throw new Error('Store not found');
    }
    throw new Error(data.message || 'Failed to delete file');
  }
}

/**
 * Save records to a memory file.
 */
export async function saveRecords(fileName: string, records: any[]): Promise<void> {
  const response = await fetch(
    `/api/memory/${fileName}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to save records');
  }
}

/**
 * Get embeddings for a text using the server's embedding model.
 */
export async function getEmbeddings(text: string): Promise<number[]> {
  const response = await fetch(
    `/api/memory/embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to get embeddings');
  }

  return response.json();
}
