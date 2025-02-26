import { z } from 'zod';
import { tool } from 'ai';
import ServerCalendarRepository from '@/data/server/server-calendar-repository';
import { ToolDescriptor } from './registry';
import ServerOrderRepository from '@/data/server/server-order-repository';

export function createOrderListTool(agentId: string, sessionId: string, databaseIdHash: string, storageKey: string | undefined | null, alwaysFullVisibility: boolean = false): ToolDescriptor
{
  return {
    displayName: 'Access orders',
    tool: tool({
      description: 'List all orders. Always list orders BEFORE creating a new one to check the status of the existing orders',
      parameters: z.object({
        limitedVisibility: z.boolean().optional().default(false).describe('If the orders should be anonymized - by default should be false unless instructed otherwise'),
      }),
      execute: async ({ limitedVisibility }) => {
        try {
          const ordersRepo = new ServerOrderRepository(databaseIdHash, "commerce", storageKey);
          const response =  await ordersRepo.findAll({
            filter: {
              agentId
            }
          })

          if (response && response.length > 0 && (limitedVisibility && !alwaysFullVisibility)) {
            return response.map(evt => {
              return { ...evt, billingAddress: 'ANONYMIZED', shippingAddress: 'ANONYMIZED' }
            })
          }

          return response;
        } catch (e) {
          console.error(e);
          return 'Order list failed';
        }
      },
    }),
  }
}

