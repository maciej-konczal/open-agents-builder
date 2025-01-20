import { ApiEncryptionConfig } from '@/data/client/base-api-client';
import { Agent, DataLoadingStatus } from '@/data/client/models';
import { AgentDTO } from '@/data/dto';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DatabaseContext } from './db-context';
import { AgentApiClient } from '@/data/client/agent-api-client';
import { SaaSContext } from './saas-context';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';


interface AgentContextType {
    current: Agent | null;
    agents: Agent[];
    updateAgent: (agent: Agent) => Promise<Agent>;
    newAgent: () => Agent;
    listAgents: () => Promise<Agent[]>;
    setCurrent: (agent: Agent | null) => void;
    setAgents: (agents: Agent[]) => void;
    loaderStatus: DataLoadingStatus;

}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
    const [current, setCurrent] = useState<Agent | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);
    const { t } = useTranslation();

    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);

    const setupApiClient = async () => {
        const encryptionConfig: ApiEncryptionConfig = {
            secretKey: dbContext?.masterKey,
            useEncryption: false // TODO: add a env variable config for this
        };
        const client = new AgentApiClient('', dbContext, saasContext, encryptionConfig);
        return client;
    }        

    const updateAgent = async (agent:Agent): Promise<Agent> => {
        try {
            const client = await setupApiClient();
            const agentDTO = agent.toDTO(); // DTOs are common ground between client and server
            const response = await client.put(agentDTO);
            const newRecord = typeof agent?.id  === 'undefined'
            if (response.status !== 200) {
                console.error('Error adding agent:', response.message);
                toast.error(t('Error adding agent'));

                return agent;
            } else {
                const updatedAgent = Object.assign(agent, { id: response.data.id });
                setAgents(
                    newRecord ? [...agents, updatedAgent] :
                    agents.map(pr => pr.id === agent.id ?  agent : pr)
                )
                return updatedAgent;
            }
        } catch (error) {
            console.error('Error adding folder record:', error);
            toast.error(t('Error adding folder record'));
            return agent;
        }
    };

    const newAgent = (): Agent => {
        return new Agent(
            {
                id: 'new',
                displayName: ('Add new agent ...'),
                prompt: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                options: null,
                exoectedResult: '',
                safetyRules: null
            }
        )
    }

    const listAgents = async (): Promise<Agent[]> => {
        const client = await setupApiClient();
        setLoaderStatus(DataLoadingStatus.Loading);
        try {
            const apiResponse = await client.get();
            const fetchedAgents = apiResponse.map((folderDTO: AgentDTO) => Agent.fromDTO(folderDTO));
            setAgents(fetchedAgents);
            setLoaderStatus(DataLoadingStatus.Success);

            if (fetchedAgents.length === 0) {
                fetchedAgents.push(newAgent());
            }

            let defaultAgent:Agent|null = fetchedAgents.length > 0 ? fetchedAgents[0] : null;
            if (!current) {
                if (typeof localStorage !== 'undefined') {
                    const agentId = localStorage.getItem('currentAgentId');
                    if (agentId) {
                        defaultAgent = fetchedAgents.find((f) => f.id === agentId) || null;
                    }
                }
            }  
            setCurrent(defaultAgent) // we should store the current folder id and set to the current one
            return fetchedAgents;
        } catch(error) {
            setLoaderStatus(DataLoadingStatus.Error);
            throw (error)
        };        
    }

    return (
        <AgentContext.Provider value={{ 
            current, 
            agents, 
            setCurrent, 
            setAgents,
            updateAgent,
            listAgents,
            newAgent,
            loaderStatus
            }}>
            {children}
        </AgentContext.Provider>
    );
};

export const useAgentContext = (): AgentContextType => {
    const context = useContext(AgentContext);
    if (context === undefined) {
        throw new Error('useAgentContext must be used within an AgentProvider');
    }
    return context;
};