import { NextRequest } from "next/server";

export async function precheckAPIRequest(request:NextRequest): Promise<{ apiRequest: boolean, jwtToken: string }> {
    const authorizationHeader = request.headers.get('Authorization');
    let jwtToken = authorizationHeader?.replace('Bearer ', '');
    const isThisAPIRequest = jwtToken?.startsWith('ad_key_') ?? false;

    if (isThisAPIRequest) {
        const lio = jwtToken?.lastIndexOf('_');
        jwtToken = jwtToken?.replace('ad_key_', '').slice(0, lio) ?? undefined;
        if (!authorizationHeader) {
            throw new Error('Unauthorized. Invalid API Key');
        }
    }

    return {
        apiRequest: isThisAPIRequest,
        jwtToken: jwtToken as string
    }
}