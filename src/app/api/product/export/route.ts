import { auditLog, authorizeRequestContext, authorizeSaasContext } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";
import JSZip from 'jszip'
import showdown from "showdown";
import filenamify from 'filenamify';
import ServerProductRepository from "@/data/server/server-product-repository";
import { Product, renderProductToMarkdown } from "@/data/client/models";
import { StorageService } from "@/lib/storage-service";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";
import { getErrorMessage } from "@/lib/utils";



export async function GET(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const saasContext = await authorizeSaasContext(request);
        
        const resultRepo = new ServerProductRepository(requestContext.databaseIdHash, "commerce");
        const allResults = await resultRepo.findAll();

        const zip = new JSZip();
        const converter = new showdown.Converter({ tables: true, completeHTMLDocument: true, openLinksInNewWindow: true });
        converter.setFlavor('github');
        const stg = new StorageService(requestContext.databaseIdHash, 'commerce');
        const attRepo = new ServerAttachmentRepository(requestContext.databaseIdHash, 'commerce');

        let indexMd = '# Agent Doodle Products Export\n\n';

        for (const result of allResults) {

            if (result.name && result.sku) {
                const recordNiceName = filenamify((result.createdAt + ' - ' + result.sku), {replacement: '-'});
                indexMd += ` - <a href="${recordNiceName}.md">${result.name} - ${result.sku}</a>\n\n`;

                if (result.images && result.images.length > 0) {
                    zip.folder('images');

                    for (const i of result.images) {
                        const att = await attRepo.findOne({ storageKey: i.storageKey });
                        
                        if (i.storageKey) {
                            if (att) {
                                i.id = `${att.id}`;
                                i.fileName = att.displayName;
                                i.mimeType = att.mimeType || 'application/binary';
                            } else { 
                                i.fileName = i.storageKey;
                                i.mimeType = 'application/binary';
                            }
                            const destImgFile = `images/` + (i.fileName ? i.fileName : i.storageKey)
                            zip.file(destImgFile, stg.readAttachment(i.storageKey as string));
                            i.url = destImgFile;
                        }
                    }    
                } 
                const content = renderProductToMarkdown(Product.fromDTO(result), 'images/');

                let html = ''
                html = converter.makeHtml(content);
                zip.file(`${recordNiceName}.md`, content);               
                zip.file(`${recordNiceName}.html`, html);
            }
        }
        zip.file('index.md', indexMd);
        zip.file('index.html', converter.makeHtml(indexMd.replaceAll('.md', '.html')));
        zip.file('products.json', JSON.stringify(allResults));

        const headers = new Headers();

        headers.set("Content-Type", "application/zip");
        const zipFileContent = await zip.generateAsync({type:"blob"});
        headers.set("Content-Length", zipFileContent.size.toString());

        auditLog({
            eventName: 'exportProducts',
            recordLocator: JSON.stringify({ id: allResults.map(r => r.id) })
        }, request, requestContext, saasContext);

        // or just use new Response ❗️
        return new NextResponse(zipFileContent, { status: 200, statusText: "OK", headers });
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    }         
}

