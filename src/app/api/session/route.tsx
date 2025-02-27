import { SessionDTO } from "@/data/dto";
import ServerSessionRepository from "@/data/server/server-session-repository";
import { authorizeSaasContext, genericGET } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContex = await authorizeSaasContext(request);
        
        return Response.json(await genericGET<SessionDTO>(request, new ServerSessionRepository(requestContext.databaseIdHash, saasContex.isSaasMode ? saasContex.saasContex?.storageKey : null)));
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}
