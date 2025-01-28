import { AgentDTO, agentDTOSchema } from "@/data/dto";
import ServerAgentRepository from "@/data/server/server-agent-repository";
import { authorizeRequestContext, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const inputObj = (await request.json())
    const apiResult = await genericPUT<AgentDTO>(inputObj, agentDTOSchema, new ServerAgentRepository(requestContext.databaseIdHash), 'id');

    const saasContext = await authorizeSaasContext(request); // authorize SaaS context
    if (saasContext.apiClient) {
        saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
           eventName: 'createAgent',
           databaseIdHash: requestContext.databaseIdHash,
           params: {
                inputObj
           }
       });
    }
    return Response.json(apiResult, { status: apiResult.status });

}

export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    return Response.json(await genericGET<AgentDTO>(request, new ServerAgentRepository(requestContext.databaseIdHash)));
}
