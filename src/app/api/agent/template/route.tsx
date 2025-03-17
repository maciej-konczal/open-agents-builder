import { AgentDTO, agentDTOSchema } from "@/data/dto";
import ServerAgentRepository from "@/data/server/server-agent-repository";
import { auditLog, authorizeSaasContext, genericGET, genericPUT } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from 'fs/promises';
import { createCache } from 'simple-in-memory-cache';
import { detailedDiff } from "deep-object-diff";
import { getErrorMessage } from "@/lib/utils";
import { Agent } from "@/data/client/models";
const { set, get } = createCache({ expiration: { minutes: 15 } });


export async function PUT(request: NextRequest, response: NextResponse) {
    try {
        const requestContext = await authorizeRequestContext(request, response);
        const inputObj = (await request.json())

        const repo = new ServerAgentRepository(requestContext.databaseIdHash, 'templates')
        const apiResult = await genericPUT<AgentDTO>(inputObj, agentDTOSchema, repo, 'id');
        const existingTemplate = await repo.findOne({
            id: inputObj.id
        });
        
        const saasContext = await authorizeSaasContext(request); // authorize SaaS context
        if (!existingTemplate) {
            auditLog({
                eventName: 'createTemplate',
                diff: JSON.stringify(inputObj),
                recordLocator: JSON.stringify({ id: apiResult.data.id })
            }, request, requestContext, saasContext);
        } else {
            const changes = existingTemplate ?  detailedDiff(existingTemplate, apiResult.data as AgentDTO) : {};
            auditLog({
                eventName: 'updateTemplate',
                diff: JSON.stringify(changes),
                recordLocator: JSON.stringify({ id: apiResult.data.id })
            }, request, requestContext, saasContext);
        }
        return Response.json(apiResult, { status: apiResult.status });
    } catch (error) {
        console.error(error);

        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
} 

}

export async function GET(request: NextRequest, response: NextResponse) {
    const requestContext = await authorizeRequestContext(request, response);

      const templatesPath = path.join(
        process.cwd(), // or your app root logic
        'src',
        'agent-templates'
      );

    const locales = await fs.readdir(templatesPath);
    let templates: Record<string, any[]> = {};
    const templatesRepo = new ServerAgentRepository(requestContext.databaseIdHash, 'templates'); //TODO: add caching to not read the server folder every time it's requested
    let templatesCached = false; //await get('templatesCached');

    if (!templatesCached) {

        for (const locale of locales) {
            const localePath = path.join(templatesPath, locale);
            const files = await fs.readdir(localePath);

            templates[locale] = [];

            for (const file of files) {
                const filePath = path.join(localePath, file);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    templates[locale].push(new Agent(JSON.parse(content)).toDTO());
                } catch (error) {
                    console.error(`Error reading or parsing file ${filePath}:`, error);
                }
            }
        }
    
        const existingTemplates = await templatesRepo.findAll({});
        for (const locale in templates) {
            for (const template of templates[locale]) {
                if (existingTemplates.find(t => t.id === template['id'])) 
                    delete template.status; // do not update status for existing templates
                template.published = `${template.published}`;// convert to boolean

                console.log(template);
                await templatesRepo.upsert({ id: template['id'] }, { ...template, locale }); // re-import templates to database
            }
        }
        set('templatesCached', templates);

    }  else {
        console.log('Using cache for system templates');
    }   
    

    return Response.json(await genericGET<AgentDTO>(request, templatesRepo));
}
