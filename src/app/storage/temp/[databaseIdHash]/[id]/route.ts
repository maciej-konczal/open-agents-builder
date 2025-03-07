import { StorageService } from "@/lib/storage-service";
import { getErrorMessage } from "@/lib/utils";


export async function GET(request: Request, { params }: { params: { id: string, databaseIdHash: string }}) {
    try {
        const storageService = new StorageService(params.databaseIdHash, 'temp');

        if (storageService.fileExists(params.id)) {

                const fcontent = storageService.readPlainTextAttachment(params.id); // base64 encoded

                const mimeType = fcontent.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1];
                const headers = new Headers();
                headers.append('Content-Type', mimeType ? mimeType : 'application/octet-stream');

                const base64Data = fcontent.split(',')[1];
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);

                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const arrayBuffer = bytes.buffer;
                return new Response(arrayBuffer, { headers });
        } else {
            return new Response('File not found', { status: 404 });
        }

    } catch (error) {
        console.error(error);

        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
} 
}