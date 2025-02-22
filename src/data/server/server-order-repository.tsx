// server-order-repository.ts

import { BaseRepository, IQuery } from "./base-repository";
import { OrderDTO } from "../dto";
import { eq } from "drizzle-orm";
import { create } from "./generic-repository";
import { getCurrentTS, safeJsonParse } from "@/lib/utils";
import { orders } from "./db-schema-commerce";

export default class ServerOrderRepository extends BaseRepository<OrderDTO> {
// 1) Mapping to database (JSON)
  private toDbRecord(dto: OrderDTO): any {
    return {
      id: dto.id,
      billingAddress: JSON.stringify(dto.billingAddress || {}),
      shippingAddress: JSON.stringify(dto.shippingAddress || {}),
      attributes: JSON.stringify(dto.attributes || {}),
      notes: JSON.stringify(dto.notes || []),
      statusChanges: JSON.stringify(dto.statusChanges || []),
      customer: JSON.stringify(dto.customer || {}),

      status: dto.status || "",
      email: dto.email || "",

    // Price fields => JSON
      subtotal: JSON.stringify(dto.subtotal || {}),
      subTotalInclTax: JSON.stringify(dto.subTotalInclTax || {}),
      subtotalTaxValue: JSON.stringify(dto.subtotalTaxValue || {}),
      total: JSON.stringify(dto.total || {}),
      totalInclTax: JSON.stringify(dto.totalInclTax || {}),
      shippingPrice: JSON.stringify(dto.shippingPrice || {}),
      shippingPriceInclTax: JSON.stringify(dto.shippingPriceInclTax || {}),

      items: JSON.stringify(dto.items || []),

      createdAt: dto.createdAt || getCurrentTS(),
      updatedAt: dto.updatedAt || getCurrentTS(),
    };
  }

// 2) Reading from database => JSON.parse
  private fromDbRecord(record: any): OrderDTO {

    return {
      id: record.id,
      billingAddress: safeJsonParse(record.billingAddress, {}),
      shippingAddress: safeJsonParse(record.shippingAddress, {}),
      attributes: safeJsonParse(record.attributes, {}),
      notes: safeJsonParse(record.notes, []),
      statusChanges: safeJsonParse(record.statusChanges, []),
      customer: safeJsonParse(record.customer, {}),

      status: record.status,
      email: record.email,

      subtotal: safeJsonParse(record.subtotal, {}),
      subTotalInclTax: safeJsonParse(record.subTotalInclTax, {}),
      subtotalTaxValue: safeJsonParse(record.subtotalTaxValue, {}),
      total: safeJsonParse(record.total, {}),
      totalInclTax: safeJsonParse(record.totalInclTax, {}),
      shippingPrice: safeJsonParse(record.shippingPrice, {}),
      shippingPriceInclTax: safeJsonParse(record.shippingPriceInclTax, {}),

      items: safeJsonParse(record.items, []),

      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(item: OrderDTO): Promise<OrderDTO> {
    const db = await this.db();
    const dbRecord = this.toDbRecord(item);
    const inserted = create(dbRecord, orders, db);
    return this.fromDbRecord(inserted);
  }

  async upsert(query: Record<string, any>, item: OrderDTO): Promise<OrderDTO> {
    const db = await this.db();
    let existing: any | null = null;

    if (query.id) {
      existing = db.select().from(orders).where(eq(orders.id, query.id)).get();
    }

    if (!existing) {
      // create
      return this.create(item);
    } else {
      // update
      const updated = { ...this.toDbRecord(item) };
      updated.updatedAt = getCurrentTS();
      db.update(orders).set(updated).where(eq(orders.id, query.id)).run();
      return this.fromDbRecord(updated);
    }
  }

  async delete(query: Record<string, any>): Promise<boolean> {
    const db = await this.db();
    if (query.id) {
      const res = db.delete(orders).where(eq(orders.id, query.id)).run();
      return res.changes > 0;
    }
    return false;
  }

  async findAll(query?: IQuery): Promise<OrderDTO[]> {
    const db = await this.db();
    let dbQuery = db.select().from(orders);

    if (query?.filter) {
      if (query.filter["id"]) {
        dbQuery.where(eq(orders.id, query.filter["id"]));
      }
      if (query.filter["status"]) {
        dbQuery.where(eq(orders.status, query.filter["status"]));
      }
    }

    const rows = dbQuery.all();
    return rows.map((r) => this.fromDbRecord(r));
  }

  
}
