import { ApiEncryptionConfig } from '@/data/client/admin-api-client';
import { Agent, DataLoadingStatus, Session, Result } from '@/data/client/models';
import { AgentDTO, PaginatedQuery, PaginatedResult } from '@/data/dto';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DatabaseContext } from './db-context';
import { AgentApiClient, DeleteAgentResponse } from '@/data/client/agent-api-client';
import { SaaSContext } from './saas-context';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { nanoid } from 'nanoid';
import { AuditContext } from './audit-context';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';

export type AgentStatusType = {
    id: string;
    message: string;
    type: string;
}

interface AgentContextType {
    current: Agent | null;
    agents: Agent[];
    results: PaginatedResult<Result[]>;
    agentResults: (agentId: string, { limit, offset, orderBy,  query} :  PaginatedQuery) => Promise<PaginatedResult<Result[]>>;
    sessions: PaginatedResult<Session[]>;
    agentSessions: (agentId: string, { limit, offset, orderBy,  query} :  PaginatedQuery) => Promise<PaginatedResult<Session[]>>;
    updateAgent: (agent: Agent, setAsCurrent: boolean) => Promise<Agent>;
    newAgent: () => Agent;
    newFromTemplate: (template: Agent) => Agent;
    listAgents: (currentAgentId?:string) => Promise<Agent[]>;
    setCurrent: (agent: Agent | null) => void;
    setAgents: (agents: Agent[]) => void;
    loaderStatus: DataLoadingStatus;
    status: AgentStatusType | null
    setStatus: (status: AgentStatusType | null) => void;
    removeStatus (id: string): void;
    deleteAgent: (agent: Agent) => Promise<DeleteAgentResponse>;
    agentDeleteDialogOpen: boolean;
    setAgentDeleteDialogOpen: (value: boolean) => void;

}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
    const [current, setCurrent] = useState<Agent | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [results, setResults] = useState<PaginatedResult<Result[]>>({ rows: [], total: 0, limit: 0, offset: 0, orderBy: '', query: '' });
    const [sessions, setSessions] = useState<PaginatedResult<Session[]>>({ rows: [], total: 0, limit: 0, offset: 0, orderBy: '', query: '' });
    const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);
    const [agentDeleteDialogOpen, setAgentDeleteDialogOpen] = useState<boolean>(false);
    const auditContext = useContext(AuditContext);

    const { t } = useTranslation();

    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);


    const [status, setStatus] = useState<AgentStatusType | null>(null);

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

        const prevRecord = agents.find(r => r.id === agent.id);
        const changes = prevRecord ?  detailedDiff(prevRecord, agent) : {};
        
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

            auditContext?.record({ eventName: newRecord ? 'addAgent' : 'updateAgent', recordLocator: JSON.stringify({ id: agent.id }), encryptedDiff: JSON.stringify(changes) })

            return updatedAgent;
        }

    };

    const newFromTemplate = (template: Agent): Promise<Agent> => {
        const newAgent = new Agent(
            {
                id: 'new',
                displayName: t('New from template: ') + template.displayName,
                prompt: template.prompt,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                options: template.options,
                expectedResult: template.expectedResult,
                safetyRules: template.safetyRules
            } as Agent
        )

        return updateAgent(newAgent, true);
    }

    const newAgent = (): Agent => {
        return new Agent(
            {
                id: 'new',
                displayName: t('Add new agent ...'),
                prompt: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                options: null,
                expectedResult: '',
                safetyRules: null
            }
        )
    }

    const deleteAgent = async (agent: Agent): Promise<DeleteAgentResponse> => {
        const client = await setupApiClient();
        const response = await client.delete(agent.toDTO());
        if (response.status !== 200) {
            console.error('Error deleting agent:', response.message);
            toast.error(t('Error deleting agent'));
        } else {
            auditContext?.record({ eventName: 'deleteAgent', recordLocator: agent.id  })

            setAgents(agents.filter(pr => pr.id !== agent.id));
            toast.success(t('Agent deleted'));
        }

        return response;
    }

    const agentResults = async (agentId: string, { limit, offset, orderBy,  query} :  PaginatedQuery): Promise<PaginatedResult<Result[]>> => {
        const client = await setupApiClient();
        const response = await client.results(agentId, { limit, offset, orderBy, query });
        setResults({
            ...response,
            rows: response.rows.map((r: any) => Result.fromDTO(r))
        });

        return results;
    }
    const agentSessions = async (agentId: string, { limit, offset, orderBy,  query} :  PaginatedQuery): Promise<PaginatedResult<Session[]>> => {
        const client = await setupApiClient();
        const response = await client.results(agentId, { limit, offset, orderBy,  query});
        setSessions({
            ...response,
            rows: response.rows.map((r: any) => Session.fromDTO(r))
        });
        
        return sessions
    }    

    const listAgents = async (currentAgentId?:string): Promise<Agent[]> => {
        setStatus(null);
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

    const removeStatus = (id: string) => {  
        if (status?.id === id) {
            setStatus(null);
        }
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
                loaderStatus,
                status,
                setStatus,
                removeStatus,
                results,
                agentResults,
                sessions,
                agentSessions,
                deleteAgent,
                agentDeleteDialogOpen,
                setAgentDeleteDialogOpen,
                newFromTemplate
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