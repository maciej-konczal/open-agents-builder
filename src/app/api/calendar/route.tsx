import { CalendarEventDTO, calendarEventDTOSchema } from "@/data/dto";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import { auditLog, authorizeRequestContext, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { detailedDiff } from "deep-object-diff";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContex = await authorizeSaasContext(request);
        
        return Response.json(await genericGET<CalendarEventDTO>(request, new ServerCalendarRepository(requestContext.databaseIdHash, saasContex.isSaasMode ? saasContex.saasContex?.storageKey : null)));
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}


export async function PUT(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request); // authorize SaaS context

        const inputObj = (await request.json())


        const eventsRepo = new ServerCalendarRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);
        const existingEvent = inputObj.id ? await eventsRepo.findOne({
            id: inputObj.id
        }) : null;

        const apiResult = await genericPUT<CalendarEventDTO>(inputObj, calendarEventDTOSchema, eventsRepo, 'id');
        if (saasContext.apiClient && apiResult.status === 200) {
            if (!existingEvent) {
                auditLog({
                    eventName: 'createCalendarEvent',
                    diff: JSON.stringify(inputObj),
                    recordLocator: JSON.stringify({ id: apiResult.data.id })
                }, request, requestContext, saasContext);
            } else {
                const changes = existingEvent ?  detailedDiff(existingEvent, apiResult.data as CalendarEventDTO) : {};
                auditLog({
                    eventName: 'updateCalendarEvent',
                    diff: JSON.stringify(changes),
                    recordLocator: JSON.stringify({ id: apiResult.data.id })
                }, request, requestContext, saasContext);
            }
        }
        return Response.json(apiResult, { status: apiResult.status });
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}