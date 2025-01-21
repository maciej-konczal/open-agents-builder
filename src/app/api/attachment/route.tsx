import { AttachmentDTO, AttachmentDTOSchema } from "@/data/dto";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import { authorizeRequestContext, genericGET, genericPUT } from "@/lib/generic-api";
import { StorageService } from "@/lib/storage-service";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";


// Rest of the code

export async function PUT(request: NextRequest, response: NextResponse) {
    if (request.headers.get("Content-Type") === "application/json") {
        const inputJson = await request.json();
        return await handlePUTRequest(inputJson, request, response);
    } else {
        const formData = await request.formData();
        return await handlePUTRequest(JSON.parse(formData.get("attachmentDTO") as string), request, response, formData.get("file") as File);
    }
}

async function handlePUTRequest(inputJson: any, request: NextRequest, response: NextResponse, file?: File) {
    const requestContext = await authorizeRequestContext(request, response);

    const storageService = new StorageService(requestContext.databaseIdHash);
    let apiResult = await genericPUT<AttachmentDTO>(
        inputJson,
        AttachmentDTOSchema,
        new ServerAttachmentRepository(requestContext.databaseIdHash),
        'id'
    );
    if (apiResult.status === 200) { // validation went OK, now we can store the file
        if (file) { // file could be not uploaded in case of metadata update
            try {
                const savedAttachment: AttachmentDTO = apiResult.data as AttachmentDTO;
                storageService.saveAttachment(file, savedAttachment.storageKey);
            } catch (e) {
                console.error("Error saving attachment", e);
                apiResult.status = 500;
                apiResult.message = getErrorMessage(e);
                apiResult.error = e;
            }
        }
    }
    return Response.json(apiResult, { status: apiResult.status });
}

export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    return Response.json(await genericGET<AttachmentDTO>(request, new ServerAttachmentRepository(requestContext.databaseIdHash)));
}
