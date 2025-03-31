"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ShortMemoryApiClient, ShortMemoryQueryParams, ShortMemoryListResponse } from "@/data/client/short-memory-api-client";
import { DatabaseContext } from "./db-context";
import { SaaSContext } from "./saas-context";
import { DataLoadingStatus } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { StorageSchemas } from "@/data/dto";

/**
 * Basic response shape for deletion
 */
type DeleteFileResponse = {
  message: string;
  status: number;
};

type ShortMemoryContextType = {
  loaderStatus: DataLoadingStatus;
  queryFiles: (params: ShortMemoryQueryParams) => Promise<ShortMemoryListResponse>;
  getFileContent: (fileName: string) => Promise<string>;
  deleteFile: (fileName: string) => Promise<void>;
};

/**
 * We create a dedicated context for short memory data,
 * used by the Admin Page to list, read, and delete short-memory .json files.
 */
const ShortMemoryContext = createContext<ShortMemoryContextType | undefined>(undefined);

export const ShortMemoryProvider = ({ children }: { children: ReactNode }) => {
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);

  const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);

  /**
   * Initialize the API client with relevant schema.
   */
  const setupApiClient = (): ShortMemoryApiClient => {
    // If you have a real baseUrl or storageSchema, pass them here
    const storageSchema = StorageSchemas.VectorStore;
    return new ShortMemoryApiClient(
      "", // baseUrl: If your AdminApiClient is relative, keep it empty
      storageSchema,
      dbContext,
      saasContext,
      {
        useEncryption: false
      }
    );
  };

  /**
   * Lists short-memory files from the server.
   */
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

  /**
   * Gets file content as a string from the server.
   */
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

  /**
   * Delete a file from the short-memory directory.
   */
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

  const value: ShortMemoryContextType = {
    loaderStatus,
    queryFiles,
    getFileContent,
    deleteFile
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
