import { StorageSchemas } from "@/data/dto";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import { StorageService } from "@/lib/storage-service";


export async function GET(request: Request, { params }: { params: { id: string, databaseIdHash: string }}) {
    const storageService = new StorageService(params.databaseIdHash, 'commerce');
    const storageRepo = new ServerAttachmentRepository(params.databaseIdHash, 'commerce');;
    const attachment = await storageRepo.findOne({ storageKey: params.id });

    if (attachment) {
        const headers = new Headers();
        headers.append('Content-Type', attachment.mimeType ? attachment.mimeType : 'application/octet-stream');

        const fileContent = await storageService.readAttachment(params.id) // TODO: add streaming
        return new Response(fileContent, { headers });
    } else {
        return new Response('Product image not found', { status: 404 });
    }
}