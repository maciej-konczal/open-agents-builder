// tools/index.ts
import { sendEmailTool } from './sendEmailTool';
import { currentDateTool } from './currentDateTool';

export const toolRegistry = {
  sendEmail: sendEmailTool,
  currentDate: currentDateTool,
};
