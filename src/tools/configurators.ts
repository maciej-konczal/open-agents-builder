// tools/index.ts
import { SendEmailConfigurator } from './sendEmailTool-configurator';
import { CurrentDateConfigurator } from './currentDateTool-configurator';

export const toolConfigurators: Record<string, React.ComponentType<any>> = {
  sendEmail: SendEmailConfigurator,
  currentDate: CurrentDateConfigurator,
}