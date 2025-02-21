import { DatabaseContextType } from "@/contexts/db-context";
import { SaaSContextType } from "@/contexts/saas-context";
import { AttachmentDTO } from "../dto";
import { AdminApiClient } from "./admin-api-client";

export type PutAttachmentRequest = FormData | AttachmentDTO;

export type PutAttachmentResponseSuccess = {
  message: string;
  data: AttachmentDTO;
  status: 200;
};

export type DeleteAttachmentResponse = {
  message: string;
  status: 200;
};

export type PutAttachmentResponseError = {
  message: string;
  status: 400;
  issues?: any[];
};

export type PutAttachmentResponse = PutAttachmentResponseSuccess | PutAttachmentResponseError;

export class AttachmentApiClient extends AdminApiClient {
    constructor(baseUrl: string, dbContext?: DatabaseContextType | null, saasContext?: SaaSContextType | null, encryptionConfig?: ApiEncryptionConfig) {
      super(baseUrl, dbContext, saasContext, encryptionConfig);
    }

  
    async put(inputObject:PutAttachmentRequest): Promise<PutAttachmentResponse> {
      if (inputObject instanceof FormData) {
        return this.request<PutAttachmentResponse>('/api/attachment', 'PUT', { ecnryptedFields: [] }, null, inputObject as FormData) as Promise<PutAttachmentResponse>;
      } else {
        return this.request<PutAttachmentResponse>('/api/attachment', 'PUT', { ecnryptedFields: ['displayName'] }, inputObject as AttachmentDTO) as Promise<PutAttachmentResponse>;
      }
    }

    async get(attachment: AttachmentDTO): Promise<ArrayBuffer | undefined | null> {
      return this.getArrayBuffer('/api/attachment/' + attachment.storageKey);
    }

    async delete(attachment: AttachmentDTO): Promise<DeleteAttachmentResponse> {
      return this.request<DeleteAttachmentResponse>('/api/attachment/' + attachment.storageKey, 'DELETE', { ecnryptedFields: [] }) as Promise<DeleteAttachmentResponse>;
    }
    
  }