'use client'
import { useAgentContext } from '@/contexts/agent-context';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const agentContext = useAgentContext();

  useEffect(() => {
    if (agentContext.agents.length > 0)
      if (localStorage.getItem('currentAgentId') && agentContext.agents.find(agent => agent.id === localStorage.getItem('currentAgentId'))) {
        redirect(`/admin/agent/${localStorage.getItem('currentAgentId')}/general`);
      } else {
        redirect(`/admin/agent/${agentContext.agents[0].id}/general`);
      }
  }, [agentContext.agents]);
  
}
