import { Agent } from '@/data/client/models';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatApiClient } from '@/data/client/chat-api-client';


interface ChatContextType {
    databaseIdHash: string;
    locale: string;
    setDatabaseIdHash: (databaseIdHash: string) => void;
    agent: Agent | null;
    init: (id: string, databaseIdHash: string, locale: string) => Promise<Agent>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [databaseIdHash, setDatabaseIdHash] = useState<string>('');
    const [locale, setLocale] = useState<string>('en');
    const { t } = useTranslation();

    const init = async (id: string, databaseIdHash: string, locale: string): Promise<Agent> => {
        const client = new ChatApiClient(databaseIdHash);
        setDatabaseIdHash(databaseIdHash);
        setLocale(locale);

        const dto = await client.agent(id);
        const agt = Agent.fromDTO(dto);
        setAgent(agt);
        return agt;        
    }
    return (
        <ChatContext.Provider value={{ 
            agent,
            locale,
            init,
            databaseIdHash,
            setDatabaseIdHash
            }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChatContext = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatContext must be used within an ChatProivder');
    }
    return context;
};