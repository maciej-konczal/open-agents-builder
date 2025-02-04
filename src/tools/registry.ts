// tools/index.ts
import { sendEmailTool } from './sendEmailTool';
import { currentDateTool } from './currentDateTool';
import { Tool } from 'ai';


export type ToolDescriptor = {
  displayName: string;
  tool: Tool
}

export const toolRegistry: Record<string, ToolDescriptor> = {
  sendEmail: sendEmailTool,
  currentDate: currentDateTool,
};
