import { AdminApiClient, ApiEncryptionConfig } from "./admin-api-client";
import { SaaSContextType } from "@/contexts/saas-context";
import { AgentDTO, AgentDTOEncSettings, PaginatedQuery, PaginatedResult, ResultDTO, SessionDTO } from "../dto";
import { DatabaseContextType } from "@/contexts/db-context";
import { urlParamsForQuery } from "./base-api-client";
import axios from "axios";

export type GetResultResponse = PaginatedResult<ResultDTO[]>;
export type GetSessionResponse = PaginatedResult<SessionDTO[]>;
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


export class AgentApiClient extends AdminApiClient {
    constructor(baseUrl: string, dbContext?: DatabaseContextType | null, saasContext?: SaaSContextType | null, encryptionConfig?: ApiEncryptionConfig) {
      super(baseUrl, dbContext, saasContext, encryptionConfig);
    }
  
    async get(agentId?:string): Promise<GetAgentsResponse> {
      if (agentId)
        return this.request<GetAgentsResponse>('/api/agent?id=' + encodeURIComponent(agentId) , 'GET', AgentDTOEncSettings) as Promise<GetAgentsResponse>;
    else 
        return this.request<GetAgentsResponse>('/api/agent' , 'GET', AgentDTOEncSettings) as Promise<GetAgentsResponse>;
    }

    async results(agentId:string, { limit, offset, orderBy, query }: PaginatedQuery): Promise<GetResultResponse> {
      return this.request<GetResultResponse>('/api/agent/' + agentId + '/result?' + urlParamsForQuery({limit, offset, orderBy, query}) , 'GET', AgentDTOEncSettings) as Promise<GetResultResponse>;
    }

    async sessions(agentId:string, { limit, offset, orderBy, query }: PaginatedQuery): Promise<GetSessionResponse> {
      return this.request<GetSessionResponse>('/api/agent/' + agentId + '/session?' + urlParamsForQuery({limit, offset, orderBy, query}), 'GET', AgentDTOEncSettings) as Promise<GetSessionResponse>;
    }

    async put(record: PutAgentRequest): Promise<PutAgentResponse> {
      return this.request<PutAgentResponse>('/api/agent', 'PUT', AgentDTOEncSettings, record) as Promise<PutAgentResponse>;
    }

    async delete(record: AgentDTO): Promise<DeleteAgentResponse> {
      return this.request<DeleteAgentResponse>('/api/agent/' + record.id, 'DELETE', { ecnryptedFields: [] }) as Promise<DeleteAgentResponse>;
    }    


    async execSync(agentId:string, flowId: string, input: any, execMode: string, headers: Record<string, string>): Promise<any> {
      const requestBody = { flow: flowId, input, execMode, outputMode: '' };
      return this.request<any>('/api/agent/' + agentId + '/exec/', 'POST', AgentDTOEncSettings, requestBody, undefined, undefined, headers) as Promise<any>;
    }

    async execStream(
      agentId: string,
      flowId: string,
      input: any,
      execMode: string,
      headers: Record<string, string>
    ): Promise<AsyncGenerator<any, void, unknown>> {
      const requestBody = { flow: flowId, input, execMode, outputMode: "stream" };
    

      if (!headers) headers = {};
      this.setAuthHeader('', headers)

      const response = await axios({
        method: "post",
        url: `/api/agent/${agentId}/exec/`,
        headers,
        data: requestBody,
        responseType: "stream", // Enable streaming response
      });
    
      const reader = response.data.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
    
      async function* streamGenerator() {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
    
          accumulated += decoder.decode(value, { stream: true });
    
          // Process complete JSON lines
          const lines = accumulated.split("\n").filter(line => line.trim() !== "");
          for (const line of lines) {
            yield JSON.parse(line);
          }
    
          // Keep only the last incomplete line (if any)
          accumulated = accumulated.endsWith("\n") ? "" : lines.pop();
        }
      }
    
      return streamGenerator();
    }
    


}