"use client";

import React, { useCallback, useState } from "react";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileIcon, TrashIcon, UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AttachmentApiClient } from "@/data/client/attachment-api-client";
import { AttachmentDTO, StorageSchemas } from "@/data/dto";
import { getCurrentTS, getErrorMessage } from "@/lib/utils";
import { DatabaseContextType } from "@/contexts/db-context";
import { SaaSContextType } from "@/contexts/saas-context";
import { useAttachmentContext } from "@/contexts/attachment-context";

export enum FileUploadStatus {
  QUEUED = "QUEUED",
  UPLOADING = "UPLOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface UploadedFile {
  id: string;
  file: File;
  status: FileUploadStatus;
  uploaded: boolean;
  dto: AttachmentDTO;
}

type FileUploaderProps = {
  dbContext?: DatabaseContextType | null;
  saasContext?: SaaSContextType | null;
  onUploaded?: (uploadedAttachment: AttachmentDTO) => void;
};

export function AttachmentUploader({ dbContext, saasContext, onUploaded }: FileUploaderProps) {
  const { t } = useTranslation();


  const attContext = useAttachmentContext();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles
      .filter((f) => f.type === "" || f.type.startsWith("image") || f.type.startsWith("text") || f.type.startsWith("application") || f.type.startsWith("application/vnd.openxmlformats") || f.type.startsWith("application/pdf"))
      .map((file) => ({
        id: nanoid(),
        file,
        status: FileUploadStatus.QUEUED,
        uploaded: false,
        dto: {
          id: undefined,
          displayName: file.name,
          description: "",
          mimeType: file.type,
          size: file.size,
          storageKey: uuidv4(),
          createdAt: getCurrentTS(),
          updatedAt: getCurrentTS(),
        } as AttachmentDTO,
      }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => onUpload(f));
  }, []);

  const onUpload = useCallback(
    async (fileToUpload: UploadedFile) => {
      fileToUpload.status = FileUploadStatus.UPLOADING;
      setUploadedFiles((prev) => [...prev]);

      try {
        const formData = new FormData();
        formData.append("file", fileToUpload.file);
        formData.append("attachmentDTO", JSON.stringify(fileToUpload.dto));

        const apiClient = new AttachmentApiClient(
          "",
          "",
          dbContext,
          saasContext,
          { useEncryption: false }
        );

        const result = await apiClient.put(formData);
        if (result.status === 200) {
          console.log("Attachment saved", result);
          fileToUpload.status = FileUploadStatus.SUCCESS;
          fileToUpload.uploaded = true;
          fileToUpload.dto = result.data; // zaktualizowany AttachmentDTO z bazy
          toast.success(t("File uploaded: ") + fileToUpload.dto.displayName);

          if (onUploaded) {
            onUploaded(fileToUpload.dto);
          }
        } else {
          console.log("File upload error", result);
          toast.error(t("File upload error ") + result.message);
          fileToUpload.status = FileUploadStatus.ERROR;
        }
      } catch (error) {
        console.log("File upload error", error);
        toast.error(t("File upload error ") + getErrorMessage(error));
        fileToUpload.status = FileUploadStatus.ERROR;
      } finally {
        setUploadedFiles((prev) => [...prev]);
      }
    },
    [dbContext, saasContext, onUploaded, t]
  );

  const removeFileFromQueue = useCallback((file: UploadedFile) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id)); // add remove from server
    try {
      attContext.deleteAttachment(file.dto);
    } catch (e) {
      console.error("Error deleting attachment", e);
      toast.error(t("Error deleting attachment"));
    }
  }, []);

  return (
    <div className="">
      <label className="block font-medium mb-3 flex"><UploadIcon className="mr-2"/> {t("Upload files")}</label>
      <Input
        type="file"
        accept="image/*; text/*; application/*; application/vnd.openxmlformats/*; application/pdf"
        multiple
        onChange={handleFileSelect}
      />
      <div className="mt-2 space-y-2">
        {uploadedFiles.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <span className="flex-1 text-sm flex">
              <FileIcon className="w-4 h-4 mr-2"/> {f.file.name} - {f.status}
            </span>
            {f.status === FileUploadStatus.ERROR && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onUpload(f)}
              >
                {t("Retry")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => removeFileFromQueue(f)}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <div className="text-xs p-2">
          {t('Supported file types: images, text files, ZIP archives, PDFs, Word documents, Excel spreadsheets, PowerPoint presentations. When uploading documents including text (PDF, Office, text, CSV, ZIP archives...) - files will converted to Markdown and available in the Flows and for other AI tools. ')}
        </div>
      </div>
    </div>
  );
}
