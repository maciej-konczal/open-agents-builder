import { z } from "zod";
import { tool } from "ai";
import { ToolDescriptor } from "./registry";

import ServerProductRepository from "@/data/server/server-product-repository";
import ServerOrderRepository from "@/data/server/server-order-repository";
import { ProductDTO, OrderDTO, priceSchema } from "@/data/dto";
import { getCurrentTS, getErrorMessage } from "@/lib/utils";
import { defaultOrderId, Order, ORDER_STATUSES, Product } from "@/data/client/models";
import { nanoid } from "nanoid";


const simplifiedAddressSchema = z.object({
  address1: z.string().optional().describe("Address line 1 eg Street name and number"),
  city: z.string().optional().describe("City name"),
  name: z.string().optional().describe("Full name of the recipient or company name"),
  phone: z.string().optional().describe("Phone number - optional"),
  summary: z.string().optional().describe("Summary of the address could be whole adress combined or some notes etc"),
  postalCode: z.string().optional().describe("Postal code"),
});

const simplifiedNoteSchema = z.object({
  date: z.string().describe("Date of the note"),
  message: z.string().describe("Content of the note"),
  author: z.string().optional().describe("Author of the note"),
});


// A single item in the order
const simplifiedOrderItemSchema = z.object({
  id: z.string().optional().describe("Unique ID of the order item used only for updates"),
  name: z.string().describe("Name of the product"),
  productSku: z.string().optional().describe("Product SKU"),
  variantSku: z.string().optional().describe("Variant SKU if variant selected"),
  message: z.string().optional(),
  customOptions: z.array(z.object({ name: z.string(), value: z.string() })).optional(),

  price: priceSchema,
  priceInclTax: priceSchema.optional(),
  taxRate: z.number().min(0).max(1).optional(),

  quantity: z.number().min(1),
});

// Parametry do tworzenia zamówienia
const createOrderParamsSchema = z.object({

  id: z.string().optional().describe("Optional ID of the order if passed the order will be updated instead of created. Pass empty string to create new order."),

  billingAddress: simplifiedAddressSchema.optional().describe("Billing address"),
  shippingAddress: simplifiedAddressSchema.optional().describe("Shipping address"),

  notes: z.array(simplifiedNoteSchema).optional().describe("Array of notes for the order"),
  email: z.string().email().describe("Customer email"),

  status: z.string().default("shopping_cart").describe("Order status - default is 'shopping_cart' and works like shopping cart, other statuses are: " + ORDER_STATUSES.map(os => os.value).join(", ")),

  items: z.array(simplifiedOrderItemSchema),

  shippingPrice: priceSchema.optional().describe("Shipping price"),
  shippingPriceInclTax: priceSchema.optional().describe("Shipping price including tax"),
  shippingMethod: z.string().optional().default("Standard"),

  virtualProducts: z.boolean().optional().default(false).describe("Is this order for virtual products so the will not be verified"),
});

/** need to set:
 * 
 *   productId: z.string().optional().describe("Product ID"),
  variantId: z.string().optional().describe("Variant ID if variant selected"),

  variantName: z.string().optional().,

 */

export function createCreateOrderTool(
  databaseIdHash: string,
  agentId: string,
  sessionId: string,
  storageKey?: string | undefined | null
): ToolDescriptor {
  return {
    displayName: "Create order tool",
    tool: tool({
      description: "Creates a new order with validation: each line item must not have price below the product's price. If product has variants, 'variantId' must be valid. Then it calculates totals and saves the order.",
      parameters: createOrderParamsSchema,
      execute: async (params) => {
        const { id, items, shippingPrice, status, shippingPriceInclTax, shippingMethod, shippingAddress, billingAddress, email } = params;

        try {
          const productRepo = new ServerProductRepository(databaseIdHash, "commerce");
          const orderRepo = new ServerOrderRepository(databaseIdHash, "commerce", storageKey);

          // Walidacja linii
          const validatedLines = []
          for (const line of items) {

            let foundVar = undefined
            let foundProd = undefined

            let itemPrice = undefined
            let itemPriceInclTax = undefined
            let itemTaxRate = undefined

            if (!params.virtualProducts) {
              // 1) Znajdź produkt po SKU
              const foundProds = await productRepo.findAll({
                filter: { sku: line.productSku },
              });
              if (foundProds.length === 0) {
                return `No product found with SKU=${line.productSku}`;
              }
              const prodDTO = foundProds[0];
              foundProd = Product.fromDTO(prodDTO);

              // 2) Sprawdź wariant
              if (line.variantSku && line.variantSku.trim().length > 0) {
                foundVar = foundProd.variants?.find((v) => v.sku === line.variantSku);
                if (!foundVar) {
                  return `Variant SKU=${line.productSku} not found in product SKU=${line.productSku}`;
                }
                // Walidacja minimalnej ceny
                if (line.price.value < (foundVar.price?.value || 0)) {
                  return `Line price ${line.price} is below product variant price ${foundVar.price?.value || 0} for variant ${foundVar.sku}`;
                }

                itemPrice = foundVar.price
                itemPriceInclTax = foundVar.priceInclTax
                itemTaxRate = foundVar.taxRate
              } else {
                // Walidacja minimalnej ceny z product
                if (line.price.value < (foundProd.price?.value || 0)) {
                  return `Line price ${line.price} is below product base price ${foundProd.price?.value || 0} for SKU=${line.productSku}`;
                }

                itemPrice = foundProd.price
                itemPriceInclTax = foundProd.priceInclTax
                itemTaxRate = foundProd.taxRate
              }
            }


            validatedLines.push({
              id: line.id ?? nanoid(),
              name: line.name ? line.name : foundProd?.name ?? line.productSku,
              productSku: line.productSku,
              variantSku: line.variantSku,
              variantId: foundVar?.id ?? line.variantSku,
              quantity: Math.max(0, line.quantity),
              taxRate: itemTaxRate ? itemTaxRate : line.taxRate,
              price: itemPrice ? itemPrice : line.price,
              priceInclTax: itemPriceInclTax ? itemPriceInclTax : line.priceInclTax
            })
          }

          // Składamy OrderDTO
          const dto: OrderDTO = {
            // id: undefined
            id: id || defaultOrderId(),
            agentId,
            sessionId,
            items: validatedLines,
            shippingPrice,
            shippingPriceInclTax,
            shippingMethod,
            billingAddress,
            shippingAddress,
            email,
            status,
            updatedAt: getCurrentTS()
          };

          if (!id) {
            dto.createdAt = getCurrentTS();
          }

          // Obliczamy totals (po stronie modelu)
          const order = Order.fromDTO(dto);
          order.calcTotals();

          // Zapis
          const saved = id ? await orderRepo.upsert({ id }, order.toDTO()) : await orderRepo.create(order.toDTO());

          if (saved) {
            return saved;
          } else {
            return "Error creating order";
          }
        } catch (err) {
          console.error(err);
          return `Error creating order: ${getErrorMessage(err)}`;
        }
      },
    }),
  };
}
