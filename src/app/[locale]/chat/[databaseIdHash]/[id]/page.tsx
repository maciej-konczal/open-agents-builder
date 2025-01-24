'use client'

import { Chat } from "@/components/chat";
import { useChatContext } from "@/contexts/chat-context";
import { useChat } from "ai/react";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function ChatPage({children,
    params,
  }: {
    children: React.ReactNode;
    params: { id: string, databaseIdHash: string, locale: string };
  }) {
    const chatContext = useChatContext();
    const { t } = useTranslation();
    const { messages, append, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat",
      })
    
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

    useEffect(() => {
        if (chatContext.agent){
          append({
            id: nanoid(),
            role: "user",
            content: t("Lets chat")
          }, {
            headers: getSessionHeaders()
          })
        }
      }, [chatContext.agent]);

    return (
        <>
            <Chat 
                headers={getSessionHeaders()} 
                welcomeMessage={chatContext.agent?.options?.welcomeMessage ?? ''}
                messages={messages}
                handleInputChange={handleInputChange}
                isLoading={isLoading}
                handleSubmit={handleSubmit}
                input={input}
                displayName={chatContext.agent?.displayName ?? ''}
            />
        </>
    )
}