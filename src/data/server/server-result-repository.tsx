import { BaseRepository, IQuery } from "./base-repository"
import { ResultDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { results } from "./db-schema";
import { eq } from "drizzle-orm";
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
        return db.delete(results).where(eq(results.id, query.id)).run().changes > 0
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
            if(query.filter['id']){
                dbQuery.where(eq(results.id, query.filter['id'] as string));
            }
        }        
        return Promise.resolve(dbQuery.all() as ResultDTO[])
    }
}