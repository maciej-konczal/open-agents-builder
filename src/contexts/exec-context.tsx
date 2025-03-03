import { Agent } from '@/data/client/models';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExecApiClient } from '@/data/client/exec-api-client';
import { error } from 'console';

export type ExecInitFormType = {
    userName: string;
    userEmail: string;
    acceptTerms: boolean;
    agentId?: string;
}

export interface ExecContextType {
    initFormRequired: boolean;
    initFormDone: boolean;
    setInitFormDone: (done: boolean) => void;
    databaseIdHash: string;
    sessionId: string
    locale: string;
    setDatabaseIdHash: (databaseIdHash: string) => void;
    setSessionId: (sessionId: string) => void;
    agent: Agent | null;
    init: (id: string, databaseIdHash: string, locale: string, sessionId: string) => Promise<Agent>;
    saveInitForm: (formData: ExecInitFormType) => void;
}

const ChatContext = createContext<ExecContextType | undefined>(undefined);

export const ExecProvider = ({ children }: { children: ReactNode }) => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [databaseIdHash, setDatabaseIdHash] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [locale, setLocale] = useState<string>('en');
    const [initFormRequired, setInitFormRequired] = useState<boolean>(false);
    const [initFormDone, setInitFormDone] = useState<boolean>(false);
    const { t } = useTranslation();

    const init = async (id: string, databaseIdHash: string, locale: string, sessionId: string): Promise<Agent> => {
        const client = new ExecApiClient(databaseIdHash);
        setDatabaseIdHash(databaseIdHash);
        setSessionId(sessionId);
        setLocale(locale);

        const response = await client.agent(id);

        if (response.status === 200) {
            const agt = Agent.fromDTO(response.data);
            setAgent(agt);

            if (agt.options?.collectUserEmail || agt.options?.mustConfirmTerms) {
                setInitFormRequired(true);
            } else {
                setInitFormRequired(false);
            }

            return agt;        
        } else {
            throw new Error(t(response.message));
        }
    }

    const saveInitForm = (formData: ExecInitFormType) => {
        const client = new ExecApiClient(databaseIdHash);
        return client.saveInitForm(sessionId, { ...formData, agentId: agent?.id ?? '' });
        // save the form data
    }
    return (
        <ChatContext.Provider value={{ 
            agent,
            locale,
            init,
            databaseIdHash,
            setDatabaseIdHash,
            sessionId,
            setSessionId,
            initFormRequired,
            initFormDone,
            setInitFormDone,
            saveInitForm
            }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useExecContext = (): ExecContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useExecContext must be used within an ExecProvider');
    }
    return context;
};