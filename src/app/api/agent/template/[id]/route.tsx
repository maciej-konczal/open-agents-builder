import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerSessionRepository from "@/data/server/server-session-repository";
import {  authorizeRequestContext, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: { id: string }} ) {
    try {
        const recordLocator = params.id;
        const requestContext = await authorizeRequestContext(request);

        if(!recordLocator){
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        } else { 

            const saasContext = await authorizeSaasContext(request); // authorize SaaS context
            if (saasContext.apiClient) {
                saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
                   eventName: 'deleteTemplate',
                   databaseIdHash: requestContext.databaseIdHash,
                   params: {
                        id: recordLocator
                   }
               });
            }            
            return Response.json(await genericDELETE(request, new ServerAgentRepository(requestContext.databaseIdHash, '', 'templates'), { id: recordLocator}));
        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 500 }, {status: 500});
    }
}
