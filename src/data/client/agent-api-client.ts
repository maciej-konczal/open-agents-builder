import { ApiClient, ApiEncryptionConfig } from "./base-api-client";
import { SaaSContextType } from "@/contexts/saas-context";
import { AgentDTO, AgentDTOEncSettings } from "../dto";
import { DatabaseContextType } from "@/contexts/db-context";

export type GetAgentsResponse = AgentDTO[];
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


export class AgentApiClient extends ApiClient {
    constructor(baseUrl: string, dbContext?: DatabaseContextType | null, saasContext?: SaaSContextType | null, encryptionConfig?: ApiEncryptionConfig) {
      super(baseUrl, dbContext, saasContext, encryptionConfig);
    }
  
    async get(agentId?:string): Promise<GetAgentsResponse> {
      if (agentId)
        return this.request<GetAgentsResponse>('/api/agent?id=' + encodeURIComponent(agentId) , 'GET', AgentDTOEncSettings) as Promise<GetAgentsResponse>;
    else 
        return this.request<GetAgentsResponse>('/api/agent' , 'GET', AgentDTOEncSettings) as Promise<GetAgentsResponse>;
    }
  
    async put(record: PutAgentRequest): Promise<PutAgentResponse> {
      return this.request<PutAgentResponse>('/api/agent', 'PUT', AgentDTOEncSettings, record) as Promise<PutAgentResponse>;
    }

    async delete(record: AgentDTO): Promise<DeleteAgentResponse> {
      return this.request<DeleteAgentResponse>('/api/agent/' + record.id, 'DELETE', { ecnryptedFields: [] }) as Promise<DeleteAgentResponse>;
    }    
}