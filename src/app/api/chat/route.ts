import { Agent, ToolConfiguration } from '@/data/client/models';
import { AgentDTO, ResultDTO, SessionDTO, StatDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import ServerResultRepository from '@/data/server/server-result-repository';
import ServerSessionRepository from '@/data/server/server-session-repository';
import ServerStatRepository from '@/data/server/server-stat-repository';
import { authorizeSaasContext } from '@/lib/generic-api';
import { renderPrompt } from '@/lib/prompt-template';
import { openai } from '@ai-sdk/openai';
import { CoreMessage, Tool, streamText, tool } from 'ai';
import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import { z, ZodObject } from 'zod';
import { ToolDescriptor, toolRegistry } from '@/tools/registry'
import { llmProviderSetup } from '@/lib/llm-provider';
import { getErrorMessage } from '@/lib/utils';
import { createUpdateResultTool } from '@/tools/updateResultTool';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function prepareAgentTools(tools: Record<string, ToolConfiguration> | undefined): Record<string, Tool> {
  if (!tools) return {}
  const mappedTools: Record<string, Tool> = {};
  for(const toolKey in tools) {
    const toolConfig = tools[toolKey];
    const toolDescriptor:ToolDescriptor = toolRegistry[toolConfig.tool];
    if (!toolDescriptor) {
      console.log(`Tool is not available ${toolConfig.tool}`);
      continue;
    } else {

      const paramsDefaults: Record<string, any> = {}
      for(const preConfiguredOptionKey in toolConfig.options){
        const preConfiguredOptionVal = toolConfig.options[preConfiguredOptionKey];
        paramsDefaults[preConfiguredOptionKey] = preConfiguredOptionVal;
      }
      // TODO we somehow must remove the parameters with defaults from parameters otherwise LLM will try to guess it

      let nonDefaultParameters = toolDescriptor.tool.parameters;
      if (nonDefaultParameters instanceof ZodObject) {
        const omitKeys: Record<string, true> = {}
        for(const key in paramsDefaults){
          omitKeys[key] = true;
        }
        nonDefaultParameters = nonDefaultParameters.omit(omitKeys);
      }

      mappedTools[toolKey] = tool({ // we are creating a wrapper tool of tool provided to fill the gaps wieh pre-configured parameters
          description: `${toolConfig.description} - ${toolDescriptor.tool.description}}`,
          parameters: nonDefaultParameters,
          execute: async (params, options) => {
            if (toolDescriptor.tool.execute)
              return toolDescriptor.tool.execute({ ...params, ...paramsDefaults}, options); // we override the params with defaults provided in the configuration
            else {
              throw new Error(`Tool executor has no execute method defined, tool: ${toolKey} - ${toolConfig.tool}`);
            }
          }
        });
    }
  }
  return mappedTools;
}


export async function POST(req: NextRequest) {
  const { messages }: { messages: CoreMessage[] } = await req.json();
  const databaseIdHash = req.headers.get('Database-Id-Hash');
  const sessionId = req.headers.get('Agent-Session-Id') || nanoid();
  const agentId = req.headers.get('Agent-Id');

  if(!databaseIdHash || !agentId || !sessionId) {
    return Response.json('The required HTTP headers: Database-Id-Hash, Agent-Session-Id and Agent-Id missing', { status: 400 });
  }

  const repo = new ServerAgentRepository(databaseIdHash);

  const agent = Agent.fromDTO(await repo.findOne({
    id: agentId // TODO: fix seearching as it always return the same record!
  }) as AgentDTO);

  const locale = req.headers.get('Agent-Locale') || agent.locale || 'en';

  const sessionRepo = new ServerSessionRepository(databaseIdHash);
  let existingSession = await sessionRepo.findOne({ id: sessionId });

  const systemPrompt = await renderPrompt(locale, agent.promptTemplate ? agent.promptTemplate : 'survey-agent', { session: existingSession, agent, events: agent.events });
  messages.unshift( {
    role: 'system',
    content: systemPrompt
  })

    try {
    const result = await streamText({
      model: llmProviderSetup(),
      maxSteps: 10,  
      async onFinish({ response, usage }) {
        const chatHistory = [...messages, ...response.messages]
        existingSession = await sessionRepo.upsert({
          id: sessionId
        }, {
          id: sessionId,
          agentId,
          completionTokens: existingSession && existingSession.completionTokens ? usage.completionTokens + existingSession.completionTokens : usage.completionTokens,
          promptTokens: existingSession && existingSession.promptTokens ? usage.promptTokens + existingSession.promptTokens : usage.promptTokens,
          createdAt: existingSession ? existingSession.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: JSON.stringify(chatHistory)
        } as SessionDTO);

        const usageData:StatDTO = {
          eventName: 'chat',
          completionTokens: usage.completionTokens,
          promptTokens: usage.promptTokens,
          createdAt: new Date().toISOString()
        }
        const statsRepo = new ServerStatRepository(databaseIdHash, 'stats');
        const result = await statsRepo.aggregate(usageData)

        const saasContext = await authorizeSaasContext(req);
        if (saasContext.apiClient) {
            saasContext.apiClient.saveStats(databaseIdHash, {
                ...result,
                databaseIdHash: databaseIdHash
            });
      }        

      },
      tools: {
        ...prepareAgentTools(agent.tools),
        saveResults: createUpdateResultTool(databaseIdHash).tool
      },
      messages,
    });
    return result.toDataStreamResponse();
  } catch (e) {
    console.error(e);
    return Response.json({
      message: getErrorMessage(e),
      status: 500
    });
  }
}