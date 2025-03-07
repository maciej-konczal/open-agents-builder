import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerSessionRepository from "@/data/server/server-session-repository";
import {  auditLog, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api"
import { getErrorMessage } from "@/lib/utils";
import { NextRequest } from "next/server";
import { Agent, AgentFlow, Session, ToolConfiguration } from "@/data/client/models";
import { openai } from "@ai-sdk/openai";
import { agent, execute } from 'flows-ai'
import { convertToFlowDefinition, FlowStackTraceElement } from "@/flows/models";
import { prepareAgentTools } from "@/app/api/chat/route";
import { toolRegistry } from "@/tools/registry";
import { ToolSet } from "ai";
import { createUpdateResultTool } from "@/tools/updateResultTool";
import { z } from "zod";
import { nanoid } from "nanoid";
import { validateTokenQuotas } from "@/lib/quotas";
import { SessionDTO, StatDTO } from "@/data/dto";
import ServerStatRepository from "@/data/server/server-stat-repository";
import { setStackTraceJsonPaths } from "@/lib/json-path";
import { applyInputTransformation, createDynamicZodSchemaForInputs, extractVariableNames } from "@/flows/inputs";


export async function POST(request: NextRequest, { params }: { params: { id: string }} ) {
    try {
        const recordLocator = params.id;
        const saasContext = await authorizeSaasContext(request);

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

        if(!recordLocator){
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        } else { 

            const agentsRepo = new ServerAgentRepository(databaseIdHash);
            const dto = await agentsRepo.findOne({ id: recordLocator });

            if (dto) {
                const masterAgent = Agent.fromDTO(dto);

                if(!masterAgent.published) {
                    await authorizeRequestContext(request); // force admin authorization
                }

                const execRequestSchema = z.object({
                    flow: z.string(),
                    execMode: z.enum(['sync','async']).default('sync').optional(),
                    input: z.any() // @TODO: generate z.object for passed variables dynamically based on agent.inputs
                });                

                const execRequest = await execRequestSchema.parse(await request.json());
                const inputSchema = createDynamicZodSchemaForInputs({ availableInputs: masterAgent.inputs ?? []})

                const inputObject = await inputSchema.parse(execRequest.input);
                console.log('RQ', execRequest, inputObject.test);

                const { agents, flows, inputs } = masterAgent;           
                const execFLow = async (flow: AgentFlow) => { // TODO: export it to AI tool as well to let execute the flows from chat etc
                    const compiledFlow = applyInputTransformation(setStackTraceJsonPaths(convertToFlowDefinition(flow?.flow)), (currentNode) => {

                        const usedVars = extractVariableNames(currentNode.input);
                        console.log(usedVars);
                        // if used for example file - transform input to messages
                        return currentNode.input;
                    })

                    console.log(compiledFlow);

                    const compiledAgents:Record<string, any> = {}
                    const stackTrace:FlowStackTraceElement[] = []

                    // we need to put the inputs into the flow
                    for(const a of agents || []) {

                        const toolReg: Record<string, ToolConfiguration> = {}

                        
                        for (const ts of a.tools) {
                            toolReg['tool-' + (new Date().getTime())] = {
                                description: '',
                                tool: ts.name,
                                options: ts.options
                            }
                        }

                        let currentTraceElement = { flow: compiledFlow, result: null } as FlowStackTraceElement;

                        const customTools = await prepareAgentTools(toolReg, databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, recordLocator, sessionId) as ToolSet;
                        compiledAgents[a.name] = agent({ // add stats support here

                            onStepFinish: async (result) => { // TODO build traces in here, save it to db; one session may have multiple traces
                                const { usage, response } = result;

                                console.log('MES', response.messages.map(m => m.content));

                                let session = null
                                if (existingSession && existingSession.messages) {
                                    session = Session.fromDTO(existingSession);

                                }

                                existingSession = await sessionRepo.upsert({ // updating session stats
                                    id: sessionId
                                }, {
                                    id: sessionId,
                                    agentId,
                                    completionTokens: existingSession && existingSession.completionTokens ? usage.completionTokens + existingSession.completionTokens : usage.completionTokens,
                                    promptTokens: existingSession && existingSession.promptTokens ? usage.promptTokens + existingSession.promptTokens : usage.promptTokens,
                                    createdAt: existingSession ? existingSession.createdAt : new Date().toISOString(),
                                    updatedAt: new Date().toISOString()                                    
                                } as SessionDTO);

                                const usageData: StatDTO = {
                                    eventName: 'chat',
                                    completionTokens: usage.completionTokens,
                                    promptTokens: usage.promptTokens,
                                    createdAt: new Date().toISOString()
                                }
                                const statsRepo = new ServerStatRepository(databaseIdHash, 'stats');
                                const statRst = await statsRepo.aggregate(usageData)
                                if (saasContext.apiClient) {
                                    try {
                                        saasContext.apiClient.saveStats(databaseIdHash, {
                                            ...statRst,
                                            databaseIdHash: databaseIdHash
                                        });
                                    } catch (e) {
                                        console.error(e);
                                    }
                                } 
                                
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

                    // TODO: add support for execRequest.execMode == 'async' - storing trace and returning trace id 
                    const response = await execute(
                        compiledFlow, {
                            agents: compiledAgents,
                        onFlowStart: (flow) => {
                                stackTrace.push({ flow, result: null, messages: [], startedAt: new Date() });
                            },
                            onFlowFinish: (flow, result) => {
                                
                                //console.log('Flow finished', flow.agent, flow.name, result);
                            },
                        }
                    )

                    console.log(stackTrace);
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
