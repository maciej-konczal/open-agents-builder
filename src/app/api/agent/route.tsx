import { AgentDTO, agentDTOSchema } from "@/data/dto";
import ServerAgentRepository from "@/data/server/server-agent-repository";
import { authorizeRequestContext, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { detailedDiff } from "deep-object-diff";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContext = await authorizeSaasContext(request); // authorize SaaS context

    const inputObj = (await request.json())


    const agentsRepo = new ServerAgentRepository(requestContext.databaseIdHash);
    const existingAgent = inputObj.id ? await agentsRepo.findOne({
        id: inputObj.id
    }) : null;

    if(saasContext.isSaasMode) {
        if (!existingAgent && ((saasContext.saasContex?.currentQuota.allowedAgents || 0) > 0 && (saasContext.saasContex?.currentUsage.usedAgents || 0) > (saasContext.saasContex?.currentQuota.allowedAgents || 0))) {
            return Response.json({
                message: "You have reached the limit of allowed agents",
                status: 403
            }, { status: 403 });
        }        
    }

    const apiResult = await genericPUT<AgentDTO>(inputObj, agentDTOSchema, new ServerAgentRepository(requestContext.databaseIdHash), 'id');

    if (saasContext.apiClient) {
        if (!existingAgent) {
            saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
                eventName: 'createAgent',
                databaseIdHash: requestContext.databaseIdHash,
                params: {
                        recordLocator: { id: apiResult.data.id }, 
                        displayName: inputObj.displayName,
                        prompt: inputObj.prompt,
                        tools: inputObj.tools,
                        events: inputObj.events
                    }
                });
        } else {
            const changes = existingAgent ?  detailedDiff(existingAgent, apiResult.data as AgentDTO) : {};
            saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
                eventName: 'updateAgent',
                databaseIdHash: requestContext.databaseIdHash,
                params: {
                        recordLocator: { id: apiResult.data.id }, 
                        diff: changes
                    }
                });        
        }
    }
    return Response.json(apiResult, { status: apiResult.status });

}

export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    return Response.json(await genericGET<AgentDTO>(request, new ServerAgentRepository(requestContext.databaseIdHash)));
}
