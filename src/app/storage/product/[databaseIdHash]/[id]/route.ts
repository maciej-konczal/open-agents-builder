import { StorageSchemas } from "@/data/dto";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import { authorizeSaasContext } from "@/lib/generic-api";
import { StorageService } from "@/lib/storage-service";
import { getErrorMessage } from "@/lib/utils";
import { NextRequest } from "next/server";


export async function GET(request: NextRequest, { params }: { params: { id: string, databaseIdHash: string }}) {
    try {
        const storageService = new StorageService(params.databaseIdHash, 'commerce');
        const saasContext = await authorizeSaasContext(request);
        const storageRepo = new ServerAttachmentRepository(params.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, 'commerce');;
        const attachment = await storageRepo.findOne({ storageKey: params.id });

        if (attachment) {
            const headers = new Headers();
            headers.append('Content-Type', attachment.mimeType ? attachment.mimeType : 'application/octet-stream');

            const fileContent = await storageService.readAttachment(params.id) // TODO: add streaming
            return new Response(fileContent, { headers });
        } else {
            return new Response('Product image not found', { status: 404 });
        }
    } catch (error) {
        console.error(error);

        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
} 
}