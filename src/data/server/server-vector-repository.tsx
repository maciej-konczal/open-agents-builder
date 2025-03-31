// src/data/server/server-vector-repository.ts

import { BaseRepository, IFilter } from "./base-repository";
import { PaginatedResult, VectorMemoryDTO } from "../dto";
import { vectorMemory } from "./db-schema-vector"; // your Drizzle table schema
import { asc, desc, eq, like, or, sql } from "drizzle-orm";
import { create } from "./generic-repository";
import { getCurrentTS } from "@/lib/utils";
// If you want encryption, import: import { EncryptionUtils } from "@/lib/crypto";



export class VectorMemoryRepository extends BaseRepository<VectorMemoryDTO> {
  constructor(
    databaseIdHash: string,
    databaseSchema: string = "",
    databasePartition: string = "",
    // storageKey?: string // if you want encryption
  ) {
    super(databaseIdHash, databaseSchema, databasePartition);
  }

  async create(item: VectorMemoryDTO): Promise<VectorMemoryDTO> {
    const db = await this.db();
    item.createdAt = getCurrentTS();
    item.updatedAt = getCurrentTS();
    return create(item, vectorMemory, db);
  }

  async delete(query: Record<string, any>): Promise<boolean> {
    // Usually, we pass { collectionName } to remove an entire "file"
    // or { collectionName, id } to remove a single record
    const db = await this.db();
    if (query.collectionName && !query.id) {
      // Delete entire "filename" group
      const result = db
        .delete(vectorMemory)
        .where(eq(vectorMemory.collectionName, query.collectionName))
        .run();
      return result.changes > 0;
    }

    if (query.collectionName && query.id) {
      const result = db
        .delete(vectorMemory)
        .where(eq(vectorMemory.collectionName, query.collectionName))
        .where(eq(vectorMemory.id, query.id))
        .run();
      return result.changes > 0;
    }
    return false;
  }

  async upsert(query: Record<string, any>, item: VectorMemoryDTO): Promise<VectorMemoryDTO> {
    const db = await this.db();
    const existing = db
      .select()
      .from(vectorMemory)
      .where(eq(vectorMemory.collectionName, query.collectionName ?? item.collectionName))
      .where(eq(vectorMemory.id, query.id ?? item.id))
      .get() as VectorMemoryDTO | undefined;

    if (!existing) {
      return this.create(item);
    } else {
      item.updatedAt = getCurrentTS();
      db
        .update(vectorMemory)
        .set(item)
        .where(eq(vectorMemory.collectionName, existing.collectionName))
        .where(eq(vectorMemory.id, existing.id))
        .run();
      return item;
    }
  }

  async findOne(query: IFilter): Promise<VectorMemoryDTO | null> {
    // e.g. { collectionName, id }
    const db = await this.db();
    const record = db
      .select()
      .from(vectorMemory)
      .where(eq(vectorMemory.collectionName, query.collectionName))
      .where(eq(vectorMemory.id, query.id))
      .get() as VectorMemoryDTO | undefined;
    return record ?? null;
  }

  async findAll(query?: IFilter): Promise<VectorMemoryDTO[]> {
    // E.g. { collectionName } => return all in that "filename"
    const db = await this.db();
    let stmt = db.select().from(vectorMemory);
    if (query?.collectionName) {
      stmt = stmt.where(eq(vectorMemory.collectionName, query.collectionName));
    }
    return stmt.all() as VectorMemoryDTO[];
  }

  /**
   * List "collections" like we used to list .json files, with item counts.
   */
  async listCollections(search = "", limit = 10, offset = 0) {
    const db = await this.db();
    const wildcard = `%${search}%`;

    // Count distinct collectionName
    const totalResult = db
      .select({ count: sql<number>`count(distinct collectionName)`.as("count") })
      .from(vectorMemory)
      .where(like(vectorMemory.collectionName, wildcard))
      .get();
    const total = (totalResult as any).count as number;

    // Then list them with item counts
    const rows = db
      .execute(
        sql`
          SELECT
            collectionName as file,
            COUNT(*) as itemCount
          FROM vectorMemory
          WHERE collectionName LIKE ${wildcard}
          GROUP BY collectionName
          ORDER BY collectionName ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      )
      .all() as { file: string; itemCount: number }[];

    return { files: rows, total };
  }

  /**
   * Paginate or vector-search records in a single "filename" = collectionName.
   * If embeddingSearch is present, we do topK.
   */
  async queryAll(params: {
    collectionName: string;
    limit: number;
    offset: number;
    embeddingSearch?: Buffer;
    topK?: number;
  }): Promise<PaginatedResult<VectorMemoryDTO[]>> {
    const { collectionName, limit, offset, embeddingSearch, topK = 5 } = params;
    const db = await this.db();

    // If no embedding, do normal pagination
    if (!embeddingSearch || embeddingSearch.length === 0) {
      const countRes = db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(vectorMemory)
        .where(eq(vectorMemory.collectionName, collectionName))
        .get();
      const total = (countRes as any).count as number;

      const rows = db
        .select()
        .from(vectorMemory)
        .where(eq(vectorMemory.collectionName, collectionName))
        .limit(limit)
        .offset(offset)
        .all() as VectorMemoryDTO[];

      return {
        rows,
        total,
        limit,
        offset,
        orderBy: "", // optional
        query: "",
      };
    }

    // Otherwise do a vector search for topK
    // e.g. cosinesim(embedding, embeddingSearch) desc
    const results = db
      .execute(
        sql`
          SELECT
            vm.*,
            cosinesim(vm.embedding, ${embeddingSearch}) as similarity
          FROM vectorMemory vm
          WHERE vm.collectionName = ${collectionName}
          ORDER BY similarity DESC
          LIMIT ${topK}
        `
      )
      .all() as any[];

    return {
      rows: results,
      total: results.length,
      limit,
      offset,
      orderBy: "",
      query: "",
    };
  }
}
