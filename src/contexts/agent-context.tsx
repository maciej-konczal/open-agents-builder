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


interface AgentContextType {
    current: Agent | null;
    agents: Agent[];
    updateAgent: (agent: Agent, setAsCurrent: boolean) => Promise<Agent>;
    newAgent: () => Agent;
    listAgents: (currentAgentId?:string) => Promise<Agent[]>;
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

    const updateAgent = async (agent:Agent, setAsCurrent: boolean = true): Promise<Agent> => {

        const client = await setupApiClient();
        const agentDTO = agent.toDTO(); // DTOs are common ground between client and server
        const newRecord = typeof agent?.id  === 'undefined' || agent.id === 'new';

        if (newRecord) agentDTO.id = nanoid();
        const response = await client.put(agentDTO);

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
            if (setAsCurrent) setCurrent(updatedAgent);
            return updatedAgent;
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
                expectedResult: '',
                safetyRules: null
            }
        )
    }

    const listAgents = async (currentAgentId?:string): Promise<Agent[]> => {
        const client = await setupApiClient();
        setLoaderStatus(DataLoadingStatus.Loading);
        try {
            const apiResponse = await client.get();
            const fetchedAgents = apiResponse.map((folderDTO: AgentDTO) => Agent.fromDTO(folderDTO));
            setAgents(fetchedAgents);
            setLoaderStatus(DataLoadingStatus.Success);
            fetchedAgents.push(newAgent());

            let defaultAgent:Agent|null = fetchedAgents.length > 0 ? fetchedAgents[fetchedAgents.length-1] : null;
            if (!current) {
                if (typeof localStorage !== 'undefined') {
                    const agentId = localStorage.getItem('currentAgentId');
                    if (agentId) {
                        defaultAgent = fetchedAgents.find((f) => f.id === agentId) || null;
                    }
                }
            }
            if (currentAgentId) { // force to switch to this agent
                defaultAgent = fetchedAgents.find((f) => f.id === currentAgentId) || null;
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