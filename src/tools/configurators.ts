// tools/index.ts
import { SendEmailConfigurator } from './sendEmailTool-configurator';
import { CurrentDateConfigurator } from './currentDateTool-configurator';

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
  }
}