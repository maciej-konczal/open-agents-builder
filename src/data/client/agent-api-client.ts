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

    async *execStream(
      agentId: string,
      flowId: string,
      input: any,
      execMode: string,
      headers: Record<string, string>
    ): AsyncGenerator<any, void, unknown> {
      const requestBody = JSON.stringify({ flow: flowId, input, execMode, outputMode: "stream" });
    
      if (!headers) headers = {};
      this.setAuthHeader('', headers);

      const response = await fetch(`/api/agent/${agentId}/exec/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: requestBody,
      });
    
      if (!response.body) {
        throw new Error("Response body is null");
      }
    
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let braceCount = 0;
      let isInString = false;
    
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
    
        accumulated += decoder.decode(value, { stream: true });
    
        let jsonStart = -1;
        for (let i = 0; i < accumulated.length; i++) {
          const char = accumulated[i];
    
          if (char === `"`) {
            // Toggle string mode (ignore escaped quotes)
            isInString = !isInString;
          }
    
          if (!isInString) {
            if (char === "{") {
              if (braceCount === 0) jsonStart = i; // Mark the start of a new JSON object
              braceCount++;
            } else if (char === "}") {
              braceCount--;
            }
          }
    
          // When braceCount reaches 0, we have a full JSON object
          if (braceCount === 0 && jsonStart !== -1) {
            const jsonChunk = accumulated.slice(jsonStart, i + 1);
            accumulated = accumulated.slice(i + 1); // Remove parsed JSON from buffer
    
            try {
              yield JSON.parse(jsonChunk);
            } catch (error) {
              console.error("JSON Parsing Error:", error, "Chunk:", jsonChunk);
            }
    
            jsonStart = -1; // Reset for the next JSON object
            i = -1; // Restart parsing from the beginning of the new accumulated string
          }
        }
      }
    }
    


}