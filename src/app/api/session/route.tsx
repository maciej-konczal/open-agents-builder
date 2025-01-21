import { SessionDTO, sessionDTOSchema } from "@/data/dto";
import ServerSessionRepository from "@/data/server/server-session-repository";
import { authorizeRequestContext, genericGET, genericPUT } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const inputObj = (await request.json())
    const apiResult = await genericPUT<SessionDTO>(inputObj, sessionDTOSchema, new ServerSessionRepository(requestContext.databaseIdHash), 'id');
    return Response.json(apiResult, { status: apiResult.status });

}

export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    return Response.json(await genericGET<SessionDTO>(request, new ServerSessionRepository(requestContext.databaseIdHash)));
}
