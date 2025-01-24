import { Agent } from '@/data/client/models';
import { AgentDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
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
  const datbaseIdHash = req.headers.get('Database-Id-Hash');
  const agentId = req.headers.get('Agent-Id');
  const locale = req.headers.get('Agent-Locale') || 'en';

  if(!datbaseIdHash || !agentId) {
    return Response.json('The required HTTP headers: Database-Id-Hash and Agent-Id missing', { status: 400 });
  }

  const repo = new ServerAgentRepository(datbaseIdHash);

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

          console.log(result);

          return 'Results saved!';

        },
      }),
    },
    messages,
  });

  return result.toDataStreamResponse();
}