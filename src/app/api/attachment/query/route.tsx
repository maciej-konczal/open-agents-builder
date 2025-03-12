import { NextRequest } from "next/server";

export async function GET(request: NextRequest, response: NextResponse) {
  try {
    const requestContext = await authorizeRequestContext(request, response);
    const repo = new ServerProductRepository(requestContext.databaseIdHash, 'commerce');

    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const orderBy = url.searchParams.get("orderBy") ?? "createdAt";
    const id = url.searchParams.get("id") ?? undefined;
    const queryStr = url.searchParams.get("query") ?? "";

    let limit = 10;
    let offset = 0;
    if (limitParam && offsetParam) {
      limit = parseInt(limitParam, 10) || 10;
      offset = parseInt(offsetParam, 10) || 0;
    }
    const result = await repo.queryAll({ id, limit, offset, orderBy, query: queryStr });
    return Response.json(result);

  } catch (err) {
    return Response.json({ message: getErrorMessage(err), status: 500 }, { status: 500 });
  }
}