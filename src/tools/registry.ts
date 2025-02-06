// tools/index.ts
import { currentDateTool } from './currentDateTool';
import { Tool } from 'ai';
import { createEmailTool } from './sendEmailTool';


export type ToolDescriptor = {
  displayName: string;
  tool: Tool
}

const resendApiKey = await getApiKey('Resend.com API Key', 'RESEND_API_KEY')

export const toolRegistry: Record<string, ToolDescriptor> = {
  sendEmail: createEmailTool({
    apiKey
  }),
  currentDate: currentDateTool,
};
