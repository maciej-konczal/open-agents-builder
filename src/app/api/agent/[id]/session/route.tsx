import ServerSessionRepository from "@/data/server/server-session-repository";
import { authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { ApiError } from "next/dist/server/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string }}, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request, true);
        const repo = new ServerSessionRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

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
        return Response.json(new ApiError(499, getErrorMessage(error)), { status: 499 });
    }
}
