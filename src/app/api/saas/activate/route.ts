import { GetSaaSResponseSuccess } from "@/data/client/saas-api-client";
import { SaaSDTO } from "@/data/dto";
import { authorizeSaasContext } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        const authorizedContext = await authorizeSaasContext(request); // authorize SaaS context
        if (!authorizedContext.hasAccess) {
            return Response.json({
                message: authorizedContext.error,
                status: 403
            });
        }

        const response = authorizedContext.apiClient?.activateAccount({
            apiKey: authorizedContext.saasContex?.saasToken
        });

        return Response.json(response, { status: 200 });   
    } catch (error) {
        console.error(error); 
        return Response.json({ message: getErrorMessage(error), status: 403 });
    }
}

export const dynamic = "force-dynamic";
