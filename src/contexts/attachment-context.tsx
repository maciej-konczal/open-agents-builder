"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { DatabaseContext } from "./db-context";
import { SaaSContext } from "./saas-context";
import { Attachment, DataLoadingStatus } from "@/data/client/models";
import { AttachmentApiClient } from "@/data/client/attachment-api-client";
import { AttachmentDTO, PaginatedQuery, PaginatedResult, StorageSchemas } from "@/data/dto";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

let syncHandler = null;

type AttachmentContextType = {
  loaderStatus: DataLoadingStatus;
  refreshDataSync: string;

  queryAttachments: (params: PaginatedQuery) => Promise<PaginatedResult<AttachmentDTO[]>>;
  deleteAttachment: (attachment: AttachmentDTO) => Promise<void>;

  exportAttachments: () => Promise<void>;
};

const AttachmentContext = createContext<AttachmentContextType | undefined>(undefined);

export const AttachmentProvider = ({ children }: { children: ReactNode }) => {
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);

  const [refreshDataSync, setRefreshDataSync] = useState<string>("");
  const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);

  const setupApiClient = (): AttachmentApiClient => {
    // Return an instance of AttachmentApiClient
    // If needed, you can set encryptionConfig
    return new AttachmentApiClient("", "", dbContext, saasContext, {
      useEncryption: false,
    });
  };

  const queryAttachments = async (params: PaginatedQuery): Promise<PaginatedResult<AttachmentDTO[]>> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const client = await setupApiClient();
      const response = await client.query(params);

      setLoaderStatus(DataLoadingStatus.Success);

      if (syncHandler) clearInterval(syncHandler);
      syncHandler = setInterval(() => {
        console.log('Refreshing SaaS data sync ...');
        setRefreshDataSync(new Date().toISOString());
      }, 1000 * 30); // refresh data every 30s

      return {
        ...response,
        rows: response.rows.map((r: any) => Attachment.fromDTO(r))
      }

    } catch (error) {
      console.error(error);
      setLoaderStatus(DataLoadingStatus.Error);
      throw error;
    }
  };

  const deleteAttachment = async (attachment: AttachmentDTO) => {
    try {
      const client = setupApiClient();
      const resp = await client.delete(attachment);
      if (resp.status === 200) {
        setRefreshDataSync(new Date().toISOString());
        toast.success("Attachment removed");
      } else {
        toast.error(resp.message);
        console.error("deleteAttachment error:", resp);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      console.error("deleteAttachment error:", error);
    }
  };

  const exportAttachments = async () => {
    const apiClient = new AttachmentApiClient('', StorageSchemas.Default, dbContext, saasContext);
    const a = document.createElement('a');
    const file = new Blob([await apiClient.export() ?? ''], { type: 'application/zip' });
    a.href = URL.createObjectURL(file);
    a.download = `attachments.zip`;
    a.click();
  }

  const value: AttachmentContextType = {
    loaderStatus,
    refreshDataSync,
    queryAttachments,
    deleteAttachment,
    exportAttachments
  };

  return <AttachmentContext.Provider value={value}>{children}</AttachmentContext.Provider>;
};

export const useAttachmentContext = (): AttachmentContextType => {
  const context = useContext(AttachmentContext);
  if (!context) {
    throw new Error("useAttachmentContext must be used within an AttachmentProvider");
  }
  return context;
};
