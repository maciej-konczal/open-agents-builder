import React, { createContext, PropsWithChildren, useContext, useState } from 'react';
import { DatabaseContext } from './db-context';
import { ConfigContextType } from '@/contexts/config-context';
import { GetSaaSResponseSuccess, SaaSActivationResponse, SaasApiClient } from '@/data/client/saas-api-client';
import { SaaSDTO } from '@/data/dto';
import { validateTokenQuotas } from '@/lib/quotas';

let syncHandler = null;


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
    emailVerified: string | null;
    email: string | null;
    userId: string | null;
    saasToken: string | null;
    setSaasToken: (token: string) => void;
    refreshDataSync: string;
    loadSaaSContext: (saasToken: string) => Promise<void>;
    activateAccount: (saasToken: string) => Promise<SaaSActivationResponse>,
    checkQuotas: () => { status: number; message: string}
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
    emailVerified: null,
    email: null,
    userId: null,
    saasToken: null,
    refreshDataSync: '',
    setSaasToken: (token: string) => {},
    loadSaaSContext: async (saasToken: string) => {},
    activateAccount: async (saasToken: string) => { return { message: '', status: 200 } },
    checkQuotas: () => { return { message: '', status: 200 }}
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
    const [emailVerified, setEmailVerified] = useState<string | null>(null);
    const [refreshDataSync, setRefreshDataSync] = useState<string>('');

    const dbContext = useContext(DatabaseContext);


    const setupApiClient = async (config: ConfigContextType | null) => {
        const client = new SaasApiClient('', dbContext);
        return client;
    }

    const activateAccount = async (saasToken: string) => {
        const client = await setupApiClient(null);
        const response = await client.activate(saasToken) as SaaSActivationResponse;
        return response;
    }

    const checkQuotas =  (): {message: string, status: number} => {
        return validateTokenQuotas({
            currentQuota,
            currentUsage,
            emailVerified: emailVerified ?? null,
            email
        } as SaaSDTO);
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
            if (syncHandler) clearInterval(syncHandler);
            syncHandler = setInterval(() => {
                console.log('Refreshing SaaS data sync ...');
                setRefreshDataSync(new Date().toISOString());
            }, 1000 *  60 * 2); // refresh data every 2 minutes

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
            loadSaaSContext,
            emailVerified: emailVerified,
            refreshDataSync,
            activateAccount,
            checkQuotas
         }}>
            {children}
        </SaaSContext.Provider>
    );
};