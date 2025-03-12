"use client";

import { useContext, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoRecordsAlert } from "@/components/shared/no-records-alert";
import InfiniteScroll from "@/components/infinite-scroll";
import { Loader2, TrashIcon } from "lucide-react";

import { AttachmentDTO, PaginatedQuery, PaginatedResult } from "@/data/dto";
import { getErrorMessage } from "@/lib/utils";

import { useAttachmentContext } from "@/contexts/attachment-context";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from "@/contexts/saas-context";

import { AttachmentUploader } from "@/components/attachment-uploader";
import { Attachment } from "@/data/client/models";
import { ChatMessageMarkdown } from "@/components/chat-message-markdown";

export default function FilesPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const attachmentContext = useAttachmentContext();
    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);    

    const [queryParams, setQueryParams] = useState<PaginatedQuery>({
        limit: 6,
        offset: 0,
        query: "",
        orderBy: "createdAt",
    });
    const [debouncedQueryParams] = useDebounce(queryParams, 500);

    const [attachmentsData, setAttachmentsData] = useState<PaginatedResult<AttachmentDTO[]>>({
        rows: [],
        total: 0,
        limit: 6,
        offset: 0,
        orderBy: "createdAt",
        query: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 6;

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const response = await attachmentContext.queryAttachments({
                    limit: debouncedQueryParams.limit,
                    offset: 0,
                    orderBy: debouncedQueryParams.orderBy,
                    query: debouncedQueryParams.query,
                });
                setAttachmentsData({
                    ...response,
                    rows: response.rows,
                });
                setHasMore(response.rows.length < response.total);
            } catch (error) {
                toast.error(getErrorMessage(error));
            }
            setIsLoading(false);
        })();
    }, [debouncedQueryParams, attachmentContext.refreshDataSync]);

    useEffect(() => {
        setHasMore(attachmentsData.offset + attachmentsData.limit < attachmentsData.total);
    }, [attachmentsData]);

    const loadMore = async () => {
        if (isLoading) return;
        const newOffset = attachmentsData.offset + attachmentsData.limit;
        if (newOffset >= attachmentsData.total) {
            setHasMore(false);
            return;
        }
        setIsLoading(true);

        try {
            const response = await attachmentContext.queryAttachments({
                limit: pageSize,
                offset: newOffset,
                orderBy: attachmentsData.orderBy,
                query: attachmentsData.query,
            });

            setAttachmentsData((prev) => ({
                rows: [...prev.rows, ...response.rows],
                total: response.total,
                limit: prev.limit + response.limit,
                offset: newOffset,
                orderBy: prev.orderBy,
                query: prev.query,
            }));
            setHasMore(newOffset + response.limit < response.total);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
        setIsLoading(false);
    };

    const handleDelete = async (attachment: AttachmentDTO) => {
        if (!confirm(t("Are you sure you want to delete this attachment?") || "")) {
            return;
        }
        await attachmentContext.deleteAttachment(attachment);
        setAttachmentsData((prev) => ({
            ...prev,
            rows: prev.rows.filter((a) => a.storageKey !== attachment.storageKey),
            total: prev.total - 1,
        }));
    };

    return (
        <div className="space-y-6">
            <AttachmentUploader
                dbContext={dbContext}
                saasContext={saasContext}
                onUploaded={(uploaded) => {
                    setAttachmentsData((prev) => ({
                        ...prev,
                        rows: [uploaded, ...prev.rows],
                        total: prev.total + 1,
                    }));
                }}
            />

            <Input
                placeholder={t("Search attachments...") || ""}
                onChange={(e) =>
                    setQueryParams((prev) => ({
                        ...prev,
                        query: e.target.value,
                    }))
                }
                value={queryParams.query}
            />

            {attachmentsData.rows.length === 0 && !isLoading && (
                <NoRecordsAlert title={t("No attachments found")}>
                    {t("Try adjusting your search or upload new files.")}
                </NoRecordsAlert>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {attachmentsData.rows.map((attachment) => (
                    <Card key={attachment.storageKey}>
                        <CardHeader>
                            <CardTitle className="text-sm">
                                {attachment.displayName}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs">
                            <p><span className="font-bold">{t('Type')}:</span> {attachment.mimeType}</p>
                            {attachment.mimeType?.startsWith("image") && (
                                <img
                                    src={`/storage/attachment/${dbContext?.databaseIdHash}/${attachment.storageKey}`}
                                    alt={attachment.displayName}
                                    className="my-2 max-h-40 object-cover"
                                />
                            )}
                            {attachment.content && (
                                <ChatMessageMarkdown className="text-xs truncate">
                                    {attachment.content.length > 100 ? `${attachment.content.substring(0, 100)}...` : attachment.content}
                                </ChatMessageMarkdown>
                            )}
                            <div className="flex justify-end">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(attachment)}
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    {t("Delete")}
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
