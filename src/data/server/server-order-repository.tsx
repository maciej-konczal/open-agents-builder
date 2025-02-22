// server-order-repository.ts

import { BaseRepository, IQuery } from "./base-repository";
import { OrderDTO, PaginatedResult } from "../dto";
import { asc, count, desc, eq, like, or } from "drizzle-orm";
import { create } from "./generic-repository";
import { getCurrentTS, safeJsonParse } from "@/lib/utils";
import { orders } from "./db-schema-commerce";
import { EncryptionUtils } from "@/lib/crypto";

export default class ServerOrderRepository extends BaseRepository<OrderDTO> {

    storageKey: string | null | undefined;
    encUtils: EncryptionUtils | null = null;

    constructor(databaseIdHash: string, databaseSchema: string = '', storageKey: string | null | undefined, databasePartition: string ='') {
        super(databaseIdHash, databaseSchema, databasePartition);
        this.storageKey = storageKey
        if (storageKey){
            this.encUtils = new EncryptionUtils(storageKey);
        }
    }

// 1) Mapping to database (JSON)
  private async toDbRecord(dto: OrderDTO): Promise<any> {
    return {
      id: dto.id,
      billingAddress: await this.encUtils?.encrypt(JSON.stringify(dto.billingAddress || {})),
      shippingAddress: await this.encUtils?.encrypt(JSON.stringify(dto.shippingAddress || {})),
      attributes: await this.encUtils?.encrypt(JSON.stringify(dto.attributes || {})),
      notes: await this.encUtils?.encrypt(JSON.stringify(dto.notes || [])),
      statusChanges: JSON.stringify(dto.statusChanges || []),
      customer: await this.encUtils?.encrypt(JSON.stringify(dto.customer || {})),

      status: dto.status || "",
      email: await this.encUtils?.encrypt(dto.email || ""),

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
  private async fromDbRecord(record: any): Promise<OrderDTO> {

    return {
      id: record.id,
      billingAddress: safeJsonParse(await this.encUtils?.decrypt(record.billingAddress) || '', {}),
      shippingAddress: safeJsonParse(await this.encUtils?.decrypt(record.shippingAddress) || '', {}),
      attributes: safeJsonParse(await this.encUtils?.decrypt(record.attributes) || '', {}),
      notes: safeJsonParse(await this.encUtils?.decrypt(record.notes) || '', []),
      statusChanges: safeJsonParse(record.statusChanges, []),
      customer: safeJsonParse(await this.encUtils?.decrypt(record.customer) || '', {}),

      status: record.status,
      email: await this.encUtils?.decrypt(record.email) || '',

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
    const dbRecord = await this.toDbRecord(item);
    const inserted = await create(dbRecord, orders, db);
    return await this.fromDbRecord(inserted);
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
      const updated = { ...(await this.toDbRecord(item)) };
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
    return await Promise.all(rows.map((r) => this.fromDbRecord(r)));
  }

  async queryAll({ id, limit, offset, orderBy, query }: 
    { limit: number; offset: number; orderBy: string; query: string; id?: string; }
  ): Promise<PaginatedResult<OrderDTO[]>> {
    const db = await this.db();

    // Default sorting – e.g., by date descending
    let orderColumn = desc(orders.createdAt);

    switch (orderBy) {
      case "status":
        orderColumn = asc(orders.status);
        break;
      case "email":
        orderColumn = asc(orders.email);
        break;
      case "createdAt":
      default:
        orderColumn = desc(orders.createdAt);
        break;
    }

    let whereCondition = null;
    if (query) {
      whereCondition = or(
        like(orders.email, `%${query}%`),
        like(orders.status, `%${query}%`)
      );
    }

    if (id) {
      whereCondition = eq(orders.id, id); // select single order by id
    }

    const countQuery = db
      .select({ count: count() })
      .from(orders)
      .where(whereCondition ?? undefined)
      .execute();

    // Fetch records
    let dbRecords = db
      .select()
      .from(orders)
      .where(whereCondition ?? undefined)
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset)
      .all();

    const total = (await countQuery)[0].count;

    // Convert to OrderDTO
    const rows = await Promise.all(dbRecords.map((r) => this.fromDbRecord(r)));

    return {
      rows,
      total,
      limit,
      offset,
      orderBy,
      query,
    };
  }
  
}
