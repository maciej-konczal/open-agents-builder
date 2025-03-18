import { z } from 'zod';
import { tool } from 'ai';
import { ToolDescriptor } from './registry';
import { FlowChunkEvent, FlowChunkType } from '@/flows/models';
import { getErrorMessage } from '@/lib/utils';


export function createRenderComponentTool(databaseIdHash: string, componentName: string, traceLog: (chunk: FlowChunkEvent) => void, props: z.ZodType<any>): ToolDescriptor {
  return {
    displayName: 'Render component to the user',
    tool: tool({
      description: 'Render component to the user from the list of avaialble components',
      parameters: z.object({
        flowNodeId: z.string().describe('The unique of the flow node'),
        props,
      }),
      execute: async ({ flowNodeId, props }) => {
        try {
          const chunk: FlowChunkEvent = {
            flowNodeId,
            type: FlowChunkType.UIComponent,
            component: componentName,
            componentProps: props
          }
          traceLog(chunk);
          return chunk;
        } catch (e) {
          console.error(e);
          return getErrorMessage(e);
        }
      },
    }),
  }
}

