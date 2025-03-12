// tools/index.ts
import { currentDateTool } from './currentDateTool';
import { Tool } from 'ai';
import { createEmailTool } from './sendEmailTool';
import { checkApiKey } from '@/lib/utils';
import { create } from 'domain';
import { createCalendarScheduleTool } from './calendarScheduleTool';
import { createCalendarListTool } from './calendarListTool';
import { dayNameTool } from './dayNameTool';
import { createCreateOrderTool } from './createOrderTool';
import { createListProductsTool } from './listProductsTool';
import { httpTool } from './httpTool';
import { createAttachmentContentTool } from './attachmentContentTool';
import { StorageSchemas } from '@/data/dto';
import { list } from 'postcss';
import { createListAttachmentsTool } from './listAttachmentsTool';
import { createUpdateResultTool } from './updateResultTool';


export type ToolDescriptor = {
  displayName: string;
  tool: Tool
}

let availableTools:Record<string, ToolDescriptor> | null = null;

export const toolRegistry = {
  init: ({ databaseIdHash, storageKey, agentId, sessionId }: {agentId: string, sessionId: string, databaseIdHash: string, storageKey: string | undefined | null}): Record<string, ToolDescriptor> => {
    if (availableTools !== null) return availableTools;
    availableTools = {
      sendEmail: createEmailTool({
        apiKey: checkApiKey('Resend.com API key', 'RESEND_API_KEY', process.env.RESEND_API_KEY || ''),
      }),
      currentDate: currentDateTool,
      calendarSchedule: createCalendarScheduleTool(agentId, sessionId, databaseIdHash, storageKey),
      calendarList: createCalendarListTool(agentId, sessionId, databaseIdHash, storageKey),
      dayName: dayNameTool,
      createOrderTool: createCreateOrderTool(databaseIdHash, agentId, sessionId, storageKey),
      listProducts: createListProductsTool(databaseIdHash),
      attachmentContent: createAttachmentContentTool(databaseIdHash, storageKey, StorageSchemas.Default),
      listAttachments: createListAttachmentsTool(databaseIdHash, storageKey, StorageSchemas.Default),
      updateResultTool: createUpdateResultTool(databaseIdHash, storageKey),
      httpTool: httpTool
    }

    return availableTools;
  }
}
