import { z } from 'zod';
import { tool } from 'ai';
import ServerCalendarRepository from '@/data/server/server-calendar-repository';
import { ToolDescriptor } from './registry';
import { v4 as uuidv4 } from "uuid"
import moment from 'moment';
import { auditLog, authorizeSaasToken } from '@/lib/generic-api';
import { detailedDiff } from 'deep-object-diff';
import { CalendarEventDTO } from '@/data/dto';

export function createCalendarScheduleTool(agentId: string, staticSessionId: string, databaseIdHash: string, storageKey: string | undefined | null): ToolDescriptor {
  return {
    displayName: 'Schedule event in the calendar',
    tool: tool({
      description: 'Schedule event in the calendar. Check avaiable dates for events using calendarListTool if available. For new events ALWAYS PASS future dates (later than ' + new Date().toISOString() + ').',
      parameters: z.object({
        id: z.string().describe('Optional ID of the event if passed the event will be updated instead of created. Pass empty string to create new event.'),
        title: z.string().describe('The title of the event'),
        description: z.string().describe('The description of the event'),
        sessionId: z.string().describe('The session ID assigned to this event - optional'),
        exclusive: z.string().describe('Is this event exclusive - blocking calendar for other events'),
        start: z.string().describe('The start date and time of the event in ISO format with Time Zone offset'),
        location: z.string().describe('The location of the event. Can be empty.'),
        end: z.string().describe('The end date and time of the event in ISO format with Time Zone offset'),
        participants: z.string().describe('The participants of the event. Should be JSON array of { name, email} object passed as string'),
      }),
      execute: async ({ id, title, description, exclusive, start,
        location, end, participants, sessionId }: {
          id: string, title: string, description: string, exclusive: string, start: string, location: string, end: string, participants, sessionId: string
        }) => {
        try {
          const eventsRepo = new ServerCalendarRepository(databaseIdHash, storageKey);
          if (!id) id = uuidv4();
          const saasContext = await authorizeSaasToken(databaseIdHash);
          const existingEvent = id ? await eventsRepo.findOne({ id }) : null;
          const response = await eventsRepo.upsert({ id }, { id, agentId, sessionId: staticSessionId ? staticSessionId : sessionId, title, description, exclusive, start: moment(start).toISOString(true), location, end: moment(end).toISOString(true), participants, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

          if (!existingEvent) {
            auditLog({
              eventName: 'createCalendarEvent',
              diff: JSON.stringify(response),
              recordLocator: JSON.stringify({ id: response.id })
            }, null, { databaseIdHash }, saasContext);
          } else {
            const changes = existingEvent ? detailedDiff(existingEvent, response as CalendarEventDTO) : {};
            auditLog({
              eventName: 'updateCalendarEvent',
              diff: JSON.stringify(changes),
              recordLocator: JSON.stringify({ id: response.id })
            }, null, { databaseIdHash }, saasContext);
          }


          if (response) {
            return response;
          } else {
            return 'Event scheduling failed';
          }
        } catch (e) {
          console.error(e);
          return 'Event scheduling failed';
        }
      },
    }),
  }
}

