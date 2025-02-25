import { z } from "zod";
import { tool } from "ai";
import { ToolDescriptor } from "./registry";

// Repos / modele (przykładowe importy)
import ServerProductRepository from "@/data/server/server-product-repository";
import { ProductDTO } from "@/data/dto";
import { getErrorMessage } from "@/lib/utils";

// Parametry Zod do wyszukiwania
const listProductsParamsSchema = z.object({
  query: z.string().optional().describe("Optional string to filter products by SKU or name"),
  limit: z.number().int().positive().default(10).describe("Number of products to return"),
  offset: z.number().int().nonnegative().default(0).describe("Offset for pagination"),
});

export function createListProductsTool(
  databaseIdHash: string
): ToolDescriptor {
  return {
    displayName: "List products tool",
    tool: tool({
      description: "Lists products. If 'query' is given, returns products matching SKU or name. Otherwise returns all products.",
      parameters: listProductsParamsSchema,
      execute: async (params) => {
        const { query, limit, offset } = params;

        try {
          const productRepo = new ServerProductRepository(databaseIdHash);
          let all: ProductDTO[];

          if (query && query.trim().length > 0) {
            // W zależności od implementacji repo
            all = (await productRepo.queryAll({
              query,
              limit,
              offset,
              orderBy: "name",
            })).rows;
          } else {
            all = await productRepo.findAll();
          }

          return all;
        } catch (err) {
          console.error(err);
          return `Error listing products: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
