import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import ServerProductRepository from "@/data/server/server-product-repository";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { authorizeSaasContext, authorizeStorageSchema } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, response: NextResponse) {
  try {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContext = await authorizeSaasContext(request);
    const storageSchema = await authorizeStorageSchema(request, response);
    
    const repo = new ServerAttachmentRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, storageSchema);

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