// server-product-repository.ts

import { BaseRepository, IQuery } from "./base-repository";
import { ProductDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { create } from "./generic-repository";
import { products } from "./db-schema-commerce";

export default class ServerProductRepository extends BaseRepository<ProductDTO> {
  /**
   * Mapuje ProductDTO -> obiekt pasujący do "products" (drizzle)
   */
  private toDbRecord(dto: ProductDTO): any {
    return {
      id: dto.id,
      agentId: dto.agentId,
      sku: dto.sku,
      name: dto.name,
      description: dto.description,

      priceValue: dto.price?.value ?? 0,
      priceCurrency: dto.price?.currency ?? "USD",

      priceInclTaxValue: dto.priceInclTax?.value ?? 0,
      priceInclTaxCurrency: dto.priceInclTax?.currency ?? "USD",

      taxRate: dto.taxRate ?? 0,
      taxValue: dto.taxValue ?? 0,

      width: dto.width ?? 0,
      height: dto.height ?? 0,
      length: dto.length ?? 0,
      weight: dto.weight ?? 0,

      widthUnit: dto.widthUnit ?? "cm",
      heightUnit: dto.heightUnit ?? "cm",
      lengthUnit: dto.lengthUnit ?? "cm",
      weightUnit: dto.weightUnit ?? "kg",

      brand: dto.brand,
      status: dto.status,

      imageUrl: dto.imageUrl,

      // JSON
      attributes: dto.attributes ? JSON.stringify(dto.attributes) : null,
      variants: dto.variants ? JSON.stringify(dto.variants) : null,
      images: dto.images ? JSON.stringify(dto.images) : null,
      tags: dto.tags ? JSON.stringify(dto.tags) : null,

      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }

  /**
   * Mapuje dane z bazy (z kolumn) -> ProductDTO
   */
  private fromDbRecord(record: any): ProductDTO {
    return {
      id: record.id,
      agentId: record.agentId,
      sku: record.sku,
      name: record.name,
      description: record.description ?? undefined,

      price: {
        value: record.priceValue ?? 0,
        currency: record.priceCurrency ?? "USD",
      },
      priceInclTax: {
        value: record.priceInclTaxValue ?? 0,
        currency: record.priceInclTaxCurrency ?? "USD",
      },

      taxRate: record.taxRate ?? 0,
      taxValue: record.taxValue ?? 0,

      width: record.width ?? 0,
      height: record.height ?? 0,
      length: record.length ?? 0,
      weight: record.weight ?? 0,

      widthUnit: record.widthUnit ?? "cm",
      heightUnit: record.heightUnit ?? "cm",
      lengthUnit: record.lengthUnit ?? "cm",
      weightUnit: record.weightUnit ?? "kg",

      brand: record.brand,
      status: record.status,

      imageUrl: record.imageUrl ?? null,

      attributes: record.attributes ? JSON.parse(record.attributes) : [],
      variants: record.variants ? JSON.parse(record.variants) : [],
      images: record.images ? JSON.parse(record.images) : [],
      tags: record.tags ? JSON.parse(record.tags) : [],

      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(item: ProductDTO): Promise<ProductDTO> {
    const db = await this.db();
    const dbRecord = this.toDbRecord(item);
    const inserted = create(dbRecord, products, db);
    return this.fromDbRecord(inserted);
  }

  async upsert(query: Record<string, any>, item: ProductDTO): Promise<ProductDTO> {
    const db = await this.db();
    let existingRecord: any | null = null;

    if (query.id) {
      existingRecord = db.select().from(products).where(eq(products.id, query.id)).get();
    }

    if (!existingRecord) {
      // Tworzymy
      return this.create(item);
    } else {
      // Update
      const updated = { ...this.toDbRecord(item) };
      updated.updatedAt = getCurrentTS();

      db.update(products).set(updated).where(eq(products.id, query.id)).run();

      return this.fromDbRecord(updated);
    }
  }

  async delete(query: Record<string, any>): Promise<boolean> {
    const db = await this.db();
    if (query.id) {
      return db.delete(products).where(eq(products.id, query.id)).run().changes > 0;
    }
    return false;
  }

  async findAll(query?: IQuery): Promise<ProductDTO[]> {
    const db = await this.db();
    let dbQuery = db.select().from(products);

    // np. proste filtry
    if (query?.filter) {
      if (query.filter["id"]) {
        dbQuery.where(eq(products.id, query.filter["id"]));
      }
      if (query.filter["agentId"]) {
        dbQuery.where(eq(products.agentId, query.filter["agentId"]));
      }
      if (query.filter["sku"]) {
        dbQuery.where(eq(products.sku, query.filter["sku"]));
      }
      // ... inne filtry
    }

    const rows = dbQuery.all();
    return rows.map((row) => this.fromDbRecord(row));
  }
}
