import { z } from 'zod';
import { tool } from 'ai';
import { ToolDescriptor } from './registry';
import { FlowChunkEvent } from '@/flows/models';


export function createTraceTool(databaseIdHash: string, traceLog: (chunk: FlowChunkEvent) => void, storageKey: string | undefined | null): ToolDescriptor
{
    return {
    displayName: 'Interactively inform the user',
    tool:tool({
        description: 'Inform the UI - sending status to the user; only when user ask you explcitly to trace something or to use this tool. Otherwise don not use it',
        parameters: z.object({
            type: z.string().describe('Required type of the trace: message, step, result, error'),
            name: z.string().optional(),
            timestamp: z.date().optional(),
            result: z.union([z.string(), z.array(z.string())]).optional().describe('Trace result - optional'),
            message: z.string().optional().describe('Trace message'),
        }),
        execute: async (params: FlowChunkEvent) => {
            try {
                if(!params.timestamp) params.timestamp = new Date();
                traceLog(params);
                return 'Trace saved!';
            } catch (e) {
              console.error(e);
              return 'Error saving trace';
            }
          },
        }),
      }
    }

