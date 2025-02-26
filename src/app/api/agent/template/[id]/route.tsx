import { AgentStatus } from "@/data/client/models";
import ServerAgentRepository from "@/data/server/server-agent-repository";
import {  auditLog, authorizeRequestContext, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
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
   
            const templatesRepo =  new ServerAgentRepository(requestContext.databaseIdHash, 'templates');
            const templateToDelete = await templatesRepo.findOne({ id: recordLocator });
            if(!templateToDelete){
                return Response.json({ message: "No template found with id: " + recordLocator, status: 404 }, {status: 404});
            }

            templateToDelete.status = AgentStatus.Deleted
            templatesRepo.upsert({ id: recordLocator }, templateToDelete);

            auditLog({
                eventName: 'deleteTemplate',
                recordLocator: JSON.stringify({ id: recordLocator })
            }, request, requestContext, saasContext);


            return Response.json({ message: 'Template deleted', status: 200 }, {status: 200});
        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 500 }, {status: 500});
    }
}
