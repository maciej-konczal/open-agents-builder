
'use client'

import { Chat } from "@/components/chat"
import { ChatContext, ChatContextProvider } from "@/contexts/chat-context"

// part of bundle size optimization (https://github.com/CatchTheTornado/doctor-dok/issues/67)
// const DynamicRecordsWrapper = dynamic(() => import('@/components/records-wrapper'), { ssr: false });
// const DynamicRecordContextProvider = dynamic(() => import('@/contexts/record-context'), { ssr: false });
// const DynamicChatContextProvider = dynamic(() => import('@/contexts/chat-context'), { ssr: false });
// const DynamicFolderContextProvider = dynamic(() => import('@/contexts/folder-context'), { ssr: false });

export default function ChatPage() {
    return (
        <ChatContextProvider>
            <Chat></Chat>

        </ChatContextProvider>
    )

}
