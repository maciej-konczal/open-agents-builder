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
    constructor(databaseIdHash: string, baseUrl?: string) {
      super(baseUrl, null, null, { useEncryption: false });
      this.setDatabaseIdHash(databaseIdHash);
    }
  
    async agent(agentId:string): Promise<GetAgentsResponse> {
      return await (this.simpleRequest<GetAgentsResponse>('/api/chat/agent/' + encodeURIComponent(agentId) , 'GET') as Promise<GetAgentsResponse>);
    }
  
}