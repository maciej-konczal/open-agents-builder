export interface Agent {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  description: string;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  id: string;
}