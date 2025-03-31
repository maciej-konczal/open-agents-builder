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
import InfiniteScroll from "@/components/infinite-scroll";
import JsonView from "@uiw/react-json-view";
import { useCopyToClipboard } from "react-use";

import { useShortMemoryContext } from "@/contexts/short-memory-context";
import { ChatMessageMarkdown } from "@/components/chat-message-markdown";
import { getErrorMessage, safeJsonParse } from "@/lib/utils";

/**
 * Admin page for ShortMemory. Allows:
 * - Searching
 * - Infinite scroll
 * - Viewing content in a dialog
 * - Deleting files
 */
export default function ShortMemoryFilesPage() {
  const { t } = useTranslation();
  const shortMemoryContext = useShortMemoryContext();

  const [query, setQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Pagination
  const [limit] = useState(6);
  const [offset, setOffset] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState<any | null>(null);
  const [, copyToClipboard] = useCopyToClipboard();

  // Debounce search input
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timerId = setTimeout(() => {
      setOffset(0);
      loadFiles(true);
    }, 400);
    setDebounceTimer(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /**
   * Loads files from short-memory. If `reset` is true, offset is reset to 0.
   */
  const loadFiles = async (reset?: boolean) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const nextOffset = reset ? 0 : offset;
      const resp = await shortMemoryContext.queryFiles({
        limit,
        offset: nextOffset,
        query,
      });

      if (reset) {
        setFiles(resp.files);
      } else {
        setFiles((prev) => [...prev, ...resp.files]);
      }

      setOffset(nextOffset + limit);
      setHasMore(resp.hasMore);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load more for infinite scrolling.
   */
  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    await loadFiles(false);
  };

  /**
   * Show file details in a dialog. We parse JSON if possible.
   */
  const handleShowDetails = async (fileName: string) => {
    try {
      const text = await shortMemoryContext.getFileContent(fileName);
      setSelectedFileName(fileName);

      const asJson = safeJsonParse(text, null);
      setSelectedFileContent(asJson ?? text);

      setPreviewDialogOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  /**
   * Delete a file from the server.
   */
  const handleDelete = async (fileName: string) => {
    if (!confirm(t("Are you sure you want to delete this file?") || "")) return;

    try {
      await shortMemoryContext.deleteFile(fileName);
      setFiles((prev) => prev.filter((f) => f !== fileName));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Input
        placeholder={t("Search short-memory stores - by file name only...") || ""}
        onChange={(e) => setQuery(e.target.value)}
        value={query}
      />

      {files.length === 0 && !isLoading && (
        <NoRecordsAlert title={t("No short-memory files found")}>
          {t("Try adjusting your search.")}
        </NoRecordsAlert>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="p-4 max-w-3xl">
          <h3 className="text-sm font-bold mb-2">
            {t("File name")}: {selectedFileName}
          </h3>
          <div className="flex scrollbar overflow-y-auto h-96 w-full bg-gray-50 border">
            {typeof selectedFileContent === "object" && selectedFileContent !== null ? (
              <JsonView
                value={selectedFileContent}
                style={{ padding: 12, fontSize: 12 }}
                collapsed={2}
              />
            ) : (
              <ChatMessageMarkdown>
                {String(selectedFileContent ?? "")}
              </ChatMessageMarkdown>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                copyToClipboard(
                  typeof selectedFileContent === "object"
                    ? JSON.stringify(selectedFileContent, null, 2)
                    : String(selectedFileContent ?? "")
                );
                toast.success(t("Content copied to clipboard"));
              }}
            >
              {t("Copy")}
            </Button>
            <Button onClick={() => setPreviewDialogOpen(false)}>
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {files.map((file) => (
          <Card key={file}>
            <CardHeader>
              <CardTitle className="text-sm truncate">{t('Vector Store')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm truncate">{t('ID')}: {file}</div>
              <div className="flex justify-end gap-2">
              
                <Button variant="default" size="sm" onClick={() => handleShowDetails(file)}>
                  {t("Details")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(file)}>
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <InfiniteScroll
        hasMore={hasMore}
        isLoading={isLoading}
        next={loadMore}
        threshold={1}
      >
        {hasMore && (
          <div className="flex justify-center">
            <Loader2 className="my-4 h-8 w-8 animate-spin" />
          </div>
        )}
      </InfiniteScroll>
    </div>
  );
}
