import { CalendarEventDTO } from "@/data/dto";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import { authorizeRequestContext, authorizeSaasContext, genericGET } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContex = await authorizeSaasContext(request);
    
    return Response.json(await genericGET<CalendarEventDTO>(request, new ServerCalendarRepository(requestContext.databaseIdHash, saasContex.isSaasMode ? saasContex.saasContex?.storageKey : null)));
}
