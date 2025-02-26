import ServerResultRepository from "@/data/server/server-result-repository";
import { authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string }}, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request);
        const repo = new ServerResultRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

        const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '');
        const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '');
        const orderBy = request.nextUrl.searchParams.get('orderBy') ?? 'createdAt';
        const query = request.nextUrl.searchParams.get('query') ?? '';
  
        const results = await repo.queryAll(params.id, {
            limit,
            offset,
            orderBy,
            query
        });
        return Response.json(results);
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}
