import { z } from 'zod';
import { tool } from 'ai';
import ServerCalendarRepository from '@/data/server/server-calendar-repository';
import { ToolDescriptor } from './registry';

export function createCalendarScheduleTool(databaseIdHash: string, storageKey: string | undefined | null): ToolDescriptor
{
  return {
    displayName: 'Schedule event in the calendar',
    tool: tool({
      description: 'Schedule event in the calendar.',
      parameters: z.object({
        id: z.string().describe('Optional ID of the event if passed the event will be updated instead of created. Pass empty string to create new event.'),
        title: z.string().describe('The title of the event'),
        agentId: z.string().describe('The agent ID'),
        description: z.string().describe('The description of the event'),
        exclusive: z.string().describe('Is this event exclusive - blocking calendar for other events'),
        start: z.string().describe('The start date and time of the event in ISO format'),
        location: z.string().describe('The location of the event. Can be empty.'),
        end: z.string().describe('The end date and time of the event in ISO format'),
        participants: z.string().describe('The participants of the event. Should be JSON array of { name, email} object passed as string'),
      }),
      execute: async ({ id, agentId, title, description, exclusive, start,
         location, end, participants }: { id: string, agentId: string, title: string, description: string, exclusive: string, start: string, location: string, end: string, participants: string
      }) => {
        const eventsRepo = new ServerCalendarRepository(databaseIdHash, storageKey);
        const response = await eventsRepo.upsert({ id }, { id, agentId, title, description, exclusive, start, location, end, participants, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

        return response;        
      },
    }),
  }
}

