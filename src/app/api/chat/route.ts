import { Agent } from '@/data/client/models';
import { AgentDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import { renderPrompt } from '@/lib/prompt-template';
import { openai } from '@ai-sdk/openai';
import { CoreMessage, Message, streamText } from 'ai';
import { nanoid } from 'nanoid';

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
    messages,
  });

  return result.toDataStreamResponse();
}