'use client'
import { useAgentContext } from '@/contexts/agent-context';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const agentContext = useAgentContext();
  useEffect(() => {
    agentContext.listAgents();
  }, []);

  useEffect(() => {
    if (agentContext.agents.length > 0)
      redirect(`/agent/${agentContext.agents[0].id}/general`);
  }, [agentContext.agents]);
  
}
