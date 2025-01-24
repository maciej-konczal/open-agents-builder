import { Agent } from '@/data/client/models';
import { AgentDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import ServerResultRepository from '@/data/server/server-result-repository';
import { renderPrompt } from '@/lib/prompt-template';
import { openai } from '@ai-sdk/openai';
import { CoreMessage, Message, streamText, tool } from 'ai';
import { nanoid } from 'nanoid';
import { format } from 'path';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
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

  const result = streamText({
    model: openai('gpt-4o'),
    tools: {
      saveResults: tool({
        description: 'Save results',
        parameters: z.object({
          format: z.string().describe('The format of the inquiry results (requested by the user - could be JSON, markdown, text etc.)'),
          result: z.string().describe('The inquiry results - in different formats (requested by the user - could be JSON, markdown, text etc.)'),
        }),
        execute: async ({ result }) => {

          const resultRepo = new ServerResultRepository(databaseIdHash);
          resultRepo.findOne({

          })
          console.log(result);

          return 'Results saved!';

        },
      }),
    },
    messages,
  });

  return result.toDataStreamResponse();
}