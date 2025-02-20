// db-schema.ts

import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from "drizzle-orm";

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
