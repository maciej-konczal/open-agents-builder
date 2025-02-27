import { ConfigDTO, configDTOSchema } from "@/data/dto";
import ServerConfigRepository from "@/data/server/server-config-repository";
import { genericDELETE, genericGET, genericPUT } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        if (requestContext.acl.role !== 'owner') {
            return Response.json({ message: "Owner role is required", status: 401 }, {status: 401});
        }
        const apiResult = await genericPUT<ConfigDTO>(await request.json(), configDTOSchema, new ServerConfigRepository(requestContext.databaseIdHash), 'key');
        return Response.json(apiResult, { status: apiResult.status });
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}

export async function GET(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        return Response.json(await genericGET<ConfigDTO>(request, new ServerConfigRepository(requestContext.databaseIdHash)));
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    } 
}

// clear all configuration - it's not used anywhere in the app so commented out for now
// export async function DELETE(request: NextRequest, response: NextResponse) {
//     const requestContext = await authorizeRequestContext(request, response);
//     const allConfigs = await genericGET<ConfigDTO>(request, new ServerConfigRepository(requestContext.databaseIdHash));
//     if(allConfigs.length <= 1){
//         return Response.json({ message: "Cannot delete the last configuration", status: 400 }, {status: 400});
//     } else {
//         const deleteResults = [];
//         for(const config of allConfigs){
//             deleteResults.push(await genericDELETE(request, new ServerConfigRepository(requestContext.databaseIdHash), { key: config.key}));
//         }
//         return Response.json({ message: 'Configuration cleared!', data: deleteResults, status: 200 }, { status: 200 });
//     }
// }