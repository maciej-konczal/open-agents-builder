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
        try { 
            chatContext.loadAgent(params.id, params.databaseIdHash);
        } catch (error) {
            console.error(error);
        }
    }, [params.id, params.databaseIdHash]);

    return (
        <>
            <Chat />
        </>
    )
}