import { ProductDTO, productDTOSchema } from "@/data/dto";
import ServerProductRepository from "@/data/server/server-product-repository";
import { NextRequest, NextResponse } from "next/server";
import { auditLog, genericPUT } from "@/lib/generic-api";
import { authorizeSaasContext } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { getErrorMessage } from "@/lib/utils";
import { detailedDiff } from "deep-object-diff";

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

export async function PUT(request: NextRequest, response: NextResponse) {
  try {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContext = await authorizeSaasContext(request);

    const body = await request.json();
    const productRepo = new ServerProductRepository(requestContext.databaseIdHash, 'commerce');
    const existingProduct = await productRepo.findOne({ id: body.id });
    const result = await genericPUT<ProductDTO>(body, productDTOSchema, productRepo, "id");

    if (!existingProduct) {
        auditLog({
            eventName: 'createProduct',
            diff: JSON.stringify(result),
            recordLocator: JSON.stringify({ id: result.data.id })
        }, request, requestContext, saasContext);
    } else {
        const changes = existingProduct ?  detailedDiff(existingProduct, result.data as ProductDTO) : {};
        auditLog({
            eventName: 'updateProduct',
            diff: JSON.stringify(changes),
            recordLocator: JSON.stringify({ id: result.data.id })
        }, request, requestContext, saasContext);
    }

    return Response.json(result, { status: result.status });
  } catch (err) {
    return Response.json({ message: getErrorMessage(err), status: 499 }, { status: 499 });
  }
}