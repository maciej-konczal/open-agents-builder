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

        const response = await authorizedContext.apiClient?.activateAccount({
            apiKey: authorizedContext.saasContex?.saasToken
        });

        return Response.json( { message: response?.message, status: response?.status }, { status: response?.status });   
    } catch (error) {
        console.error(error); 
        return Response.json({ message: getErrorMessage(error), status: 403 });
    }
}

export const dynamic = "force-dynamic";
