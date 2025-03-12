import { z } from "zod";
import { tool } from "ai";
import { ToolDescriptor } from "./registry";

// Repos / modele (przykładowe importy)
import ServerProductRepository from "@/data/server/server-product-repository";
import { AttachmentDTO, ProductDTO } from "@/data/dto";
import { getErrorMessage } from "@/lib/utils";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";

// Parametry Zod do wyszukiwania
const listAttachmentsParamsSchema = z.object({
  query: z.string().optional().describe("Optional string to filter attachmtns by storageKey, filename or mimeType"),
  mimeTypes: z.string().optional().describe("Optional array of mime types to filter attachments, comma separated"),
  limit: z.number().int().positive().default(10).describe("Number of products to return"),
  offset: z.number().int().nonnegative().default(0).describe("Offset for pagination"),
});

export function createListAttachmentsTool(
  databaseIdHash: string,
  storageKey: string | null | undefined,
  storagePartition: string
): ToolDescriptor {
  return {
    displayName: "List attachments/files tool",
    tool: tool({
      description: "Lists attachments/files. If 'query' is given, returns attachments matching the fileName or mimeType.",
      parameters: listAttachmentsParamsSchema,
      execute: async (params) => {
        const { query, limit, offset, mimeTypes } = params;

        try {
          const attRepo = new ServerAttachmentRepository(databaseIdHash, storageKey, storagePartition);

          let all: AttachmentDTO[];
          if (query && query.trim().length > 0 || mimeTypes && mimeTypes.length > 0) {
            // W zależności od implementacji repo
            all = (await attRepo.queryAll({
              query: query ?? '',
              mimeTypes: mimeTypes ? mimeTypes.split(',') : [],
              limit,
              offset,
              orderBy: "displayName",
            })).rows;
          } else {
            all = await attRepo.findAll();
          }

          return all.map(at => {
            return {
              id: at.id,
              displayName: at.displayName,
              mimeType: at.mimeType,
              storageKey: at.storageKey,
              createdAt: at.createdAt,
              updatedAt: at.updatedAt,
              url: `${process.env.APP_URL}/storage/attachment/${databaseIdHash}/${at.storageKey}`,
            }
          });
        } catch (err) {
          console.error(err);
          return `Error listing products: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
