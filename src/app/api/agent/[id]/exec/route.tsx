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

export async function POST(request: NextRequest, { params }: { params: { id: string }} ) {
    try {
        const recordLocator = params.id;
        const requestContext = await authorizeRequestContext(request);
        const saasContext = await authorizeSaasContext(request);
        const agentsRepo = new ServerAgentRepository(requestContext.databaseIdHash);


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
                            const tr = await toolRegistry.init({ databaseIdHash: requestContext.databaseIdHash, storageKey: saasContext.isSaasMode ? saasContext.saasContex?.storageKey : null, agentId: '', sessionId: 'session-id' });

                            toolReg['tool-' + (new Date().getTime())] = {
                                description: tr[ts.name].displayName,
                                tool: tr[ts.name].tool,
                                options: ts.options
                            }
                        }

                        console.log('!!!', agents);
                        console.log(toolReg);

                        const tools = await prepareAgentTools(toolReg, '', '', recordLocator, '') as ToolSet;
                        console.log(tools);

                        compiledAgents[a.name] = agent({ // add stats support here

                            model: openai(a.model, {}),
                            name: a.name,
                            system: a.system,
                            tools
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

                Response.json(execFLow(flows?.find(f => f.code === 'pizdiec2') as AgentFlow));
            }


        }
    } catch (error) {
        return Response.json({ message: getErrorMessage(error), status: 500 }, {status: 500});
    }
}
