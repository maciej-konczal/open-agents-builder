import { BaseRepository, IQuery } from "./base-repository"
import { AgentDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { agents } from "./db-schema";
import { eq } from "drizzle-orm";
import { create } from "./generic-repository";

export default class ServerAgentRepository extends BaseRepository<AgentDTO> {
    
    
    async create(item: AgentDTO): Promise<AgentDTO> {
        const db = (await this.db());
        return create(item, agents, db); // generic implementation
    }

    // update folder
    async upsert(query:Record<string, any>, item: AgentDTO): Promise<AgentDTO> { 
        const db = (await this.db());       
        let existingRecord:AgentDTO | null = query.id ? db.select().from(agents).where(eq(agents.id, query.id)).get() as AgentDTO : null
        if (!existingRecord) {
            existingRecord = await this.create(item);
       } else {
        console.log(item);
            existingRecord = item
            existingRecord.updatedAt = getCurrentTS() // TODO: load attachments
            db.update(agents).set(existingRecord).where(eq(agents.id, query.id)).run();
       }
       return Promise.resolve(existingRecord as AgentDTO)   
    }    

    async delete(query: Record<string, string>): Promise<boolean> {
        const db = (await this.db());
        return db.delete(agents).where(eq(agents.id, query.id)).run().changes > 0
    }

    async findAll(query?: IQuery): Promise<AgentDTO[]> {
        const db = (await this.db());
        let dbQuery = db.select().from(agents);
        if(query?.filter){
            if(query.filter['id']){
                dbQuery.where(eq(agents.id, query.filter['id'] as string));
            }
        }              
        return Promise.resolve(dbQuery.all() as AgentDTO[])
    }
}