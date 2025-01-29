import { AgentDTO, agentDTOSchema } from "@/data/dto";
import ServerAgentRepository from "@/data/server/server-agent-repository";
import { authorizeRequestContext, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from 'fs/promises';
import { createCache } from 'simple-in-memory-cache';
const { set, get } = createCache({ expiration: { minutes: 15 } });


export async function PUT(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);
    const inputObj = (await request.json())
    const apiResult = await genericPUT<AgentDTO>(inputObj, agentDTOSchema, new ServerAgentRepository(requestContext.databaseIdHash, 'templates'), 'id');

    const saasContext = await authorizeSaasContext(request); // authorize SaaS context
    if (saasContext.apiClient) {
        saasContext.apiClient.saveEvent(requestContext.databaseIdHash, {
           eventName: 'createTemplate',
           databaseIdHash: requestContext.databaseIdHash,
           params: {
                inputObj
           }
       });
    }
    return Response.json(apiResult, { status: apiResult.status });

}

export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);

      const templatesPath = path.join(
        process.cwd(), // or your app root logic
        'src',
        'templates'
      );




    const locales = await fs.readdir(templatesPath);
    let templates: Record<string, any[]> = {};
    const templatesRepo = new ServerAgentRepository(requestContext.databaseIdHash, 'templates'); //TODO: add caching to not read the server folder every time it's requested
    let templatesCached = await get('templatesCached');

    if (!templatesCached) {

        for (const locale of locales) {
            const localePath = path.join(templatesPath, locale);
            const files = await fs.readdir(localePath);

            templates[locale] = [];

            for (const file of files) {
                const filePath = path.join(localePath, file);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    templates[locale].push(JSON.parse(content));
                } catch (error) {
                    console.error(`Error reading or parsing file ${filePath}:`, error);
                }
            }
        }
    
        for (const locale in templates) {
            for (const template of templates[locale]) {
                console.log(template.id, template.displayName)
                delete template.status; // not set if case user deleted a template
                await templatesRepo.upsert({ id: template['id'] }, { ...template, locale }); // re-import templates to database
            }
        }
        set('templatesCached', templates);

    }  else {
        console.log('Using cache for system templates');
    }   
    

    return Response.json(await genericGET<AgentDTO>(request, templatesRepo));
}
