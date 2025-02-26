import ServerResultRepository from "@/data/server/server-result-repository";
import {  auditLog, authorizeRequestContext, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { NextRequest } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: { id: number }} ) {
    const recordLocator = params.id;
    const requestContext = await authorizeRequestContext(request);
    const saasContext = await authorizeSaasContext(request);

    if(!recordLocator){
        return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
    } else { 

        auditLog({
            eventName: 'deleteResult',
            recordLocator: JSON.stringify({ id: recordLocator})
        }, null, requestContext, saasContext);
                
        return Response.json(await genericDELETE(request, new ServerResultRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null), { sessionId: recordLocator}));
    }
}