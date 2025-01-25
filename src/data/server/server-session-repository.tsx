import { BaseRepository, IQuery } from "./base-repository"
import { SessionDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { sessions } from "./db-schema";
import { eq } from "drizzle-orm";
import { create } from "./generic-repository";

export default class ServerSessionRepository extends BaseRepository<SessionDTO> {
    
    
    async create(item: SessionDTO): Promise<SessionDTO> {
        console.log(item);
        const db = (await this.db());
        return create(item, sessions, db); // generic implementation
    }

    // update folder
    async upsert(query:Record<string, any>, item: SessionDTO): Promise<SessionDTO> { 
        const db = (await this.db());       
        let existingRecord:SessionDTO | null = query.id ? db.select().from(sessions).where(eq(sessions.id, query.id)).get() as SessionDTO : null
        if (!existingRecord) {
            existingRecord = await this.create(item);
       } else {
            existingRecord = item
            existingRecord.updatedAt = getCurrentTS() // TODO: load attachments
            db.update(sessions).set(existingRecord).where(eq(sessions.id, query.id)).run();
       }
       return Promise.resolve(existingRecord as SessionDTO)   
    }    

    async delete(query: Record<string, string>): Promise<boolean> {
        const db = (await this.db());
        return db.delete(sessions).where(eq(sessions.id, query.id)).run().changes > 0
    }

    async findAll(query?: IQuery): Promise<SessionDTO[]> {
        const db = (await this.db());
        let dbQuery = db.select().from(sessions);
        if(query?.filter){
            if(query.filter['agentId']){
                dbQuery.where(eq(sessions.agentId, query.filter['agentId'] as string));
            }
            if(query.filter['id']){
                dbQuery.where(eq(sessions.id, query.filter['id'] as string));
            }
        }        
        return Promise.resolve(dbQuery.all() as SessionDTO[])
    }
}