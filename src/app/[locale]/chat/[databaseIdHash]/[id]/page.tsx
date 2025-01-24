'use client'

import { Chat } from "@/components/chat";
import { useChatContext } from "@/contexts/chat-context";
import { nanoid } from "nanoid";
import { useEffect } from "react";

export default function ChatPage({children,
    params,
  }: {
    children: React.ReactNode;
    params: { id: string, databaseIdHash: string, locale: string };
  }) {
    const chatContext = useChatContext();

    const getSessionHeaders = () => {
        return {
            'Database-Id-Hash': chatContext.databaseIdHash,
            'Agent-Id': chatContext.agent?.id ?? '',
            'Agent-Locale': chatContext.locale,
            'Agent-Session-Id': chatContext.sessionId
        }
    }
    
    useEffect(() => {
        chatContext.init(params.id, params.databaseIdHash, params.locale, nanoid() /** generate session id */);
    }, [params.id, params.databaseIdHash, params.locale]);

    return (
        <>
            <Chat headers={getSessionHeaders()} apiUrl="/api/chat" />
        </>
    )
}