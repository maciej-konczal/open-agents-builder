import ServerSessionRepository from "@/data/server/server-session-repository";
import { authorizeRequestContext } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { ApiError } from "next/dist/server/api-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string }}, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const repo = new ServerSessionRepository(requestContext.databaseIdHash);

    try {
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
        return Response.json(new ApiError(500, getErrorMessage(error)), { status: 500 });
    }
}
