import { StorageSchemas } from "@/data/dto";
import { StorageService } from "@/lib/storage-service";


export async function GET(request: Request, { params }: { params: { id: string, databaseIdHash: string }}) {
    const storageSchema = StorageSchemas.Commerce
    const storageService = new StorageService(params.databaseIdHash, storageSchema);

    const headers = new Headers();
    headers.append('Content-Type', 'application/octet-stream');
    const fileContent = await storageService.readAttachment(params.id) // TODO: add streaming
    return new Response(fileContent, { headers });
}