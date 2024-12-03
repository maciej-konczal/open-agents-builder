import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Agent {
    id: number;
    name: string;
    // Add other agent properties here
}

interface AgentContextType {
    current: Agent | null;
    agents: Agent[];
    newAgent: (defaultName: string) => void;
    setCurrent: (agent: Agent | null) => void;
    setAgents: (agents: Agent[]) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
    const [current, setCurrent] = useState<Agent | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);

    const newAgent = (defaultName: string) => {
        const newAgent: Agent = {
            id: agents.length + 1,
            name: defaultName,
        };
        setAgents([...agents, newAgent]);
        setCurrent(newAgent);
    };

    return (
        <AgentContext.Provider value={{ 
            current, 
            agents, 
            setCurrent, 
            setAgents,
            newAgent
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