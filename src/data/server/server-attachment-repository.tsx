import { BaseRepository } from "./base-repository"
import { AttachmentDTO } from "../dto";
import { pool } from '@/data/server/db-provider'
import { getCurrentTS } from "@/lib/utils";
import { Attachments } from "./db-schema";
import { eq } from "drizzle-orm";
import { create } from "./generic-repository";

export default class ServerAttachmentRepository extends BaseRepository<AttachmentDTO> {
    
    
    async create(item: AttachmentDTO): Promise<AttachmentDTO> {
        const db = (await this.db());
        return create(item, Attachments, db); // generic implementation
    }

    async delete(query:Record<string, any>): Promise<boolean> {
        const db = (await this.db());
        return db.delete(Attachments).where(eq(Attachments.storageKey, query.storageKey)).run().changes > 0
    }

    // update folder
    async upsert(query:Record<string, any>, item: AttachmentDTO): Promise<AttachmentDTO> {        
        const db = (await this.db());
        let existingRecord:AttachmentDTO | null = query.id ? db.select().from(Attachments).where(eq(Attachments.id, query.id)).get() as AttachmentDTO : null
        if (!existingRecord) {
            existingRecord = await this.create(item);
       } else {
            existingRecord = item
            existingRecord.updatedAt = getCurrentTS() // TODO: load attachments
            db.update(Attachments).set(existingRecord).where(eq(Attachments.id, query.id)).run();
       }
       return Promise.resolve(existingRecord as AttachmentDTO)   
    }    

    async findAll(): Promise<AttachmentDTO[]> {
        const db = (await this.db());
        console.log(db.select().from(Attachments).all());
        return Promise.resolve(db.select().from(Attachments).all() as AttachmentDTO[])
    }

}