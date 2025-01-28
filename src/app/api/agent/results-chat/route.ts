import { Agent } from '@/data/client/models';
import { AgentDTO, ResultDTO, ResultDTOEncSettings, SessionDTO, StatDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import ServerResultRepository from '@/data/server/server-result-repository';
import ServerStatRepository from '@/data/server/server-stat-repository';
import { authorizeSaasContext } from '@/lib/generic-api';
import { renderPrompt } from '@/lib/prompt-template';
import { openai } from '@ai-sdk/openai';
import { appendResponseMessages, CoreMessage, Message, streamText, tool } from 'ai';
import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import { format } from 'path';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { messages }: { messages: CoreMessage[] } = await req.json();
  const databaseIdHash = req.headers.get('Database-Id-Hash');
  const agentId = req.headers.get('Agent-Id');
  const locale = req.headers.get('Agent-Locale') || 'en';

  if(!databaseIdHash || !agentId) {
    return Response.json('The required HTTP headers: Database-Id-Hash and Agent-Id missing', { status: 400 });
  }

  const repo = new ServerAgentRepository(databaseIdHash);

  const agent = Agent.fromDTO(await repo.findOne({
    id: agentId // TODO: fix seearching as it always return the same record!
  }) as AgentDTO);

  const resultsRepo = new ServerResultRepository(databaseIdHash);
  const results = await resultsRepo.findAll({
    filter: {
      agentId
    }
  })

  const resultMessages = results.map((result: ResultDTO) => {
    return {
      role: 'system',
      content: `${result.userEmail} ${result.userName} [${result.createdAt}] - ${result.content}`
    } as CoreMessage
  })

  const systemPrompt = await renderPrompt(locale, 'results-chat', { agent });
  messages.unshift({
    role: 'system',
    content: systemPrompt
  } as CoreMessage, ...resultMessages)

  console.log(messages)

  const result = streamText({
    model: openai('gpt-4o'),
    maxSteps: 10,  
    messages,
    async onFinish({ response, usage }) {
    
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
  });
  return result.toDataStreamResponse();
}