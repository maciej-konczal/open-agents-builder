// tools/index.ts
import { SendEmailConfigurator } from './sendEmailTool-configurator';
import { CurrentDateConfigurator } from './currentDateTool-configurator';
import { CalendarListConfigurator } from './calendarListTool-configurator';
import { CalendarScheduleConfigurator } from './calendarScheduleTool-configurator';

type ToolConfiguratorDescriptor = {
  displayName: string;
  configurator: React.ComponentType<any>;
}

export const toolConfigurators: Record<string, ToolConfiguratorDescriptor> = {
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
  }
}