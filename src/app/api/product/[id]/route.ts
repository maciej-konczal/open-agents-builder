import ServerProductRepository from "@/data/server/server-product-repository";
import { NextRequest } from "next/server";
import { auditLog, authorizeSaasContext } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { getErrorMessage } from "@/lib/utils";
import { genericDELETE } from "@/lib/generic-api";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recordId = params.id;
    if (!recordId) {
      return Response.json({ message: "No id provided", status: 400 }, { status: 400 });
    }
    const requestContext = await authorizeRequestContext(request);
    const saasContext = await authorizeSaasContext(request);
    const repo = new ServerProductRepository(requestContext.databaseIdHash, 'commerce');

    auditLog({
        eventName: 'deleteProduct',
        recordLocator: JSON.stringify({ id: recordId})
    }, request, requestContext, saasContext);

    // Ewentualnie usunięcie powiązanych danych
    return Response.json(await genericDELETE(request, repo, { id: recordId }));
  } catch (error) {
    return Response.json({ message: getErrorMessage(error), status: 499 }, { status: 499 });
  }
}
