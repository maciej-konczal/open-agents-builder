import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerSessionRepository from "@/data/server/server-session-repository";
import {  auditLog, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api"
import { getErrorMessage } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: { id: string }} ) {
    try {
        const recordLocator = params.id;
        const requestContext = await authorizeRequestContext(request);
        const saasContext = await authorizeSaasContext(request);

        const resultRepo = new ServerResultRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);
        const sessionRepo = new ServerSessionRepository (requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);
        const calendarRepo = new ServerCalendarRepository (requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

        await resultRepo.delete({ agentId: recordLocator });
        await sessionRepo.delete({ agentId: recordLocator });
        await calendarRepo.delete({ agentId: recordLocator });


        if(!recordLocator){
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        } else { 

            auditLog({
                eventName: 'deleteAgent',
                recordLocator: JSON.stringify({ id: recordLocator })
            }, request, requestContext, saasContext);

            return Response.json(await genericDELETE(request, new ServerAgentRepository(requestContext.databaseIdHash), { id: recordLocator}));
        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 500 }, {status: 500});
    }
}
