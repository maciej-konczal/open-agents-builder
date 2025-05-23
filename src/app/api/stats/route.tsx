import { statsSchema } from "@/data/dto";
import ServerStatRepository from "@/data/server/server-stat-repository";
import { authorizeSaasContext } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { getErrorMessage, getZedErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);

        const statsRepo = new ServerStatRepository(requestContext.databaseIdHash, 'stats');
        const validationResult = statsSchema.safeParse(await request.json());
        if(!validationResult.success) {
            return Response.json({
                message: getZedErrorMessage(validationResult.error),
                issues: validationResult.error.issues,
                status: 400               
            })
        } else {
            const result = await statsRepo.aggregate(validationResult.data)

            const saasContext = await authorizeSaasContext(request);
            if (saasContext.apiClient) {
                saasContext.apiClient.saveStats(requestContext.databaseIdHash, {
                    ...result,
                    databaseIdHash: requestContext.databaseIdHash
                });
        }        
            return Response.json({
                message: 'Stats aggregated!',
                data: result,
                status: 200
            }, { status: 200 });
        }
    } catch (error) {
        console.error(error);

        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
} 
}

