import ServerProductRepository from "@/data/server/server-product-repository";
import { NextRequest } from "next/server";
import { authorizeRequestContext, genericDELETE } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recordId = params.id;
    if (!recordId) {
      return Response.json({ message: "No id provided", status: 400 }, { status: 400 });
    }

    const requestContext = await authorizeRequestContext(request);
    const repo = new ServerProductRepository(requestContext.databaseIdHash);

    // Ewentualnie usuwamy także powiązane dane (jeśli jakieś istnieją)
    return Response.json(await genericDELETE(request, repo, { id: recordId }));
  } catch (error) {
    return Response.json({ message: getErrorMessage(error), status: 500 }, { status: 500 });
  }
}
