"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";
import { DataLoadingStatus } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";

/** Query params for short-memory listing. */
export type ShortMemoryQueryParams = {
  limit: number;
  offset: number;
  query?: string;
};

/** Response shape from /api/short-memory/query */
export type ShortMemoryListResponse = {
  files: string[];
  limit: number;
  offset: number;
  hasMore: boolean;
  total: number;
};

type ShortMemoryContextType = {
  loaderStatus: DataLoadingStatus;
  queryFiles: (params: ShortMemoryQueryParams) => Promise<ShortMemoryListResponse>;
  getFileContent: (fileName: string) => Promise<string>;
  deleteFile: (fileName: string) => Promise<void>;
};

const ShortMemoryContext = createContext<ShortMemoryContextType | undefined>(undefined);

export const ShortMemoryProvider = ({ children }: { children: ReactNode }) => {
  const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);

  /**
   * Query the list of ShortMemory JSON files (paginated & optional search).
   */
  const queryFiles = async (params: ShortMemoryQueryParams): Promise<ShortMemoryListResponse> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const queryString = new URLSearchParams({
        limit: String(params.limit),
        offset: String(params.offset),
      });
      if (params.query) {
        queryString.append("query", params.query);
      }

      const resp = await fetch(`/api/short-memory/query?${queryString.toString()}`);
      if (!resp.ok) {
        throw new Error(`Server error: ${resp.statusText}`);
      }
      const data = (await resp.json()) as ShortMemoryListResponse;
      setLoaderStatus(DataLoadingStatus.Success);
      return data;
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  /**
   * Fetch the file content by filename.
   */
  const getFileContent = async (fileName: string): Promise<string> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const resp = await fetch(`/api/short-memory/${fileName}`, { method: "GET" });
      if (!resp.ok) {
        throw new Error(`Server error: ${resp.statusText}`);
      }
      const text = await resp.text();
      setLoaderStatus(DataLoadingStatus.Success);
      return text;
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  /**
   * Delete a file from the ShortMemory directory.
   */
  const deleteFile = async (fileName: string): Promise<void> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const resp = await fetch(`/api/short-memory/${fileName}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || "Server error");
      }
      setLoaderStatus(DataLoadingStatus.Success);
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
