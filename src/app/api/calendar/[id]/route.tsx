import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import {  auditLog, authorizeRequestContext, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: { id: number }} ) {\
    try {
        const recordLocator = params.id;
        const requestContext = await authorizeRequestContext(request);
        const saasContext = await authorizeSaasContext(request);

        if(!recordLocator){
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        } else { 

            auditLog({
                eventName: 'deleteCalendarEvent',
                recordLocator: JSON.stringify({ id: recordLocator})
            }, null, requestContext, saasContext);

            return Response.json(await genericDELETE(request, new ServerCalendarRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null), { id: recordLocator}));
        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    }     
}