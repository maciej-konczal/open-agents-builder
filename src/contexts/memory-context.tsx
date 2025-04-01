// File: src/contexts/memory-context.tsx

"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  createStore,
  deleteFile,
  getRecords,
  listFiles,
  saveRecords,
  searchRecords,
  MemoryListResponse,
  MemoryRecordsResponse
} from "@/data/client/memory-api-client";
import { DatabaseContext } from "./db-context";
import { SaaSContext } from "./saas-context";
import { DataLoadingStatus } from "@/data/client/models";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { StorageSchemas } from "@/data/dto";

interface MemoryContextType {
  files: MemoryListResponse | null;
  loadFiles: (forceRefresh?: boolean) => Promise<void>;
  deleteFile: (filename: string) => Promise<void>;
  getRecords: (filename: string) => Promise<Record<string, unknown>[]>;
  searchRecords: (filename: string, params?: { limit?: number; offset?: number; query?: string; embeddings?: number[] }) => Promise<MemoryRecordsResponse>;
  saveRecords: (filename: string, records: Record<string, unknown>[]) => Promise<void>;
  createStore: (storeName: string) => Promise<void>;
}

const MemoryContext = createContext<MemoryContextType>({
  files: null,
  loadFiles: async () => {},
  deleteFile: async () => {},
  getRecords: async () => [],
  searchRecords: async () => ({ items: [], limit: 0, offset: 0, hasMore: false, total: 0 }),
  saveRecords: async () => {},
  createStore: async () => {},
});

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<MemoryListResponse | null>(null);

  const loadFiles = async (forceRefresh = false) => {
    if (!forceRefresh && files) return;
    const response = await listFiles();
    setFiles(response);
  };

  const value = {
    files,
    loadFiles,
    deleteFile,
    getRecords,
    searchRecords,
    saveRecords,
    createStore,
  };

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemoryContext() {
  return useContext(MemoryContext);
}
