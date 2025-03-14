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
import { createExecFlowTool } from './execFlowTool';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import { Agent } from '@/data/client/models';
import { AuthorizedSaaSContext } from '@/lib/generic-api';


export type ToolDescriptor = {
  displayName: string;
  tool: Tool;
  injectStreamingController?: (streamingController: ReadableStreamDefaultController<any>) => void;
}

let availableTools:Record<string, ToolDescriptor> | null = null;

export const toolRegistry = {
  init: ({ saasContext, databaseIdHash, storageKey, agentId, agent, sessionId, streamingController }: { saasContext?: AuthorizedSaaSContext, agentId: string, sessionId: string, agent?: Agent, databaseIdHash: string, storageKey: string | undefined | null, streamingController?: ReadableStreamDefaultController<any> }): Record<string, ToolDescriptor> => {

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
      httpTool: httpTool,
    }

      if (agent) {

        (agent.flows ?? []).forEach(flow => {
            const flowTool = createExecFlowTool({
              flow,
              agentId: agent.id ?? '',
              masterAgent: agent, 
              saasContext,
              databaseIdHash,
              sessionId,
              currentDateTimeIso: new Date().toISOString(),
              currentLocalDateTime: new Date().toLocaleString(),
              currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              streamingController          
          })
          availableTools = {
            ...availableTools,
            ['flowTool' + flow.code]: flowTool
          }
        });
      }
    return availableTools;
  }
}
