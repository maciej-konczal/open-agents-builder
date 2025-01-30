import { Agent, ToolConfiguration } from '@/data/client/models';
import { AgentDTO, ResultDTO, SessionDTO, StatDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import ServerResultRepository from '@/data/server/server-result-repository';
import ServerSessionRepository from '@/data/server/server-session-repository';
import ServerStatRepository from '@/data/server/server-stat-repository';
import { authorizeSaasContext } from '@/lib/generic-api';
import { renderPrompt } from '@/lib/prompt-template';
import { openai } from '@ai-sdk/openai';
import { CoreMessage, CoreTool, streamText, tool } from 'ai';
import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ToolDescriptor, toolRegistry } from '@/tools'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function prepareAgentTools(tools: Record<string, ToolConfiguration> | undefined): Record<string, CoreTool> {
  if (!tools) return {}
  const mappedTools: Record<string, CoreTool> = {};
  for(const toolKey in tools) {
    const toolConfig = tools[toolKey];
    const toolDescriptor:ToolDescriptor = toolRegistry[toolConfig.tool];
    if (!toolDescriptor) {
      console.log(`Tool is not available ${toolConfig.tool}`);
      continue;
    } else {

      const paramsWithNoDefaults = toolDescriptor.tool.parameters;
      const paramsDefaults: Record<string, any> = {}
      for(const preConfiguredOptionKey in toolConfig.options){
        const preConfiguredOptionVal = toolConfig.options[preConfiguredOptionKey];
        delete paramsWithNoDefaults[preConfiguredOptionKey]; // delete this from tool descriptors

        paramsDefaults[preConfiguredOptionKey] = preConfiguredOptionVal;
      }

      mappedTools[toolKey] = tool({ // we are creating a wrapper tool of tool provided to fill the gaps wieh pre-configured parameters
          description: `${toolConfig.description} - ${toolDescriptor.tool.description}}`,
          parameters: z.object(paramsWithNoDefaults),
          execute: async (params, options) => {
            if (toolDescriptor.tool.execute)
              return toolDescriptor.tool.execute({...paramsDefaults, ...params}, options);
            else {
              throw new Error(`Tool executor has no execute method defined, tool: ${toolKey} - ${toolConfig.tool}`);
            }
          }
        });

      return mappedTools;
    }
  }
}


export async function POST(req: NextRequest) {
  const { messages }: { messages: CoreMessage[] } = await req.json();
  const databaseIdHash = req.headers.get('Database-Id-Hash');
  const sessionId = req.headers.get('Agent-Session-Id') || nanoid();
  const agentId = req.headers.get('Agent-Id');
  const locale = req.headers.get('Agent-Locale') || 'en';

  if(!databaseIdHash || !agentId || !sessionId) {
    return Response.json('The required HTTP headers: Database-Id-Hash, Agent-Session-Id and Agent-Id missing', { status: 400 });
  }

  const repo = new ServerAgentRepository(databaseIdHash);

  const agent = Agent.fromDTO(await repo.findOne({
    id: agentId // TODO: fix seearching as it always return the same record!
  }) as AgentDTO);

  const systemPrompt = await renderPrompt(locale, 'survey-agent', { agent });
  messages.unshift( {
    role: 'system',
    content: systemPrompt
  })

  const sessionRepo = new ServerSessionRepository(databaseIdHash);
  let existingSession = await sessionRepo.findOne({ id: sessionId });

  const result = streamText({
    model: openai('gpt-4o'),
    maxSteps: 10,  
    async onFinish({ response, usage }) {
      const chatHistory = [...messages, ...response.messages]
      existingSession = await sessionRepo.upsert({
        id: sessionId
      }, {
        id: sessionId,
        agentId,
        createdAt: new Date().toISOString(),
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
      saveResults: tool({
        description: 'Save results',
        parameters: z.object({
          format: z.string().describe('The format of the inquiry results (requested by the user - could be: JSON, markdown, text etc.)'),
          result: z.string().describe('The inquiry results - in different formats (requested by the user - could be JSON, markdown, text etc.)'),
        }),
        execute: async ({ result, format }) => {
          try {
            const resultRepo = new ServerResultRepository(databaseIdHash);

            const storedResult = {
              sessionId,
              agentId,
              userEmail: existingSession?.userEmail,
              userName: existingSession?.userName,
              createdAt: new Date().toISOString()
            } as ResultDTO;
          
            storedResult.updatedAt = new Date().toISOString();
            storedResult.finalizedAt = new Date().toISOString();
            storedResult.content = result;
            storedResult.format = format;          
            await resultRepo.upsert({ sessionId }, storedResult);
            return 'Results saved!';
          } catch (e) {
            return 'Error saving results';
          }
        },
      }),
    },
    messages,
  });
  return result.toDataStreamResponse();
}