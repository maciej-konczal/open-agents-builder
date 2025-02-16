import { CalendarEventDTO, calendarEventDTOSchema } from "@/data/dto";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import { authorizeRequestContext, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { detailedDiff } from "deep-object-diff";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContex = await authorizeSaasContext(request);
    
    return Response.json(await genericGET<CalendarEventDTO>(request, new ServerCalendarRepository(requestContext.databaseIdHash, saasContex.isSaasMode ? saasContex.saasContex?.storageKey : null)));
}


export async function PUT(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContext = await authorizeSaasContext(request); // authorize SaaS context

    const inputObj = (await request.json())


    const eventsRepo = new ServerCalendarRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);
    const existingEvent = inputObj.id ? await eventsRepo.findOne({
        id: inputObj.id
    }) : null;

    const apiResult = await genericPUT<CalendarEventDTO>(inputObj, calendarEventDTOSchema, eventsRepo, 'id');
    if (saasContext.apiClient) {
        if (!existingEvent) {
            saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
                eventName: 'createEvent',
                databaseIdHash: requestContext.databaseIdHash,
                params: {
                        recordLocator: { id: apiResult.data.id }, 
                        ...inputObj
                    }
                });
        } else {
            const changes = existingEvent ?  detailedDiff(existingEvent, apiResult.data as CalendarEventDTO) : {};
            saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
                eventName: 'updateEvent',
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