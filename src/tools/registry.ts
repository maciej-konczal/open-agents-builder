// tools/index.ts
import { currentDateTool } from './currentDateTool';
import { Tool } from 'ai';
import { createEmailTool } from './sendEmailTool';
import { checkApiKey } from '@/lib/utils';
import { create } from 'domain';
import { createCalendarScheduleTool } from './calendarScheduleTool';
import { createCalendarListTool } from './calendarListTool';


export type ToolDescriptor = {
  displayName: string;
  tool: Tool
}

let availableTools:Record<string, ToolDescriptor> | null = null;

export const toolRegistry = {
  init: ({ databaseIdHash, storageKey }: {databaseIdHash: string, storageKey: string | null}): Record<string, ToolDescriptor> => {
    if (availableTools !== null) return availableTools;
    availableTools = {
      sendEmail: createEmailTool({
        apiKey: checkApiKey('Resend.com API key', 'RESEND_API_KEY', process.env.RESEND_API_KEY || ''),
      }),
      currentDate: currentDateTool,
      calendarSchedule: createCalendarScheduleTool(databaseIdHash, storageKey),
      calendarList: createCalendarListTool(databaseIdHash, storageKey)
    }

    return availableTools;
  }
}
