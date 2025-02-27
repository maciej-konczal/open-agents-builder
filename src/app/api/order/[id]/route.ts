// /app/api/order/[id]/route.ts

import ServerOrderRepository from "@/data/server/server-order-repository";
import { NextRequest } from "next/server";
import { auditLog, authorizeSaasContext } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { getErrorMessage } from "@/lib/utils";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const recordId = params.id;
        if (!recordId) {
            return Response.json({ message: "No id provided", status: 400 }, { status: 400 });
        }

        const requestContext = await authorizeRequestContext(request);
        const saasContext = await authorizeSaasContext(request);
        const repo = new ServerOrderRepository(requestContext.databaseIdHash, "commerce", saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);

        const success = await repo.delete({ id: recordId });
        if (success) {

            auditLog({
                eventName: 'deleteOrder',
                recordLocator: JSON.stringify({ id: recordId })
            }, request, requestContext, saasContext);


            return Response.json({ message: "Order deleted", status: 200 });
        } else {
            return Response.json({ message: "Not found", status: 404 }, { status: 404 });
        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, { status: 499 });
    }
}
