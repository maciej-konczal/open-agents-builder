"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, TrashIcon } from "lucide-react";
import { NoRecordsAlert } from "@/components/shared/no-records-alert";
import { useShortMemoryContext } from "@/contexts/short-memory-context";
import { getErrorMessage } from "@/lib/utils";

// For table display
type PreviewRecord = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embeddingPreview?: number[];
  similarity?: number;
};

// For file listing
type ShortMemoryFile = {
  file: string;
  displayName: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
};

/**
 * Extended Admin page for ShortMemory:
 * 1. Lists files with item counts and metadata.
 * 2. Clicking "View Records" opens a dialog that shows records in a table (paginated or vector search).
 * 3. Shows a loader/spinner when records are being fetched.
 * 4. Hitting 'Enter' in the vector search input triggers the search automatically.
 */
export default function ShortMemoryFilesPage() {
  const { t } = useTranslation();
  const shortMemoryContext = useShortMemoryContext();

  // Searching the list of files
  const [query, setQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Pagination for the file listing
  const [limit] = useState(6);
  const [offset, setOffset] = useState(0);

  // The array of files with metadata
  const [files, setFiles] = useState<ShortMemoryFile[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // For record preview
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [records, setRecords] = useState<PreviewRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);

  // Basic pagination or topK for the records preview
  const [recordOffset, setRecordOffset] = useState(0);
  const recordPageSize = 5;

  // If using vector search, we store a "searchQuery"
  const [recordSearchQuery, setRecordSearchQuery] = useState("");

  // We track whether we are in "vector search mode"
  const [isVectorSearchMode, setIsVectorSearchMode] = useState(false);

  // Separate loading state for the records table in the dialog
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  // ---------- Searching the file list with a debounce ----------
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timerId = setTimeout(() => {
      setOffset(0);
      loadFiles(true);
    }, 400);
    setDebounceTimer(timerId);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [query, debounceTimer]);

  /**
   * Load the list of short-memory files.
   */
  async function loadFiles(reset?: boolean) {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const nextOffset = reset ? 0 : offset;
      const resp = await shortMemoryContext.queryFiles({
        limit,
        offset: nextOffset,
        query,
      });

      const formattedFiles = resp.files.map(file => ({
        file: file.file,
        displayName: file.displayName || file.file.replace(/\.json$/, ''),
        itemCount: file.itemCount,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        lastAccessed: file.lastAccessed
      }));

      if (reset) {
        setFiles(formattedFiles);
      } else {
        setFiles(prev => [...prev, ...formattedFiles]);
      }
      setOffset(nextOffset + limit);
      setHasMore(resp.hasMore);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Load more files when scrolling
   */
  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    await loadFiles(false);
  };

  /**
   * Show the preview dialog for a specific file.
   * We initially load the first page of records from that file.
   */
  const handleShowDetails = async (fileName: string) => {
    setSelectedFileName(fileName);
    setRecords([]);
    setRecordsTotal(0);
    setRecordOffset(0);
    setRecordSearchQuery("");
    setIsVectorSearchMode(false);

    // Open the dialog
    setPreviewDialogOpen(true);

    // Then load the first page
    await loadRecords(fileName, 0, "");
  };

  /**
   * Delete an entire short-memory file from the server.
   */
  const handleDelete = async (fileName: string) => {
    if (!confirm(t("Are you sure you want to delete this file?") || "")) return;
    try {
      await shortMemoryContext.deleteFile(fileName);
      setFiles((prev) => prev.filter((f) => f.file !== fileName));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // ---------- Loading records from the new route /[filename]/records ----------
  async function loadRecords(
    fileName: string,
    newOffset: number,
    vectorQuery: string,
    isAppend = false
  ) {
    setIsRecordsLoading(true);
    try {
      const result = await shortMemoryContext.listRecords(fileName, {
        limit: recordPageSize,
        offset: newOffset,
        embeddingSearch: vectorQuery || undefined, // If empty, normal listing
        topK: recordPageSize,
      });
      if (isAppend) {
        setRecords((prev) => [...prev, ...result.rows]);
      } else {
        setRecords(result.rows);
      }
      setRecordsTotal(result.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRecordsLoading(false);
    }
  }

  /**
   * Handle normal pagination inside the preview dialog (no vector search).
   */
  const loadMoreRecords = async () => {
    if (isVectorSearchMode) return; // In vector mode, we do topK only
    const newOff = recordOffset + recordPageSize;
    if (newOff >= recordsTotal) return;
    setRecordOffset(newOff);
    // Append
    await loadRecords(selectedFileName, newOff, "", true);
  };

  /**
   * Trigger vector search inside the dialog (server side).
   * We'll reset offset to 0, run topK results, show them in the table.
   */
  const doVectorSearch = async () => {
    setRecordOffset(0);
    setIsVectorSearchMode(true);
    await loadRecords(selectedFileName, 0, recordSearchQuery, false);
  };

  /**
   * Reset out of vector search mode into normal list mode again.
   */
  const resetSearchMode = async () => {
    setRecordSearchQuery("");
    setIsVectorSearchMode(false);
    setRecordOffset(0);
    await loadRecords(selectedFileName, 0, "");
  };

  // ---------- RENDER ----------
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("Short-term Memory Files")}</h1>
        <div className="w-1/3">
          <Input
            type="search"
            placeholder={t("Search files...") || ""}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {files.length === 0 && !isLoading ? (
        <NoRecordsAlert 
          title={t("No files found")}
        >
          {t("Try adjusting your search or create a new file.")}
        </NoRecordsAlert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.file} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{file.displayName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {file.itemCount !== undefined
                        ? t("{{count}} records", { count: file.itemCount })
                        : t("Unknown count")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.file)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {t("Created")}: {new Date(file.createdAt).toLocaleString()}
                  </p>
                  <p>
                    {t("Updated")}: {new Date(file.updatedAt).toLocaleString()}
                  </p>
                  {file.lastAccessed && (
                    <p>
                      {t("Last accessed")}: {new Date(file.lastAccessed).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleShowDetails(file.file)}
                  >
                    {t("View Records")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore && (
            <div className="flex justify-center col-span-full">
              <Button variant="ghost" onClick={loadMore} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("Load More")
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog: Show records from a single file in a table with pagination / vector search */}
      {previewDialogOpen && (
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="p-4 max-w-5xl">
            <h3 className="text-md font-bold mb-4">
              {t("ShortMemory File")}: {selectedFileName}
            </h3>

            <div className="mb-4 flex items-center gap-2">
              {isVectorSearchMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={resetSearchMode}>
                    {t("Back to normal listing")}
                  </Button>
                  <div className="text-xs text-gray-500">
                    {t("Showing topK vector matches only.")}
                  </div>
                </>
              ) : (
                <>
                  <Input
                    className="text-sm"
                    placeholder={t("Enter a vector search query...") || ""}
                    value={recordSearchQuery}
                    onChange={(e) => setRecordSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        doVectorSearch();
                      }
                    }}
                  />
                  <Button variant="default" size="sm" onClick={doVectorSearch}>
                    {t("Vector Search")}
                  </Button>
                </>
              )}
            </div>

            {/* Loader for records */}
            {isRecordsLoading && (
              <div className="flex items-center justify-center my-2">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">{t("Loading records...")}</span>
              </div>
            )}

            {/* Table of records */}
            <div className="overflow-auto max-h-96 border p-2 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-2 text-left">{t("ID")}</th>
                    <th className="p-2 text-left">{t("Metadata")}</th>
                    <th className="p-2 text-left">{t("Content")}</th>
                    <th className="p-2 text-left">{t("Embedding (partial)")}</th>
                    <th className="p-2 text-left">{t("Similarity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2 align-top w-24 font-bold">{r.id}</td>
                      <td className="p-2 align-top">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(r.metadata ?? {}, null, 2)}
                        </pre>
                      </td>
                      <td className="p-2 align-top">
                        {r.content?.length > 100
                          ? r.content.slice(0, 100) + "…"
                          : r.content}
                      </td>
                      <td className="p-2 align-top">
                        [{r.embeddingPreview?.join(", ")}]
                      </td>
                      <td className="p-2 align-top">
                        {r.similarity ? r.similarity.toFixed(3) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more if in normal mode (no vector search) */}
            {!isVectorSearchMode && !isRecordsLoading && recordOffset + recordPageSize < recordsTotal && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" size="sm" onClick={loadMoreRecords}>
                  {t("Load more")}
                </Button>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button onClick={() => setPreviewDialogOpen(false)}>
                {t("Close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
