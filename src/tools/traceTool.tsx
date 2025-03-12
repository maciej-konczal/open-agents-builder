import { z } from 'zod';
import { tool } from 'ai';
import { ResultDTO } from '@/data/dto';
import ServerResultRepository from '@/data/server/server-result-repository';
import { ToolDescriptor } from './registry';
import ServerSessionRepository from '@/data/server/server-session-repository';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import { Agent } from '@/data/client/models';
import { Resend } from 'resend';
import i18next from 'i18next';
import { auditLog, authorizeSaasContext, authorizeSaasToken } from '@/lib/generic-api';
import { detailedDiff } from 'deep-object-diff';
import { Chunk } from '@/flows/models';


export function createTraceTool(databaseIdHash: string, traceLog: (chunk: Chunk) => void, storageKey: string | undefined | null): ToolDescriptor
{
    return {
    displayName: 'Trace status',
    tool:tool({
        description: 'Trace status',
        parameters: z.object({
            type: z.string().describe('Required type of the trace: message, step, result, error'),
            name: z.string().optional(),
            timestamp: z.date().optional(),
            result: z.union([z.string(), z.array(z.string())]).optional().describe('Trace result - optional'),
            message: z.string().optional().describe('Trace message'),
        }),
        execute: async (params: Chunk) => {
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

