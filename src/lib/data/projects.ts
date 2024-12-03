import { v4 as uuidv4 } from 'uuid';
import { Agent, CreateAgentInput, UpdateAgentInput } from '../types/project';

// Initial projects with GUIDs
export const projects: Agent[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Agent Alpha',
    description: 'Our first AI project',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '987fcdeb-51a2-43d7-9876-543210987001',
    name: 'Agent Beta',
    description: 'Advanced language model implementation',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
  },
];

export function getAgents(): Agent[] {
  return projects;
}

export function getAgent(id: string): Agent | undefined {
  return projects.find(project => project.id === id);
}

export function createAgent(input: CreateAgentInput): Agent {
  const now = new Date().toISOString();
  const newAgent: Agent = {
    id: uuidv4(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(newAgent);
  return newAgent;
}

export function updateAgent(input: UpdateAgentInput): Agent {
  const index = projects.findIndex(p => p.id === input.id);
  if (index === -1) {
    throw new Error('Agent not found');
  }

  const updatedAgent = {
    ...projects[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  
  projects[index] = updatedAgent;
  return updatedAgent;
}

export function deleteAgent(id: string): void {
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects.splice(index, 1);
  }
}