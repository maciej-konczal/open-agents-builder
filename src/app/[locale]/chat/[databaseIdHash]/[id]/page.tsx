'use client'

import { Chat } from "@/components/Chat";
import { useChatContext } from "@/contexts/chat-context";
import { useEffect } from "react";

export default function ChatPage({children,
    params,
  }: {
    children: React.ReactNode;
    params: { id: string, databaseIdHash: string, locale: string };
  }) {
    const chatContext = useChatContext();

    useEffect(() => {
        chatContext.init(params.id, params.databaseIdHash);
    }, [params.id, params.databaseIdHash]);

    return (
        <>
            <Chat />
        </>
    )
}