import { ProductDTO, productDTOSchema, PaginatedResult } from "@/data/dto";
import ServerProductRepository from "@/data/server/server-product-repository";
import { NextRequest, NextResponse } from "next/server";
import { genericGET, genericPUT } from "@/lib/generic-api";
import { authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";
import { getCurrentTS, getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest, response: NextResponse) {
  try {
    const requestContext = await authorizeRequestContext(request, response);
    const repo = new ServerProductRepository(requestContext.databaseIdHash, 'commerce');

    const url = request.nextUrl;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const orderBy = url.searchParams.get("orderBy") ?? "createdAt";
    const queryStr = url.searchParams.get("query") ?? "";

    if (limitParam && offsetParam) {
      const limit = parseInt(limitParam, 10) || 10;
      const offset = parseInt(offsetParam, 10) || 0;

      const result = await repo.queryAll({ limit, offset, orderBy, query: queryStr });
      return Response.json(result);
    } else {
      // w innym wypadku proste findAll
      const data = await repo.findAll();
      return Response.json(data);
    }
  } catch (err) {
    return Response.json({ message: getErrorMessage(err), status: 500 }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, response: NextResponse) {
  const requestContext = await authorizeRequestContext(request, response);
  const saasContext = await authorizeSaasContext(request);

  const body = await request.json();
  const productRepo = new ServerProductRepository(requestContext.databaseIdHash, 'commerce');
  const result = await genericPUT<ProductDTO>(body, productDTOSchema, productRepo, "id");

  return Response.json(result, { status: result.status });
}