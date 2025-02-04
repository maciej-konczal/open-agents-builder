import { z } from 'zod';
import { tool } from 'ai';
import { ResultDTO } from '@/data/dto';
import ServerResultRepository from '@/data/server/server-result-repository';
import { ToolDescriptor } from './registry';

export function createUpdateResultTool(databaseIdHash: string): ToolDescriptor
{
  return {
  displayName: 'Update result',
  tool:tool({
          description: 'Update results',
          parameters: z.object({
            sessionId: z.string().describe('The result/session ID to be updated'),
            format: z.string().describe('The format of the inquiry results (requested by the user - could be: JSON, markdown, text etc.)'),
            result: z.string().describe('The inquiry results - in different formats (requested by the user - could be JSON, markdown, text etc.)'),
          }),
          execute: async ({ sessionId, result, format }) => {
            try {
              const resultRepo = new ServerResultRepository(databaseIdHash);
              const existingSession = await resultRepo.findOne({ sessionId });

              if(!existingSession) {
                return 'Session not found, please check the sessionId';
              }

              const storedResult = {
                sessionId,
                agentId: existingSession?.agentId,
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
      }
    }

