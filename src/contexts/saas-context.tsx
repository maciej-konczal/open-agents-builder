import React, { createContext, PropsWithChildren, useContext, useState } from 'react';
import { DatabaseContext } from './db-context';
import { ConfigContextType } from '@/contexts/config-context';
import { GetSaaSResponseSuccess, SaasApiClient } from '@/data/client/saas-api-client';


export interface SaaSContextType {
    currentQuota: {
        allowedAgents: number,
        allowedResults: number,
        allowedSessions: number,
        allowedDatabases: number,
        allowedUSDBudget: number,
        allowedTokenBudget: number
    },
    currentUsage: {
        usedAgents: number,
        usedResults: number,
        usedSessions: number,
        usedDatabases: number,
        usedUSDBudget: number,
        usedTokenBudget: number
    },
    emailVerfied: string | null;
    email: string | null;
    userId: string | null;
    saasToken: string | null;
    setSaasToken: (token: string) => void;
    loadSaaSContext: (saasToken: string) => Promise<void>;
}


export const SaaSContext = createContext<SaaSContextType>({
    currentQuota: {
        allowedAgents: 0,
        allowedResults: 0,
        allowedSessions: 0,
        allowedDatabases: 0,
        allowedUSDBudget: 0,
        allowedTokenBudget: 0
    },
    currentUsage: {
        usedAgents: 0,
        usedResults: 0,
        usedSessions: 0,
        usedDatabases: 0,
        usedUSDBudget: 0,
        usedTokenBudget: 0
    },
    emailVerfied: null,
    email: null,
    userId: null,
    saasToken: null,
    setSaasToken: (token: string) => {},
    loadSaaSContext: async (saasToken: string) => {}
});

export const SaaSContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [saasToken, setSaasToken] = useState<string | null>(null);
    const [currentQuota, setCurrentQuota] = useState({
        allowedAgents: 0,
        allowedResults: 0,
        allowedSessions: 0,
        allowedDatabases: 0,
        allowedUSDBudget: 0,
        allowedTokenBudget: 0
    });
    const [currentUsage, setCurrentUsage] = useState({
        usedAgents: 0,
        usedResults: 0,
        usedSessions: 0,
        usedDatabases: 0,
        usedUSDBudget: 0,
        usedTokenBudget: 0
    });
    const [email, setEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [emailVerfied, setEmailVerified] = useState<string | null>(null);

    const dbContext = useContext(DatabaseContext);


    const setupApiClient = async (config: ConfigContextType | null) => {
        const client = new SaasApiClient('', dbContext);
        return client;
    }

    const loadSaaSContext = async (saasToken: string) => {
        if (!process.env.NEXT_PUBLIC_SAAS) return;
        if(saasToken || saasToken !== '') {
            if (typeof localStorage !== 'undefined')
                localStorage.setItem('saasToken', saasToken);
            setSaasToken(saasToken);
        } else {
            if (typeof localStorage !== 'undefined')
                setSaasToken(localStorage.getItem('saasToken'));
        }

        const client = await setupApiClient(null);
        const saasAccount = await client.get(saasToken && saasToken !== null ? saasToken : '', false) as GetSaaSResponseSuccess;

        if(saasAccount.status !== 200) {
//            toast.error('Failed to load SaaS account. Your account may be disabled or the token is invalid.');
        } else {
            setCurrentQuota(saasAccount.data.currentQuota);
            setCurrentUsage(saasAccount.data.currentUsage);
            setEmailVerified(saasAccount.data.emailVerified || null);
            setEmail(saasAccount.data.email || null);
            setUserId(saasAccount.data.userId || null);
            if(typeof localStorage !== 'undefined') {
                localStorage.setItem('saasToken', saasAccount.data.saasToken); // if the context was loaded by databaseIdHash this is important step
            }
        }
    
    } 

    return (
        <SaaSContext.Provider value={{ 
            currentQuota,
            currentUsage,
            saasToken,
            email,
            userId,
            setSaasToken,
            loadSaaSContext
         }}>
            {children}
        </SaaSContext.Provider>
    );
};