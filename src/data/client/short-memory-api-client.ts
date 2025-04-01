// File: src/data/client/short-memory-api-client.ts

import { AdminApiClient, ApiEncryptionConfig } from "./admin-api-client";
import { DatabaseContextType } from "@/contexts/db-context";
import { SaaSContextType } from "@/contexts/saas-context";

export type ShortMemoryFileEntry = {
  file: string;       // The file name
  displayName?: string; // Display name for the store
  itemCount?: number; // Number of records if it's valid JSON
  createdAt: string;  // When the store was created
  updatedAt: string;  // When the store was last updated
  lastAccessed?: string; // When the store was last accessed
};

export type ShortMemoryListResponse = {
  files: ShortMemoryFileEntry[];
  limit: number;
  offset: number;
  hasMore: boolean;
  total: number;
};

export type ShortMemoryQueryParams = {
  limit: number;
  offset: number;
  query?: string;
};

export interface ShortMemoryRecordRow {
  id: string;
  metadata: Record<string, unknown>;
  content: string;
  embeddingPreview?: number[];
  similarity?: number; // Only present if vector search is used
}

export interface ShortMemoryRecordsResponse {
  total: number;
  rows: ShortMemoryRecordRow[];
  vectorSearchQuery?: string;
}

export class ShortMemoryApiClient extends AdminApiClient {
  storageSchema: string;

  constructor(
    baseUrl: string,
    storageSchema: string,
    dbContext?: DatabaseContextType | null,
    saasContext?: SaaSContextType | null,
    encryptionConfig?: ApiEncryptionConfig
  ) {
    super(baseUrl, dbContext, saasContext, encryptionConfig);
    this.storageSchema = storageSchema;
  }

  /**
   * Create a new vector store with the given name
   */
  async createStore(storeName: string): Promise<void> {
    await this.request<void>(
      `/api/short-memory/create`,
      "POST",
      { encryptedFields: [] },
      { storeName },
      undefined,
      undefined,
      { "Storage-Schema": this.storageSchema }
    );
  }

  /**
   * Lists short-memory files with possible pagination & search by filename.
   * Now returns itemCount for each file if known.
   */
  async query(params: ShortMemoryQueryParams): Promise<ShortMemoryListResponse> {
    const { limit, offset, query } = params;
    const searchParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (query) {
      searchParams.append("query", query);
    }
    const url = `/api/short-memory/query?` + searchParams.toString();

    const response = await this.request<ShortMemoryListResponse>(
      url,
      "GET",
      { encryptedFields: [] },
      undefined,
      undefined,
      undefined,
      { "Storage-Schema": this.storageSchema }
    );
    return response as ShortMemoryListResponse;
  }

  /**
   * Returns the raw file content (full JSON) – used in old approach.
   */
  async getFileContent(filename: string): Promise<string> {
    const response = await this.request<string>(
      `/api/short-memory/${filename}`,
      "GET",
      { encryptedFields: [] },
      undefined,
      undefined,
      undefined,
      { "Storage-Schema": this.storageSchema }
    );
    return response as string;
  }

  /**
   * Lists or vector-searches records in a single short-memory file.
   * - limit, offset for normal pagination
   * - embeddingSearch for vector search
   * - topK for how many vector matches to return
   */
  async listRecords(
    filename: string,
    opts: { limit: number; offset: number; embeddingSearch?: string; topK?: number }
  ): Promise<ShortMemoryRecordsResponse> {
    const { limit, offset, embeddingSearch, topK } = opts;
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (embeddingSearch) {
      params.append("embeddingSearch", embeddingSearch);
      if (topK) {
        params.append("topK", String(topK));
      }
    }

    const url = `/api/short-memory/${filename}/records?` + params.toString();
    const response = await this.request<ShortMemoryRecordsResponse>(
      url,
      "GET",
      { encryptedFields: [] },
      undefined,
      undefined,
      undefined,
      { "Storage-Schema": this.storageSchema }
    );
    return response as ShortMemoryRecordsResponse;
  }

  /**
   * Delete the specified short-memory file from the server.
   */
  async deleteFile(filename: string): Promise<{ message: string; status: number }> {
    const response = await this.request<{ message: string; status: number }>(
      `/api/short-memory/${filename}`,
      "DELETE",
      { encryptedFields: [] },
      undefined,
      undefined,
      undefined,
      { "Storage-Schema": this.storageSchema }
    );
    return response as { message: string; status: number };
  }

  /**
   * Save a record to a vector store
   */
  async saveRecord(
    fileName: string,
    record: {
      id: string;
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[];
    }
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Storage-Schema": this.storageSchema
    };

    await this.request<void>(
      `/api/short-memory/${fileName}/records`,
      "POST",
      { encryptedFields: [] },
      record,
      undefined,
      undefined,
      headers
    );
  }
}
