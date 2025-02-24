// db-schema.ts

import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from "drizzle-orm";


export { attachments }  from './db-schema'

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),

  agentId: text('agentId'),

  sku: text('sku'),
  name: text('name'),
  description: text('description'),

  price: text('price', { mode: 'json' }),
  priceInclTax: text('priceInclTax', { mode: 'json' }),

  taxRate: real('taxRate'),
  taxValue: real('taxValue'),

  width: real('width'),
  height: real('height'),
  length: real('length'),
  weight: real('weight'),

  widthUnit: text('widthUnit'),
  heightUnit: text('heightUnit'),
  lengthUnit: text('lengthUnit'),
  weightUnit: text('weightUnit'),

  brand: text('brand'),
  status: text('status'),

  imageUrl: text('imageUrl'),

  attributes: text('attributes', { mode: 'json' }),
  variants: text('variants', { mode: 'json' }),
  images: text('images', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }),

  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});


// Table orders (1 row => 1 order)
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),

  // billingAddress, shippingAddress, attributes, items, notes, etc. => JSON
  billingAddress: text('billingAddress', { mode: 'json' }),
  shippingAddress: text('shippingAddress', { mode: 'json' }),
  attributes: text('attributes', { mode: 'json' }),
  notes: text('notes', { mode: 'json' }),
  statusChanges: text('statusChanges', { mode: 'json' }),
  customer: text('customer', { mode: 'json' }),

  // status, email
  status: text('status'),
  email: text('email'),

  // Price fields - in JSON format Price { value, currency }
  subtotal: text('subtotal', { mode: 'json' }),
  subTotalInclTax: text('subTotalInclTax', { mode: 'json' }),
  subtotalTaxValue: text('subtotalTaxValue', { mode: 'json' }),
  total: text('total', { mode: 'json' }),
  totalInclTax: text('totalInclTax', { mode: 'json' }),
  shippingMethod: text('shippingMethod', { mode: 'json' }),
  shippingPrice: text('shippingPrice', { mode: 'json' }),
  shippingPriceTaxRate: text('shippingPriceTaxRate', { mode: 'json' }),
  shippingPriceInclTax: text('shippingPriceInclTax', { mode: 'json' }),

  // items => array of objects (each with price, priceInclTax, etc.)
  items: text('items', { mode: 'json' }),

  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});
