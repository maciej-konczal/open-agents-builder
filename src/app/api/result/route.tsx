import { ResultDTO } from "@/data/dto";
import ServerResultRepository from "@/data/server/server-result-repository";
import { authorizeRequestContext, genericGET } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    return Response.json(await genericGET<ResultDTO>(request, new ServerResultRepository(requestContext.databaseIdHash)));
}
