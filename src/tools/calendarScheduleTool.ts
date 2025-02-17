import { z } from 'zod';
import { tool } from 'ai';
import ServerCalendarRepository from '@/data/server/server-calendar-repository';
import { ToolDescriptor } from './registry';
import { v4 as uuidv4 } from "uuid"
import moment from 'moment';

export function createCalendarScheduleTool(agentId: string, sessionId: string, databaseIdHash: string, storageKey: string | undefined | null): ToolDescriptor
{
  return {
    displayName: 'Schedule event in the calendar',
    tool: tool({
      description: 'Schedule event in the calendar. Check avaiable dates for events using calendarListTool if available. For new events ALWAYS PASS future dates (later than ' + new Date().toISOString() + ').',
      parameters: z.object({
        id: z.string().describe('Optional ID of the event if passed the event will be updated instead of created. Pass empty string to create new event.'),
        title: z.string().describe('The title of the event'),
        description: z.string().describe('The description of the event'),
        exclusive: z.string().describe('Is this event exclusive - blocking calendar for other events'),
        start: z.string().describe('The start date and time of the event in ISO format with Time Zone offset'),
        location: z.string().describe('The location of the event. Can be empty.'),
        end: z.string().describe('The end date and time of the event in ISO format with Time Zone offset'),
        participants: z.string().describe('The participants of the event. Should be JSON array of { name, email} object passed as string'),
      }),
      execute: async ({ id, title, description, exclusive, start,
         location, end, participants }: { id: string, title: string, description: string, exclusive: string, start: string, location: string, end: string, participants: string
      }) => {
        console.log({ id, agentId, title, description, exclusive, start,
          location, end, participants })
        const eventsRepo = new ServerCalendarRepository(databaseIdHash, storageKey);

        if (!id) id = uuidv4();
        const response = await eventsRepo.upsert({ id }, { id, agentId, title, description, exclusive, start: moment(start).toISOString(true), location, end: moment(end).toISOString(true), participants, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

        return 'Event scheduled successfully';        
      },
    }),
  }
}

