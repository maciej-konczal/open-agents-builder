import { AuditDTO, auditDTOSchema, KeyDTO, keyDTOSchema } from "@/data/dto";
import ServerAuditRepository from "@/data/server/server-audit-repository";
import { auditLog, AuthorizedRequestContext, AuthorizedSaaSContext, authorizeRequestContext, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse, userAgent } from "next/server";

export async function PUT(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request); // authorize SaaS context

        const inputObj = (await request.json())
        const valRes = auditDTOSchema.safeParse(inputObj);
        if(!valRes.success) {
            return Response.json({ message: 'Invalid input', issues: valRes.error.issues }, { status: 400 });
        }

        const logObj = valRes.data;
        const apiResult = await auditLog(logObj, request, requestContext, saasContext);

        return Response.json(apiResult, { status: apiResult.status });
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}


export async function GET(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request);
        const now = new Date();
        let dbPartition = `${now.getFullYear()}-${now.getMonth()}`; // partition daily

        if (request.nextUrl.searchParams.has('partition')) {
            dbPartition = request.nextUrl.searchParams.get('partition') as string;
        }
        return Response.json(await genericGET<AuditDTO>(request, new ServerAuditRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, 'audit', dbPartition)));
    } catch (error) {
        return Response.json({ message: 'Error accessing audit partition ' + getErrorMessage(error), status: 400 });
        console.error(error);
    }
}
