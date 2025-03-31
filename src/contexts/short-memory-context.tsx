// File: src/contexts/short-memory-context.tsx

"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  ShortMemoryApiClient,
  ShortMemoryQueryParams,
  ShortMemoryListResponse,
  ShortMemoryRecordsResponse,
} from "@/data/client/short-memory-api-client";
import { DatabaseContext } from "./db-context";
import { SaaSContext } from "./saas-context";
import { DataLoadingStatus } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { StorageSchemas } from "@/data/dto";

type ShortMemoryContextType = {
  loaderStatus: DataLoadingStatus;

  // Existing methods
  queryFiles: (params: ShortMemoryQueryParams) => Promise<ShortMemoryListResponse>;
  getFileContent: (fileName: string) => Promise<string>;
  deleteFile: (fileName: string) => Promise<void>;

  // New method to get partial records or vector search results from a single file
  listRecords: (fileName: string, opts: {
    limit: number;
    offset: number;
    embeddingSearch?: string;
    topK?: number;
  }) => Promise<ShortMemoryRecordsResponse>;
};

const ShortMemoryContext = createContext<ShortMemoryContextType | undefined>(undefined);

export const ShortMemoryProvider = ({ children }: { children: ReactNode }) => {
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);

  const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);

  /**
   * Initialize the API client with relevant schema, etc.
   */
  const setupApiClient = (): ShortMemoryApiClient => {
    const storageSchema = StorageSchemas.VectorStore;
    return new ShortMemoryApiClient(
      "", // baseUrl (if relative, keep empty)
      storageSchema,
      dbContext,
      saasContext,
      { useEncryption: false }
    );
  };

  const queryFiles = async (params: ShortMemoryQueryParams): Promise<ShortMemoryListResponse> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const apiClient = setupApiClient();
      const data = await apiClient.query(params);
      setLoaderStatus(DataLoadingStatus.Success);
      return data;
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const getFileContent = async (fileName: string): Promise<string> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const apiClient = setupApiClient();
      const content = await apiClient.getFileContent(fileName);
      setLoaderStatus(DataLoadingStatus.Success);
      return content;
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const deleteFile = async (fileName: string): Promise<void> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const apiClient = setupApiClient();
      const resp = await apiClient.deleteFile(fileName);
      if (resp.status !== 200) {
        toast.error(resp.message);
        throw new Error(resp.message);
      }
      setLoaderStatus(DataLoadingStatus.Success);
      toast.success("File deleted");
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  /**
   * New method: list (or vector-search) a single file’s records with server pagination.
   */
  const listRecords = async (
    fileName: string,
    opts: { limit: number; offset: number; embeddingSearch?: string; topK?: number }
  ): Promise<ShortMemoryRecordsResponse> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const apiClient = setupApiClient();
      const resp = await apiClient.listRecords(fileName, opts);
      setLoaderStatus(DataLoadingStatus.Success);
      return resp;
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const value: ShortMemoryContextType = {
    loaderStatus,
    queryFiles,
    getFileContent,
    deleteFile,
    listRecords,
  };

  return (
    <ShortMemoryContext.Provider value={value}>
      {children}
    </ShortMemoryContext.Provider>
  );
};

export const useShortMemoryContext = (): ShortMemoryContextType => {
  const context = useContext(ShortMemoryContext);
  if (!context) {
    throw new Error("useShortMemoryContext must be used within a ShortMemoryProvider");
  }
  return context;
};
