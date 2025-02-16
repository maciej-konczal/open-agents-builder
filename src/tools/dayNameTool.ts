import { z } from 'zod';
import { tool } from 'ai';

export const dayNameTool = {
  displayName: 'Get the day name',
  tool: tool({
    description: 'Get the current date',
    parameters: z.object({
      locale: z.string().optional().describe('The locale to use for the day name like: en-US, pl-PL etc'),
      date: z.string().describe('The date to get the day name for in ISO format'),
    }),
    execute: async ({ date, locale }) => {
      return new Date(date).toLocaleDateString(locale, { weekday: 'long' });
    },
  }),
};

