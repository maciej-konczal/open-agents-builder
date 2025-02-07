import { z } from 'zod';
import { tool } from 'ai';
import { ResultDTO } from '@/data/dto';
import ServerResultRepository from '@/data/server/server-result-repository';
import { ToolDescriptor } from './registry';
import ServerSessionRepository from '@/data/server/server-session-repository';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import { Agent } from '@/data/client/models';

export function createUpdateResultTool(databaseIdHash: string): ToolDescriptor
{
  return {
  displayName: 'Sage result',
  tool:tool({
          description: 'Save results',
          parameters: z.object({
            sessionId: z.string().describe('The result/session ID to be updated'),
            format: z.string().describe('The format of the inquiry results (requested by the user - could be: JSON, markdown, text etc.)'),
            result: z.string().describe('The inquiry results - in different formats (requested by the user - could be JSON, markdown, text etc.)'),
          }),
          execute: async ({ sessionId, result, format }) => {
            try {
              const resultRepo = new ServerResultRepository(databaseIdHash);
              const sessionsRepo = new ServerSessionRepository(databaseIdHash);
              const agentsRepo = new ServerAgentRepository(databaseIdHash);
              const existingSessionDTO = await sessionsRepo.findOne({ id: sessionId });
              const currentAgentDTO = await agentsRepo.findOne({ id: existingSessionDTO?.agentId });

              if(!existingSessionDTO) {
                return 'Session not found, please check the sessionId';
              }

              const storedResult = {
                sessionId,
                agentId: existingSessionDTO?.agentId,
                userEmail: existingSessionDTO?.userEmail,
                userName: existingSessionDTO?.userName,
                createdAt: new Date().toISOString()
              } as ResultDTO;

              if (currentAgentDTO) {
                const currentAgent = Agent.fromDTO(currentAgentDTO);
                if(currentAgent.options?.resultEmail) {
                  
                }
              }
            
              storedResult.updatedAt = new Date().toISOString();
              storedResult.finalizedAt = new Date().toISOString();
              storedResult.content = result;
              storedResult.format = format;      
              await sessionsRepo.upsert({ id: sessionId }, { ...existingSessionDTO, finalizedAt: new Date().toISOString() });
              await resultRepo.upsert({ sessionId }, storedResult);
              return 'Results saved!';
            } catch (e) {
              console.error(e);
              return 'Error saving results';
            }
          },
        }),
      }
    }

