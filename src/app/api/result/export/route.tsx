import { ResultDTO } from "@/data/dto";
import ServerResultRepository from "@/data/server/server-result-repository";
import { authorizeRequestContext, genericGET } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const resultRepo = new ServerResultRepository(requestContext.databaseIdHash);
    const allResults = resultRepo.findAll();

    const zip = new JSZip();
    const converter = new showdown.Converter({ tables: true, completeHTMLDocument: true, openLinksInNewWindow: true });
    converter.setFlavor('github');

    return Response.json(await genericGET<ResultDTO>(request, new ServerResultRepository(requestContext.databaseIdHash)));
}
