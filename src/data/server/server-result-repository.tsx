import { BaseRepository, IQuery } from "./base-repository"
import { PaginatedResult, ResultDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { results } from "./db-schema";
import { and, AnyColumn, asc, count, desc, eq, isNotNull, like, or } from "drizzle-orm";
import { create } from "./generic-repository";

export default class ServerResultRepository extends BaseRepository<ResultDTO> {
    
    async create(item: ResultDTO): Promise<ResultDTO> {
        const db = (await this.db());
        return create(item, results, db); // generic implementation
    }

    // update folder
    async upsert(query:Record<string, any>, item: ResultDTO): Promise<ResultDTO> { 
        const db = (await this.db());       
        let existingRecord:ResultDTO | null = query.sessionId ? db.select().from(results).where(eq(results.sessionId, query.sessionId)).get() as ResultDTO : null
        if (!existingRecord) {
            existingRecord = await this.create(item);
       } else {
            existingRecord = item
            existingRecord.updatedAt = getCurrentTS() // TODO: load attachments
            db.update(results).set(existingRecord).where(eq(results.sessionId, query.sessionId)).run();
       }
       return Promise.resolve(existingRecord as ResultDTO)   
    }    

    async delete(query: Record<string, string>): Promise<boolean> {
        const db = (await this.db());
        if(query.agentId) 
            return db.delete(results).where(eq(results.agentId, query.agentId)).run().changes > 0
        if(query.sessionId) 
            return db.delete(results).where(eq(results.sessionId, query.sessionId)).run().changes > 0    
        return false;
    }

    async findAll(query?: IQuery): Promise<ResultDTO[]> {
        const db = (await this.db());
        let dbQuery = db.select().from(results);
        if(query?.filter){
            if(query.filter['agentId']){
                dbQuery.where(eq(results.agentId, query.filter['agentId'] as string));
            }
            if(query.filter['sessionId']){
                dbQuery.where(eq(results.sessionId, query.filter['sessionId'] as string));
            }
            if(query.filter['id']){ // id is our sessionId as only a single result might be attached to a session
                dbQuery.where(eq(results.sessionId, query.filter['id'] as string));
            }
        }        
        return Promise.resolve(dbQuery.all() as ResultDTO[])
    }


     async queryAll(agentId: string, { limit, offset, orderBy, query}: { query: string, offset: number, limit: number, orderBy: string }): Promise<PaginatedResult<ResultDTO[]>> {
        let orderColumn = desc(results.updatedAt);
        let notNullColumn:AnyColumn= results.updatedAt;
        const db = (await this.db());

        switch (orderBy) {
          case 'userName':
            orderColumn = asc(results.userName);
            notNullColumn = results.userName;
            break;
        case 'userEmail':
            orderColumn = asc(results.userEmail);
            notNullColumn = results.userEmail;
            break;
          case 'createdAt':
            orderColumn = desc(results.createdAt);
            notNullColumn = results.createdAt;
            break;
          case 'updatedAt':
            orderColumn = desc(results.updatedAt);
            break;
        }
        let where = and(eq(results.agentId, agentId), isNotNull(notNullColumn));
        
        if (query) {
            where = and(where
                , or(like(results.userEmail, '%' + query + '%'), like(results.userName, '%' + query + '%')))
        }
        
        const records = await db.select().from(results).where(where).limit(limit).offset(offset).orderBy(orderColumn).execute();
        const recordsCount = await db.select({ count: count() }).from(results).where(where).execute();
        console.log(records);
        return {
          rows: records as ResultDTO[],
          total: recordsCount[0].count,
          limit,
          offset,
          orderBy,
          query
        }
      }    
}