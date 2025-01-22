import { Agent } from '@/data/client/models';
import { AgentDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const datbaseIdHash = req.headers.get('Database-Id-Hash');
  const agentId = req.headers.get('Agent-Id');

  if(!datbaseIdHash || !agentId) {
    return Response.json('The required HTTP headers: Database-Id-Hash and Agent-Id missing', { status: 400 });
  }

  const repo = new ServerAgentRepository(datbaseIdHash);

  const agent = Agent.fromDTO(await repo.findOne({
    id: agentId
  }) as AgentDTO);

  console.log('Agent:', agent);
  
  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpfull assistant gathering data. Ask one question after another. The topic is: ' + agent.prompt,
    messages,
  });

  return result.toDataStreamResponse();
}