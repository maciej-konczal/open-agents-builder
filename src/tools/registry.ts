// tools/index.ts
import { currentDateTool } from './currentDateTool';
import { Tool } from 'ai';
import { createEmailTool } from './sendEmailTool';
import { checkApiKey } from '@/lib/utils';


export type ToolDescriptor = {
  displayName: string;
  tool: Tool
}

let availableTools:Record<string, ToolDescriptor> | null = null;

export const toolRegistry = {
  init: (): Record<string, ToolDescriptor> => {
    console.log('RAK', process.env.RESEND_API_KEY);
    if (availableTools !== null) return availableTools;
    availableTools = {
      sendEmail: createEmailTool({
        apiKey: checkApiKey('Resend.com API key', 'RESEND_API_KEY', process.env.RESEND_API_KEY || ''),
      }),
      currentDate: currentDateTool,    
    }

    return availableTools;
  }
}
