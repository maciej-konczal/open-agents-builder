import { ApiClient } from "./base-api-client";
import { AgentDTO, AgentDTOEncSettings } from "../dto";

export type GetAgentsResponse = AgentDTO;
export type PutAgentRequest = AgentDTO;

export type PutAgentResponseSuccess = {
  message: string;
  data: AgentDTO;
  status: 200;
};

export type DeleteAgentResponse = {
  message: string;
  status: 200;
};

export type PutAgentResponseError = {
  message: string;
  status: 400;
  issues?: any[];
};

export type PutAgentResponse = PutAgentResponseSuccess | PutAgentResponseError;


export class ChatApiClient extends ApiClient {
  databaseIdHash: string;
    constructor(baseUrl: string, databaseIdHash: string) {
      super(baseUrl, null, null, { useEncryption: false });
      this.databaseIdHash = databaseIdHash;
    }
  
    async agent(agentId:string): Promise<GetAgentsResponse> {
      const agents = await (this.request<GetAgentsResponse>('/api/chat/agent/' + encodeURIComponent(agentId) , 'GET', AgentDTOEncSettings, null, undefined, undefined, {
          'Database-Id-Hash': this.databaseIdHash,
      }) as Promise<GetAgentsResponse[]>);
      if (agents.length > 0) {
        return agents[0];
      } else {
        throw new Error('Agent not found');
      }
    }
  
}