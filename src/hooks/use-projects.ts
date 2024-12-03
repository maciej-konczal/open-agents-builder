'use client';

import { useCallback } from 'react';
import { getAgents, createAgent, updateAgent, deleteAgent } from '@/lib/data/projects';
import { CreateAgentInput, UpdateAgentInput } from '@/lib/types/project';

export function useAgents() {
  const projects = getAgents();

  const addAgent = useCallback((input: CreateAgentInput) => {
    return createAgent(input);
  }, []);

  const editAgent = useCallback((input: UpdateAgentInput) => {
    return updateAgent(input);
  }, []);

  const removeAgent = useCallback((id: string) => {
    deleteAgent(id);
  }, []);

  return {
    projects,
    addAgent,
    editAgent,
    removeAgent,
  };
}