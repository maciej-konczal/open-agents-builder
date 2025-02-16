import { z } from 'zod';
import { tool } from 'ai';
import ServerCalendarRepository from '@/data/server/server-calendar-repository';
import { ToolDescriptor } from './registry';

export function createCalendarListTool(databaseIdHash: string, storageKey: string | undefined | null): ToolDescriptor
{
  return {
    displayName: 'Access events calendar',
    tool: tool({
      description: 'List all events in the calendar.',
      parameters: z.object({
        agentId: z.string().describe('The agent ID to list events for'),
      }),
      execute: async ({ agentId }: { agentId: string }) => {
        const eventsRepo = new ServerCalendarRepository(databaseIdHash, storageKey);
        return await eventsRepo.findAll({
          filter: {
            agentId
          }
        })
      },
    }),
  }
}

