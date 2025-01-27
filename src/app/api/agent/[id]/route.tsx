import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerSessionRepository from "@/data/server/server-session-repository";
import {  authorizeRequestContext, genericDELETE } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";

export async function DELETE(request: Request, { params }: { params: { id: string }} ) {
    try {
        const recordLocator = params.id;
        const requestContext = await authorizeRequestContext(request);

        const resultRepo = new ServerResultRepository(requestContext.databaseIdHash);
        const sessionRepo = new ServerSessionRepository (requestContext.databaseIdHash);

        await resultRepo.delete({ agentId: recordLocator });
        await sessionRepo.delete({ agentId: recordLocator });


        if(!recordLocator){
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        } else { 
            return Response.json(await genericDELETE(request, new ServerAgentRepository(requestContext.databaseIdHash), { id: recordLocator}));
        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 500 }, {status: 500});
    }
}
