import { ProductDTO, productDTOSchema } from "@/data/dto";
import ServerProductRepository from "@/data/server/server-product-repository";
import { NextRequest, NextResponse } from "next/server";
import { genericGET, genericPUT } from "@/lib/generic-api";
import { authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";

export async function GET(request: NextRequest, response: NextResponse) {
  const requestContext = await authorizeRequestContext(request, response);
  return Response.json(
    await genericGET<ProductDTO>(request, new ServerProductRepository(requestContext.databaseIdHash))
  );
}

export async function PUT(request: NextRequest, response: NextResponse) {
  const requestContext = await authorizeRequestContext(request, response);
  const saasContext = await authorizeSaasContext(request);

  const body = await request.json();
  const repo = new ServerProductRepository(requestContext.databaseIdHash);

  const existing = body.id ? await repo.findOne({ id: body.id }) : null;

  const parseResult = productDTOSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json({ status: 400, error: parseResult.error }, { status: 400 });
  }

  const result = await genericPUT<ProductDTO>(body, productDTOSchema, repo, "id");
  return Response.json(result, { status: result.status });
}
