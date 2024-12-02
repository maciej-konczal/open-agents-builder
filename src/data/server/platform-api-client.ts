import { ApiClient } from "@/data/client/base-api-client";
import { GetSaasResponse, GetSaaSResponseSuccess } from "../client/saas-api-client";
import { StatDTO } from "../dto";


type UniversalApiResult = {
    status: number;
    data?: any;
    message?: string;
}

const qr = (emailHash?: string|null, apiKey?: string|null) => {

    if (emailHash) {
        return `?emailHash=${encodeURIComponent(emailHash)}`
    } else {
        if (apiKey) {
            return '?apiKey=' + encodeURIComponent(apiKey);
        }
    }

    return '';
}
export class PlatformApiClient extends ApiClient {
    apiKey: string;
    constructor(saasToken: string) {
        const saasPlatformUrl = process.env.SAAS_PLATFORM_URL || 'http://localhost:3001'
        super(saasPlatformUrl);
        this.apiKey = saasToken;
    }

    async account({ emailHash, apiKey}:{
        emailHash?: string|null;
        apiKey?: string|null;
    }): Promise<GetSaasResponse> {
        return this.request<GetSaasResponse>('/api/users/me' + qr(emailHash, apiKey), 'GET') as Promise<GetSaasResponse>;
    }

    async storeTerm(emailHash:string, term: {
        content: string;
        name: string;
        email: string;
        signedAt: string,
        code: string
    }): Promise<UniversalApiResult> {
        return this.request<UniversalApiResult>('/api/terms' + qr(emailHash, this.apiKey), 'POST', { ecnryptedFields: [] }, term) as Promise<UniversalApiResult>;
    }

    async saveEvent(emailHash:string, event: {
        emailHash: string;
        eventName: string;
        params?: any | null | undefined;
        createdAt?: Date | null | undefined;
    }): Promise<UniversalApiResult> {
        return this.request<UniversalApiResult>('/api/events' + qr(emailHash, this.apiKey), 'POST', { ecnryptedFields: [] }, event) as Promise<UniversalApiResult>;
    }

    async saveStats(emailHash:string, stat: StatDTO & {
        emailHash: string;
    }): Promise<UniversalApiResult> {
        return this.request<UniversalApiResult>('/api/stats?emailHash=' + encodeURIComponent(emailHash), 'POST', { ecnryptedFields: [] }, stat) as Promise<UniversalApiResult>;
    }

    async newDatabase(dbData: {
        emailHash: string;
        createdAt: string;
    }): Promise<UniversalApiResult> {
        return this.request<UniversalApiResult>('/api/db/new?apiKey=' + encodeURIComponent(this.apiKey), 'POST', { ecnryptedFields: [] }, dbData) as Promise<UniversalApiResult>;
    }

}
