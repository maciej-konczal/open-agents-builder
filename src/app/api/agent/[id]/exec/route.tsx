import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerSessionRepository from "@/data/server/server-session-repository";
import {  auditLog, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api"
import { getErrorMessage } from "@/lib/utils";
import { NextRequest } from "next/server";
import { Agent, AgentFlow, ToolConfiguration } from "@/data/client/models";
import { openai } from "@ai-sdk/openai";
import { agent, execute } from 'flows-ai'
import { convertToFlowDefinition } from "@/flows/models";
import { prepareAgentTools } from "@/app/api/chat/route";
import { toolRegistry } from "@/tools/registry";
import { ToolSet } from "ai";
import { createUpdateResultTool } from "@/tools/updateResultTool";
import { z } from "zod";
import { nanoid } from "nanoid";
import { validateTokenQuotas } from "@/lib/quotas";


const execRequestSchema = z.object({
    flow: z.string(),
    input: z.any() // @TODO: generate z.object for passed variables dynamically based on agent.inputs
});

export async function POST(request: NextRequest, { params }: { params: { id: string }} ) {
    try {
        const recordLocator = params.id;
        const requestContext = await authorizeRequestContext(request);
        const saasContext = await authorizeSaasContext(request);
        const agentsRepo = new ServerAgentRepository(requestContext.databaseIdHash);


        const databaseIdHash = request.headers.get('Database-Id-Hash');
        const sessionId = request.headers.get('Agent-Session-Id') || nanoid();
        const agentId = request.headers.get('Agent-Id');

        if(!databaseIdHash || !agentId || !sessionId) {
            return Response.json('The required HTTP headers: Database-Id-Hash, Agent-Session-Id and Agent-Id missing', { status: 400 });
        }        
        

        const currentDateTimeIso = request.headers.get('Current-Datetime-Iso') || new Date().toISOString();
        const currentLocalDateTime = request.headers.get('Current-Datetime') || new Date().toLocaleString();
        const currentTimezone = request.headers.get('Current-Timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;


        if (saasContext.isSaasMode) {
            if (!saasContext.hasAccess) {
                return Response.json({ message: "Unauthorized", status: 403 }, { status: 403 });
            } else {

                if (saasContext.saasContex) {
                    const resp = await validateTokenQuotas(saasContext.saasContex)
                    if (resp?.status !== 200) {
                        return Response.json(resp)
                    }
                } else {
                    return Response.json({ message: "Unauthorized", status: 403 }, { status: 403 });
                }
            }
        }  

        const sessionRepo = new ServerSessionRepository(databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null);
        let existingSession = await sessionRepo.findOne({ id: sessionId });


        const execRequest = await execRequestSchema.parse(await request.json());

        console.log('RQ', execRequest);

        if(!recordLocator){
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        } else { 

            const dto = await agentsRepo.findOne({ id: recordLocator });

            if (dto) {
                const masterAgent = Agent.fromDTO(dto);

                const { agents, flows, inputs } = masterAgent;           
                const execFLow = async (flow: AgentFlow) => {
                    const compiledFlow = convertToFlowDefinition(flow?.flow);

                    console.log(compiledFlow);

                    const compiledAgents:Record<string, any> = {}
                    for(const a of agents || []) {

                        const toolReg: Record<string, ToolConfiguration> = {}

                        
                        for (const ts of a.tools) {
                            toolReg['tool-' + (new Date().getTime())] = {
                                description: '',
                                tool: ts.name,
                                options: ts.options
                            }
                        }
                        const customTools = await prepareAgentTools(toolReg, databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, recordLocator, sessionId) as ToolSet;
                        compiledAgents[a.name] = agent({ // add stats support here

                            onStepFinish: (result) => { // TODO build traces in here, save it to db; one session may have multiple traces
                                console.log(result.response.messages)
                                console.log('step finished', result);
                            },
                            model: openai(a.model, {}),
                            name: a.name,
                            system: a.system,
                            tools: { 
                                ...customTools,
                                updateResultTool: createUpdateResultTool('', null).tool,
                            }
                        })
                    };

                    const response = await execute(
                        compiledFlow, {
                            agents: compiledAgents
                        }
                    )

                    console.log(response);

                    return response;
                };

                return Response.json(await execFLow(flows?.find(f => f.code === execRequest.flow) as AgentFlow));
            }


        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 499 }, {status: 499});
    }
}
