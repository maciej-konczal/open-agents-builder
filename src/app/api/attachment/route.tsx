import { AttachmentDTO, attachmentDTOSchema, StorageSchemas } from "@/data/dto";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import { authorizeSaasContext, authorizeStorageSchema, genericGET, genericPUT } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { StorageService } from "@/lib/storage-service";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { processFiles } from "@/lib/file-extractor";


// Rest of the code


export async function PUT(request: NextRequest, response: NextResponse) {
    try {
        if (request.headers.get("Content-Type") === "application/json") {
            const inputJson = await request.json();
            return await handlePUTRequest(inputJson, request, response);
        } else {
            const formData = await request.formData();
            return await handlePUTRequest(JSON.parse(formData.get("attachmentDTO") as string), request, response, formData.get("file") as File);
        }
    } catch (error) {
        console.error(error);

        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
} 
}

async function handlePUTRequest(inputJson: any, request: NextRequest, response: NextResponse, file?: File) {
    const requestContext = await authorizeRequestContext(request, response);
    const storageSchema = await authorizeStorageSchema(request, response);
    const saasContext = await authorizeSaasContext(request);
    const attRepo = new ServerAttachmentRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, storageSchema);

    const storageService = new StorageService(requestContext.databaseIdHash, storageSchema);
    let apiResult = await genericPUT<AttachmentDTO>(
        inputJson,
        attachmentDTOSchema,
        attRepo,
        'id'
    );

    // TODO add markitdown extraction + data encryption


    if (apiResult.status === 200) { // validation went OK, now we can store the file
        if (file) { // file could be not uploaded in case of metadata update
            try {
                const savedAttachment: AttachmentDTO = apiResult.data as AttachmentDTO;
                storageService.saveAttachment(file, savedAttachment.storageKey);

                const extractFileContent = async (savedAttachment: AttachmentDTO) => {

                    const inputObject = {
                        fileContent : storageService.readAttachmentAsBase64WithMimeType(savedAttachment.storageKey, savedAttachment.mimeType ? savedAttachment.mimeType : "application/octet-stream")
                    };

                    attRepo.upsert({
                        id: savedAttachment.id
                    }, {
                        ...savedAttachment,
                        extra: JSON.stringify({ status: 'extracting' })
                    });


                    const processedFiles = processFiles({
                        inputObject,
                        pdfExtractText: true
                    });

                    const extractedContent = processedFiles['fileContent'];
                    if (extractedContent) {
                        attRepo.upsert({
                            id: savedAttachment.id
                        }, {
                            ...savedAttachment,
                            extra: '',
                            content: Array.isArray(extractedContent) ? extractedContent.join("\n") : extractedContent
                        });

                    } else {
                        console.error("Error extracting file content", savedAttachment.storageKey, savedAttachment.displayName);
                    }
                }

                if (!savedAttachment.mimeType?.startsWith("image")) {
                    extractFileContent(savedAttachment);
                }
                

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
    const storageSchema = await authorizeStorageSchema(request, response);
    const saasContext = await authorizeSaasContext(request);

    return Response.json(await genericGET<AttachmentDTO>(request, new ServerAttachmentRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, storageSchema)));
}
