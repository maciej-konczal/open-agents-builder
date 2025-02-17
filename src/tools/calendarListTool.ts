import { z } from 'zod';
import { tool } from 'ai';
import ServerCalendarRepository from '@/data/server/server-calendar-repository';
import { ToolDescriptor } from './registry';

export function createCalendarListTool(agentId: string, sessionId: string, databaseIdHash: string, storageKey: string | undefined | null): ToolDescriptor
{
  return {
    displayName: 'Access events calendar',
    tool: tool({
      description: 'List all events in the calendar. Always list events BEFORE SCHEDULING new one to check the availability.',
      parameters: z.object({
      }),
      execute: async () => {
        try {
          const eventsRepo = new ServerCalendarRepository(databaseIdHash, storageKey);
          const response =  await eventsRepo.findAll({
            filter: {
              agentId
            }
          })
          return response;
        } catch (e) {
          console.error(e);
          return 'Event list failed';
        }
      },
    }),
  }
}

