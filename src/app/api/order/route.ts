// /app/api/order/route.ts

import { orderDTOSchema } from "@/data/dto"; 
import ServerOrderRepository from "@/data/server/server-order-repository";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";

export async function GET(request: NextRequest) {
  const requestContext = await authorizeRequestContext(request);
  const saasContext = await authorizeSaasContext(request);
  
  const repo = new ServerOrderRepository(requestContext.databaseIdHash, "commerce", saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const orders = await repo.findAll({ filter: { id } });
    return Response.json(orders);
  } else {
    const all = await repo.findAll();
    return Response.json(all);
  }
}

export async function PUT(request: NextRequest) {
  const requestContext = await authorizeRequestContext(request);
  const body = await request.json();
  const saasContext = await authorizeSaasContext(request);

  const parseResult = orderDTOSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json({ status: 400, error: parseResult.error }, { status: 400 });
  }
  const repo = new ServerOrderRepository(requestContext.databaseIdHash, "commerce", saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

  // upsert => by id
  const result = await repo.upsert({ id: body.id }, parseResult.data);
  return Response.json({ status: 200, data: result }, { status: 200 });
}
