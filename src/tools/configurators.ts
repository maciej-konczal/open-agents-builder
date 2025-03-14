// tools/index.ts
import { SendEmailConfigurator } from './sendEmailTool-configurator';
import { CurrentDateConfigurator } from './currentDateTool-configurator';
import { CalendarListConfigurator } from './calendarListTool-configurator';
import { CalendarScheduleConfigurator } from './calendarScheduleTool-configurator';
import { DayNameConfigurator } from './dayNameTool-configurator';
import { CreateOrderToolConfigurator } from './createOrderTool-configurator';
import { ListProductsConfigurator } from './listProductsTool-configurator';
import { HttpConfigurator } from './httpTool-configurator';
import { AttachmentContentConfigurator } from './attachmentContentTool-configurator';
import { ListAttachmentsConfigurator } from './listAttachmentsTool-configurator';
import { UpdateResultToolConfigurator } from './updateResultTool-configurator';
import { ExecFlowToolConfigurator } from './execFlowTool-configurator';
import { Agent } from '@/data/client/models';

type ToolConfiguratorDescriptor = {
  displayName: string;
  configurator: React.ComponentType<any>;
}

export const toolConfiguratorsRepository = {
  init: ({ agent }: { agent?: Agent }): Record<string, ToolConfiguratorDescriptor> => {

    let configurators: Record<string, ToolConfiguratorDescriptor> = {
      sendEmail: {
        displayName: 'Send Email',
        configurator: SendEmailConfigurator
      },
      currentDate: {
        displayName: 'Get current date',
        configurator: CurrentDateConfigurator
      },
      calendarList: {
        displayName: 'Access events calendar',
        configurator: CalendarListConfigurator
      },
      calendarSchedule: {
        displayName: 'Schedule events',
        configurator: CalendarScheduleConfigurator
      },
      dayName: {
        displayName: 'Get the day name',
        configurator: DayNameConfigurator
      },
      createOrderTool: {
        displayName: 'Create order',
        configurator: CreateOrderToolConfigurator
      },
      listProducts: {
        displayName: 'List products',
        configurator: ListProductsConfigurator
      },
      httpTool: {
        displayName: 'HTTP Requests',
        configurator: HttpConfigurator
      },
      attachmentContent: {
        displayName: 'Attachment Content',
        configurator: AttachmentContentConfigurator
      },
      listAttachments: {
        displayName: 'List Attachments',
        configurator: ListAttachmentsConfigurator
      },
      updateResultTool: {
        displayName: 'Update Result',
        configurator: UpdateResultToolConfigurator
      },
    }

      if (agent) {

        (agent.flows ?? []).forEach(flow => {
          configurators = {
            ...configurators,
            ['flowTool' + flow.code]: {
              displayName: 'Execute ' + flow.name + ' flow',
              configurator: ExecFlowToolConfigurator
            }
          }
        });
      }

    return configurators;
  }
}