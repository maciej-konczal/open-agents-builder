import { ApiEncryptionConfig } from '@/data/client/base-api-client';
import { Agent, DataLoadingStatus } from '@/data/client/models';
import { AgentDTO } from '@/data/dto';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DatabaseContext } from './db-context';
import { AgentApiClient } from '@/data/client/agent-api-client';
import { SaaSContext } from './saas-context';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { nanoid } from 'nanoid';
import { ChatApiClient } from '@/data/client/chat-api-client';


interface ChatContextType {
    agent: Agent | null;
    loadAgent: (id: string, databaseIdHash: string) => Promise<Agent>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const { t } = useTranslation();

    const loadAgent = async (id: string, databaseIdHash: string): Promise<Agent> => {
        const client = new ChatApiClient();
        const dto = await client.agent(id);
        const agt = Agent.fromDTO(dto);
        setAgent(agt);
        return agt;        
    }
    return (
        <ChatContext.Provider value={{ 
            agent,
            loadAgent
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