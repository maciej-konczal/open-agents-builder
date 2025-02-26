// /app/api/order/route.ts

import { OrderDTO, orderDTOSchema } from "@/data/dto"; 
import ServerOrderRepository from "@/data/server/server-order-repository";
import { NextRequest, NextResponse } from "next/server";
import { auditLog, authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { detailedDiff } from "deep-object-diff";

export async function GET(request: NextRequest, response: NextResponse) {
  try {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContext = await authorizeSaasContext(request);
    const repo = new ServerOrderRepository(requestContext.databaseIdHash, 'commerce', saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const orderBy = url.searchParams.get("orderBy") ?? "createdAt";
    const id = url.searchParams.get("id") ?? undefined;
    const queryStr = url.searchParams.get("query") ?? "";
    const agentId = url.searchParams.get("agentId") ?? "";  

    let limit = 10;
    let offset = 0;
    if (limitParam && offsetParam) {
      limit = parseInt(limitParam, 10) || 10;
      offset = parseInt(offsetParam, 10) || 0;
    }
    const result = await repo.queryAll({ id, agentId, limit, offset, orderBy, query: queryStr });
    return Response.json(result);

  } catch (err) {
    return Response.json({ message: getErrorMessage(err), status: 500 }, { status: 500 });
  }
}


export async function PUT(request: NextRequest) {
    try {
        const requestContext = await authorizeRequestContext(request);
        const body = await request.json();
        const saasContext = await authorizeSaasContext(request);

        const parseResult = orderDTOSchema.safeParse(body);
        if (!parseResult.success) {
            return Response.json({ status: 400, error: parseResult.error }, { status: 400 });
        }
        const repo = new ServerOrderRepository(requestContext.databaseIdHash, "commerce", saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

        const existingOrder = await repo.findOne({ id: body.id });
        // upsert => by id
        const result = await repo.upsert({ id: body.id }, parseResult.data);
        if (!existingOrder) {
            auditLog({
                eventName: 'createOrder',
                diff: JSON.stringify(parseResult.data),
                recordLocator: JSON.stringify({ id: result.id })
            }, request, requestContext, saasContext);
        } else {
            const changes = existingOrder ?  detailedDiff(existingOrder, result as OrderDTO) : {};
            auditLog({
                eventName: 'updateOrder',
                diff: JSON.stringify(changes),
                recordLocator: JSON.stringify({ id: result.id })
            }, request, requestContext, saasContext);
        }
        return Response.json({ status: 200, data: result }, { status: 200 });
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}
