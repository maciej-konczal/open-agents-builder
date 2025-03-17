import { auditLog, authorizeSaasContext } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { NextRequest, NextResponse } from "next/server";
import JSZip, { file } from 'jszip'
import showdown from "showdown";
import filenamify from 'filenamify';
import ServerProductRepository from "@/data/server/server-product-repository";
import { Product, renderProductToMarkdown } from "@/data/client/models";
import { StorageService } from "@/lib/storage-service";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import { getErrorMessage } from "@/lib/utils";
import { StorageSchemas } from "@/data/dto";



export async function GET(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request);
        
        const attRepo = new ServerAttachmentRepository(requestContext.databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, StorageSchemas.Default);
        const allResults = await attRepo.findAll();

        const zip = new JSZip();
        const converter = new showdown.Converter({ tables: true, completeHTMLDocument: true, openLinksInNewWindow: true });
        converter.setFlavor('github');
        const stg = new StorageService(requestContext.databaseIdHash, StorageSchemas.Default);

        let indexMd = '# Open Agents Builder Attachments Export\n\n';

        for (const result of allResults) {

            if (result.displayName && result.storageKey) {
                const recordNiceName = filenamify(result.displayName, {replacement: '-'});
                indexMd += ` - <a href="${recordNiceName}.md">${result.displayName}}</a>\n\n`;
                zip.file(recordNiceName, stg.readAttachment(result.storageKey as string)); // zip the file


                const fileContent = result.content;

                if (fileContent) {
                    const htmlContent = converter.makeHtml(fileContent);
                    zip.file(`${recordNiceName}.md`, fileContent);               
                    zip.file(`${recordNiceName}.html`, htmlContent);
                }
            }
        }
        zip.file('index.md', indexMd);
        zip.file('index.html', converter.makeHtml(indexMd.replaceAll('.md', '.html')));
        zip.file('attachments.json', JSON.stringify(allResults));

        const headers = new Headers();

        headers.set("Content-Type", "application/zip");
        const zipFileContent = await zip.generateAsync({type:"blob"});
        headers.set("Content-Length", zipFileContent.size.toString());

        auditLog({
            eventName: 'exportAttachments',
            recordLocator: JSON.stringify({ id: allResults.map(r => r.id) })
        }, request, requestContext, saasContext);

        // or just use new Response ❗️
        return new NextResponse(zipFileContent, { status: 200, statusText: "OK", headers });
    } catch (error) {
        console.error(error);

        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
}         
}

