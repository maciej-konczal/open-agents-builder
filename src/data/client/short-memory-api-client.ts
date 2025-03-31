import { AdminApiClient, ApiEncryptionConfig } from "./admin-api-client";
import { DatabaseContextType } from "@/contexts/db-context";
import { SaaSContextType } from "@/contexts/saas-context";

export type ShortMemoryListResponse = {
  files: string[];
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

export type DeleteShortMemoryResponse = {
  message: string;
  status: number;
};

/**
 * ShortMemoryApiClient is similar to AttachmentApiClient, but for short-memory .json files.
 */
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
   * Query short-memory files with pagination & optional search.
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
    return this.request<ShortMemoryListResponse>(
      url,
      "GET",
      { ecnryptedFields: [] },
      undefined,
      undefined,
      undefined,
      {
        "Storage-Schema": this.storageSchema
      }
    ) as Promise<ShortMemoryListResponse>;
  }

  /**
   * Get file content as a string from the server.
   */
  async getFileContent(filename: string): Promise<string> {
    // We'll treat it as text
    const response = await this.request<string>(
      `/api/short-memory/${filename}`,
      "GET",
      { ecnryptedFields: [] },
      undefined,
      undefined,
      undefined,
      {
        "Storage-Schema": this.storageSchema
      },
    );
    return response as string;
  }

  /**
   * Delete the specified short-memory file.
   */
  async deleteFile(filename: string): Promise<DeleteShortMemoryResponse> {
    return this.request<DeleteShortMemoryResponse>(
      `/api/short-memory/${filename}`,
      "DELETE",
      { ecnryptedFields: [] },
      undefined,
      undefined,
      undefined,
      {
        "Storage-Schema": this.storageSchema
      }
    ) as Promise<DeleteShortMemoryResponse>;
  }
}
