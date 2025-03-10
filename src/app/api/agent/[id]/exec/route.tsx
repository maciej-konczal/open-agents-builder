import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerCalendarRepository from "@/data/server/server-calendar-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerSessionRepository from "@/data/server/server-session-repository";
import { auditLog, authorizeSaasContext, genericDELETE } from "@/lib/generic-api";
import { authorizeRequestContext } from "@/lib/authorization-api"
import { getErrorMessage } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { Agent, AgentFlow, Session, ToolConfiguration } from "@/data/client/models";
import { openai } from "@ai-sdk/openai";
import { agent, execute } from 'flows-ai'
import { convertToFlowDefinition, FlowStackTraceElement, messagesSupportingAgent } from "@/flows/models";
import { prepareAgentTools } from "@/app/api/chat/route";
import { toolRegistry } from "@/tools/registry";
import { CoreUserMessage, FilePart, generateText, ImagePart, ToolSet } from "ai";
import { createUpdateResultTool } from "@/tools/updateResultTool";
import { z } from "zod";
import { nanoid } from "nanoid";
import { validateTokenQuotas } from "@/lib/quotas";
import { resultDTOSchema, SessionDTO, StatDTO } from "@/data/dto";
import ServerStatRepository from "@/data/server/server-stat-repository";
import { setStackTraceJsonPaths } from "@/lib/json-path";
import { applyInputTransformation, createDynamicZodSchemaForInputs, extractVariableNames, injectVariables, replaceVariablesInString } from "@/flows/inputs";
import { StorageService } from "@/lib/storage-service";
import { files } from "jszip";
import { exec } from "child_process";



export async function POST(request: NextRequest, { params }: { params: { id: string } }, res: Response) {
    try {
        const recordLocator = params.id;
        const saasContext = await authorizeSaasContext(request);

        const databaseIdHash = request.headers.get('Database-Id-Hash');
        const sessionId = request.headers.get('Agent-Session-Id') || nanoid();
        const agentId = request.headers.get('Agent-Id');

        if (!databaseIdHash || !agentId || !sessionId) {
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

        const storageService = new StorageService(databaseIdHash, 'temp');

        if (!recordLocator) {
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, { status: 400 });
        } else {

            const agentsRepo = new ServerAgentRepository(databaseIdHash);
            const dto = await agentsRepo.findOne({ id: recordLocator });

            if (dto) {
                const masterAgent = Agent.fromDTO(dto);

                if (!masterAgent.published) {
                    try {
                        await authorizeRequestContext(request); // force admin authorization
                    } catch (e) {
                        return Response.json({ message: 'Unauthorized', status: 401 }, { status: 401 }); // token invaidation
                    }
                }

                const execRequestSchema = z.object({
                    flow: z.string(),
                    outputMode: z.enum(['stream', '']).default('stream').optional(),
                    execMode: z.enum(['sync', 'async']).default('sync').optional(),
                    input: z.any() // @TODO: generate z.object for passed variables dynamically based on agent.inputs
                });

                const execRequest = await execRequestSchema.parse(await request.json());
                const inputSchema = createDynamicZodSchemaForInputs({ availableInputs: masterAgent.inputs ?? [] })

                const inputObject = await inputSchema.parse(execRequest.input);
                const { agents, flows, inputs } = masterAgent;
                const encoder = new TextEncoder();

                const execFLow = async (flow: AgentFlow, controller: ReadableStreamDefaultController<any> | null = null) => { // TODO: export it to AI tool as well to let execute the flows from chat etc

                    const variablesToInject: Record<string, string> = {}
                    const filesToUpload: Record<string, string> = {}
                    for (const i of masterAgent?.inputs ?? []) {
                        if (i.type !== 'fileBase64') {
                            variablesToInject[i.name] = inputObject[i.name] as string // skip the files 
                        } else {
                            filesToUpload[i.name] = inputObject[i.name] as string
                        }
                    }
                    const compiledFlow = injectVariables(convertToFlowDefinition(flow?.flow), variablesToInject)
                    applyInputTransformation(compiledFlow, (currentNode) => {

                        if (currentNode.input && typeof currentNode.input === 'string') {
                            const usedVariables = extractVariableNames(currentNode.input);
                            const newInput = {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: replaceVariablesInString(currentNode.input, variablesToInject)
                                    }
                                ]
                            } as CoreUserMessage



                            for (const v of (usedVariables && usedVariables.length > 0 ? usedVariables : (masterAgent?.inputs?.map(i => i.name) ?? []))) {
                                if (filesToUpload[v]) {  // this is file
                                    (newInput.content as Array<ImagePart>).push(
                                        {
                                            type: 'image',
                                            image: filesToUpload[v],
                                            mimeType: filesToUpload[v].match(/^data:(.*?);base64,/)?.[1] || 'application/octet-stream'
                                        }
                                    );
                                }

                            }

                            console.log('NI', newInput)
                            return JSON.stringify(newInput);
                        }

                        return currentNode.input;
                    });
                    const compiledAgents: Record<string, any> = {}
                    const stackTrace: FlowStackTraceElement[] = []

                    // we need to put the inputs into the flow
                    for (const a of agents || []) {

                        const toolReg: Record<string, ToolConfiguration> = {}


                        for (const ts of a.tools) {
                            toolReg['tool-' + (nanoid())] = {
                                description: '',
                                tool: ts.name,
                                options: ts.options
                            }
                        }

                        let currentTraceElement = { flow: compiledFlow, result: null } as FlowStackTraceElement;

                        const customTools = await prepareAgentTools(toolReg, databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, recordLocator, sessionId) as ToolSet;
                        compiledAgents[a.name] = messagesSupportingAgent({ // add stats support here

                            onStepFinish: async (result) => { // TODO build traces in here, save it to db; one session may have multiple traces
                                const { usage, response } = result;

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

                                if (controller && execRequest.outputMode === 'stream') {
                                    controller.enqueue(encoder.encode(JSON.stringify(
                                        {
                                            type: 'stepFinish',
                                            name: flow.name,
                                            messages: result.response.messages
                                        }
                                    )))
                                }

                            },
                            model: openai(a.model, {}),
                            name: a.name,
                            system: a.system,
                            messages: [],

                            tools: {
                                ...customTools,
                                updateResultTool: createUpdateResultTool(databaseIdHash, saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null).tool,
                            }
                        })
                    };

                    // TODO: add support for execRequest.execMode == 'async' - storing trace and returning trace id 
                    const response = await execute(
                        compiledFlow, {
                        agents: compiledAgents,
                        onFlowStart: (flow) => {
                            if (controller && execRequest.outputMode === 'stream') {
                                controller.enqueue(encoder.encode(JSON.stringify(
                                    {
                                        type: 'flowStart',
                                        name: flow.name,
                                        input: flow.input,
                                        startedAt: new Date(),
                                    }
                                )))
                            }
                            stackTrace.push({ flow, result: null, messages: [], startedAt: new Date() });
                        },
                        onFlowFinish: (flow, result) => {

                            if (controller && execRequest.outputMode === 'stream') {
                                controller.enqueue(encoder.encode(JSON.stringify(
                                    {
                                        type: 'flowFinish',
                                        name: flow.name,
                                        finishedAt: new Date(),
                                        result
                                    }
                                )))
                            }
                            //console.log('Flow finished', flow.agent, flow.name, result);
                        },
                    }
                    )

                    //console.log(stackTrace);
                    //console.log(response);

                    return response;
                };

                if (execRequest.outputMode === 'stream') {
                    const stream = new ReadableStream({
                        async start(controller) {
                            try {
                                await execFLow(flows?.find(f => f.code === execRequest.flow) as AgentFlow, controller);
                            } catch (error) {
                                console.error("Stream error:", error);
                                controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: getErrorMessage(error) })));
                            } finally {
                                try {
                                    controller.close();
                                } catch (error) {
                                    console.error("Stream close error: ", getErrorMessage(error));
                                }
                            }
                        }
                    });
                    return new Response(stream, {
                        headers: {
                            "Content-Type": "application/json",
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "Transfer-Encoding": "chunked"
                        }
                    });
                } else {
                    return Response.json(await execFLow(flows?.find(f => f.code === execRequest.flow) as AgentFlow));
                }
            }


        }
    } catch (error) {
        console.error(error)
        return Response.json({ message: getErrorMessage(error), status: 499 }, { status: 499 });
    }
}
