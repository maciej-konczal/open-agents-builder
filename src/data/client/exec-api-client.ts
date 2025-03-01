import { BaseApiClient } from "./base-api-client";
import { AgentDTO } from "../dto";
import { ExecInitFormType } from "@/contexts/chat-context";

export type GetAgentsResponse = {
  message: string;
  data: AgentDTO;
  status: 200;
};;
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

export type SaveSessionResponse = {
  message: string;
  status: number;
  id?: string
};

export type PutAgentResponse = PutAgentResponseSuccess | PutAgentResponseError;


export class ExecApiClient extends BaseApiClient {
    constructor(databaseIdHash: string, baseUrl?: string) {
      super(baseUrl, databaseIdHash);
    }
    async agent(agentId:string): Promise<GetAgentsResponse> {
      return await (this.request<GetAgentsResponse>('/api/exec/agent/' + encodeURIComponent(agentId) , 'GET') as Promise<GetAgentsResponse>);
    }

    async saveInitForm(sessionId: string, formData: ExecInitFormType): Promise<SaveSessionResponse> {
      return await this.request<SaveSessionResponse>('/api/exec/session/' + encodeURIComponent(sessionId), 'POST', {}, formData) as SaveSessionResponse;
    }


  
}