// tools/index.ts
import { sendEmailTool } from './sendEmailTool';
import { currentDateTool } from './currentDateTool';
import { CoreTool } from 'ai';


export type ToolDescriptor = {
  displayName: string;
  tool: CoreTool
}

export const toolRegistry: Record<string, ToolDescriptor> = {
  sendEmail: sendEmailTool,
  currentDate: currentDateTool,
};
