import { z } from "zod";
import { tool } from "ai";
import { ToolDescriptor } from "./registry";

import ServerProductRepository from "@/data/server/server-product-repository";
import ServerOrderRepository from "@/data/server/server-order-repository";
import { ProductDTO, OrderDTO } from "@/data/dto";
import { Product } from "@/data/client/models/product";
import { Order } from "@/data/client/models/order";
import { getCurrentTS } from "@/lib/utils";

// Parametry do tworzenia zamówienia
const createOrderParamsSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string().describe("Product SKU"),
      variantId: z.string().optional().describe("Variant ID if product has variants"),
      price: z.number().min(0).describe("Line item net price – must not be below product price"),
      quantity: z.number().min(1).default(1),
    })
  ).describe("Array of line items"),

  shippingPrice: z.number().optional().default(0),
  shippingPriceInclTax: z.number().optional().default(0),
});

export function createCreateOrderTool(
  databaseIdHash: string
): ToolDescriptor {
  return {
    displayName: "Create order tool",
    tool: tool({
      description: "Creates a new order with validation: each line item must not have price below the product's price. If product has variants, 'variantId' must be valid. Then it calculates totals and saves the order.",
      parameters: createOrderParamsSchema,
      execute: async (params) => {
        const { items, shippingPrice, shippingPriceInclTax } = params;

        try {
          const productRepo = new ServerProductRepository(databaseIdHash);
          const orderRepo = new ServerOrderRepository(databaseIdHash);

          // Walidacja linii
          for (const line of items) {
            // 1) Znajdź produkt po SKU
            const foundProds = await productRepo.findAll({
              filter: { sku: line.sku },
            });
            if (foundProds.length === 0) {
              return `No product found with SKU=${line.sku}`;
            }
            const prodDTO = foundProds[0];
            const prod = Product.fromDTO(prodDTO);

            // 2) Sprawdź wariant
            if (line.variantId && line.variantId.trim().length > 0) {
              const foundVar = prod.variants?.find((v) => v.id === line.variantId);
              if (!foundVar) {
                return `Variant ID=${line.variantId} not found in product SKU=${line.sku}`;
              }
              // Walidacja minimalnej ceny
              if (line.price < foundVar.price.value) {
                return `Line price ${line.price} is below product variant price ${foundVar.price.value} for variant ${foundVar.id}`;
              }
            } else {
              // Walidacja minimalnej ceny z product
              if (line.price < prod.price.value) {
                return `Line price ${line.price} is below product base price ${prod.price.value} for SKU=${line.sku}`;
              }
            }
          }

          // Składamy OrderDTO
          const dto: OrderDTO = {
            // id: undefined
            items: items.map((line) => ({
              id: crypto.randomUUID(),
              sku: line.sku,
              variantId: line.variantId,
              quantity: line.quantity,
              price: { value: line.price, currency: "USD" },
            })),
            shippingPrice: { value: shippingPrice || 0, currency: "USD" },
            shippingPriceInclTax: { value: shippingPriceInclTax || 0, currency: "USD" },

            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Obliczamy totals (po stronie modelu)
          const order = Order.fromDTO(dto);
          order.calcTotals();

          // Zapis
          const saved = await orderRepo.create(order.toDTO());

          if (saved) {
            return `Order created with ID=${saved.id}, total=${saved.total?.value}`;
          } else {
            return "Error creating order";
          }
        } catch (err) {
          console.error(err);
          return `Error creating order: ${String(err)}`;
        }
      },
    }),
  };
}
