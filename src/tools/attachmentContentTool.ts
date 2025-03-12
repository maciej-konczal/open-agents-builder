import { z } from 'zod';
import { tool } from 'ai';
import { ToolDescriptor } from './registry';
import ServerAttachmentRepository from '@/data/server/server-attachment-repository';
import { getErrorMessage } from '@/lib/utils';

const attachmentContentToolParamsSchema = z.object({
  id: z.string().optional().describe("String to filter attachmtns by storageKey, filename or mimeType")
});

export function createAttachmentContentTool(
  databaseIdHash: string,
  storageKey: string | null | undefined,
  storagePartition: string
): ToolDescriptor {
  return {
    displayName: "Get the attachment content",
    tool: tool({
      description: "Get the attachment content identified by id or storageKey or displayName",
      parameters: attachmentContentToolParamsSchema,
      execute: async (params) => {
        const { id } = params;
      
        try {
          const attRepo = new ServerAttachmentRepository(databaseIdHash, storageKey, storagePartition);
          const attachments = await attRepo.queryAll({ query: id ?? '', limit: 1, offset: 0, orderBy: "displayName" });

          if (attachments.rows.length === 0) {
            return `No attachment found with id=${id}`;
          }

          const content = attachments.rows[0].content;
          return content;
        } catch (err) {
          console.error(err);
          return `Error listing attachments: ${getErrorMessage(err)}`;
        }
      }
    })
  }
}