import { AdminApiClient, ApiEncryptionConfig } from "./admin-api-client";
import { DatabaseContextType } from "@/contexts/db-context";
import { SaaSContextType } from "@/contexts/saas-context";

export type ElevenLabsTool = {
  name: string;
  webhook?: string;
  description: string;
  type?: "system";
  params?: {
    system_tool_type: string;
  };
  api_schema?: {
    url: string;
    method: string;
    request_body_schema: {
      type: string;
      properties: Record<
        string,
        {
          type: string;
          description: string;
          dynamic_variable: string;
          constant_value: string;
        }
      >;
      required: string[];
      description: string;
    };
  };
};

export type CreateElevenLabsAgentResponse = {
  agent_id: string;
  status: number;
};

export type CreateElevenLabsAgentRequest = {
  agentName: string;
  promptText: string;
  firstMessage: string;
  tools: ElevenLabsTool[];
};

export class ElevenLabsApiClient extends AdminApiClient {
  constructor(
    baseUrl: string,
    dbContext?: DatabaseContextType | null,
    saasContext?: SaaSContextType | null,
    encryptionConfig?: ApiEncryptionConfig
  ) {
    super(baseUrl, dbContext, saasContext, encryptionConfig);
  }

  async createAgent(
    request: CreateElevenLabsAgentRequest
  ): Promise<CreateElevenLabsAgentResponse> {
    return this.request<CreateElevenLabsAgentResponse>(
      "/api/elevenlabs",
      "POST",
      { encryptedFields: [] },
      request
    ) as Promise<CreateElevenLabsAgentResponse>;
  }
}
