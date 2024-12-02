import { FolderDTO, folderDTOSchema } from "@/data/dto";
import ServerFolderRepository from "@/data/server/server-folder-repository";
import { genericGET, genericPUT, genericDELETE, authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const saasContext = await authorizeSaasContext(request); // authorize SaaS context
    if (saasContext.apiClient) {
        saasContext.apiClient.saveEvent(requestContext.emailHash, {
           eventName: 'createFolder',
           emailHash: requestContext.emailHash,
           params: {}
       });
   }

    const apiResult = await genericPUT<FolderDTO>(await request.json(), folderDTOSchema, new ServerFolderRepository(requestContext.emailHash), 'id');
    return Response.json(apiResult, { status: apiResult.status });

}

// return all folders
export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    return Response.json(await genericGET<FolderDTO>(request, new ServerFolderRepository(requestContext.emailHash)));
}

// clear all folders
export async function DELETE(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const allFolders = await genericGET<FolderDTO>(request, new ServerFolderRepository(requestContext.emailHash));
    if(allFolders.length <= 1){
        return Response.json({ message: "Cannot delete folders", status: 400 }, {status: 400});
    } else {
        const saasContext = await authorizeSaasContext(request); // authorize SaaS context
        if (saasContext.apiClient) {
            saasContext.apiClient.saveEvent(requestContext.emailHash, {
               eventName: 'deleteFolder',
               emailHash: requestContext.emailHash,
               params: {}
           });
       }
    
        const deleteResults = [];
        for(const folder of allFolders){
            deleteResults.push(await genericDELETE(request, new ServerFolderRepository(requestContext.emailHash), { id: folder.id as number}));
        }
        return Response.json({ message: 'Folders cleared!', data: deleteResults, status: 200 }, { status: 200 });
    }
}