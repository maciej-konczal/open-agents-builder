"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, TrashIcon, Plus } from "lucide-react";
import { NoRecordsAlert } from "@/components/shared/no-records-alert";
import { useMemoryContext } from "@/contexts/memory-context";
import { getErrorMessage } from "@/lib/utils";
import { nanoid } from "nanoid";
import { Textarea } from "@/components/ui/textarea";
import { getEmbeddings } from "@/data/client/memory-api-client";

interface MemoryRecord {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// For table display
type PreviewRecord = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embeddingPreview?: number[];
  similarity?: number;
};

// For file listing
type MemoryFile = {
  file: string;
  displayName: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
};

// Add new types for record management
type RecordFormData = {
  content: string;
  metadata: string;
};

/**
 * Extended Admin page for Memory:
 * 1. Lists files with item counts and metadata.
 * 2. Clicking "View Records" opens a dialog that shows records in a table (paginated or vector search).
 * 3. Shows a loader/spinner when records are being fetched.
 * 4. Hitting 'Enter' in the vector search input triggers the search automatically.
 */
export default function MemoryFilesPage() {
  const { t } = useTranslation();
  const memoryContext = useMemoryContext();

  // Create store dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Records dialog state
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [recordsOffset, setRecordsOffset] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const recordPageSize = 10;

  // Record form state
  const [recordFormData, setRecordFormData] = useState({
    content: "",
    metadata: "",
  });

  // Load initial files
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async (forceRefresh = false) => {
    try {
      await memoryContext.loadFiles(forceRefresh);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(t("Are you sure you want to delete this file?") || "")) return;
    try {
      await memoryContext.deleteFile(fileName);
      await loadFiles(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const loadRecords = async (fileName: string, newOffset = 0) => {
    setIsRecordsLoading(true);
    try {
      const result = await memoryContext.searchRecords(fileName, {
        limit: recordPageSize,
        offset: newOffset,
      });
      setRecords(result.items);
      setHasMoreRecords(result.hasMore);
      setRecordsOffset(newOffset);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRecordsLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast.error(t("Store name is required"));
      return;
    }

    setIsCreating(true);
    try {
      await memoryContext.createStore(newStoreName);
      toast.success(t("Store created successfully"));
      setCreateDialogOpen(false);
      await loadFiles(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
      setNewStoreName("");
    }
  };

  const handleSaveRecord = async () => {
    try {
      // Validate content
      if (!recordFormData.content.trim()) {
        toast.error(t("Content is required"));
        return;
      }

      // Parse metadata if provided
      let metadata: Record<string, unknown> = {};
      if (recordFormData.metadata.trim()) {
        try {
          metadata = JSON.parse(recordFormData.metadata);
        } catch (error) {
          toast.error(t("Invalid metadata JSON"));
          return;
        }
      }

      // Generate embeddings
      const embeddings = await getEmbeddings(recordFormData.content);

      const entry = {
        id: nanoid(),
        content: recordFormData.content,
        metadata,
        embeddings,
      };

      // Save using the memory context
      await memoryContext.saveRecords(selectedFileName, [entry]);

      // Refresh the records list
      await loadRecords(selectedFileName);

      // Clear form
      setRecordFormData({ content: "", metadata: "" });
      toast.success(t("Record saved successfully"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("Memory Stores")}</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("Create Store")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Create New Store")}</DialogTitle>
              <DialogDescription>
                {t("Enter a name for the new store")}
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder={t("Store name")}
            />
            <DialogFooter>
              <Button
                onClick={handleCreateStore}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {t("Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!memoryContext.files?.files.length ? (
        <NoRecordsAlert
          title={t("No stores found")}
        >
          {t("Create your first store to get started")}
        </NoRecordsAlert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memoryContext.files.files.map((file) => (
            <div
              key={file.file}
              className="p-4 border rounded-lg bg-card"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{file.displayName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {file.itemCount} {t("records")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Created")}: {new Date(file.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Updated")}: {new Date(file.updatedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFile(file.displayName)}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFileName(file.displayName);
                    setRecordsDialogOpen(true);
                    loadRecords(file.displayName);
                  }}
                >
                  {t("View Records")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {t("Records for")} {selectedFileName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">{t("Add New Record")}</h4>
              <Textarea
                value={recordFormData.content}
                onChange={(e) =>
                  setRecordFormData({ ...recordFormData, content: e.target.value })
                }
                placeholder={t("Record content")}
              />
              <Textarea
                value={recordFormData.metadata}
                onChange={(e) =>
                  setRecordFormData({ ...recordFormData, metadata: e.target.value })
                }
                placeholder={t("Metadata (optional JSON)")}
              />
              <Button onClick={handleSaveRecord}>
                {t("Save Record")}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">{t("Existing Records")}</h4>
              {isRecordsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : records.length === 0 ? (
                <NoRecordsAlert
                  title={t("No records found")}
                >
                  {t("Add your first record to get started")}
                </NoRecordsAlert>
              ) : (
                <div className="space-y-2">
                  {records.map((record) => (
                    <div
                      key={record.id as string}
                      className="p-2 border rounded bg-muted"
                    >
                      <p className="font-mono text-sm">
                        {String(record.content)}
                      </p>
                      {record.metadata && (
                        <pre className="mt-1 text-xs text-muted-foreground">
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {hasMoreRecords && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        loadRecords(selectedFileName, recordsOffset + recordPageSize)
                      }
                    >
                      {t("Load More")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
