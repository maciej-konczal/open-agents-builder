import { BaseRepository, IQuery } from "./base-repository"
import { PaginatedResult, SessionDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { sessions } from "./db-schema";
import { AnyColumn, desc, eq, isNotNull, or, and, like, count, asc  } from "drizzle-orm";
import { create } from "./generic-repository";
import { EncryptionUtils } from "@/lib/crypto";

export default class ServerSessionRepository extends BaseRepository<SessionDTO> {
    
    storageKey: string | null | undefined;
    encUtils:EncryptionUtils | null = null;

    constructor(databaseIdHash: string, storageKey: string | null | undefined, databaseSchema: string = '', databasePartition: string ='') {
        super(databaseIdHash, databaseSchema, databasePartition);
        this.storageKey = storageKey
        if (storageKey){
            this.encUtils = new EncryptionUtils(storageKey);
        }
    }

    async encryptItem(item: SessionDTO): Promise<SessionDTO> {
        if(this.encUtils){
            if(item.userName) item.userName = await this.encUtils.encrypt(item.userName);
            if (item.userEmail) item.userEmail = await this.encUtils.encrypt(item.userEmail);
            if (item.messages) item.messages = await this.encUtils.encrypt(item.messages);            
        }
        return item;
    }

    async decryptItems(items: SessionDTO[]): Promise<SessionDTO[]> {
        if(this.encUtils){
            for(let item of items){
                if(item.userName) item.userName = await this.encUtils.decrypt(item.userName);
                if (item.userEmail) item.userEmail = await this.encUtils.decrypt(item.userEmail);
                if (item.messages) item.messages = await this.encUtils.decrypt(item.messages);            
            }
        }
        return items;
    }

    
    async create(item: SessionDTO): Promise<SessionDTO> {
        const db = (await this.db());
        item = await this.encryptItem(item);
        return create(item, sessions, db); // generic implementation
    }

    // update folder
    async upsert(query:Record<string, any>, item: SessionDTO): Promise<SessionDTO> { 
        const db = (await this.db());    
        let existingRecord:SessionDTO | null = query.id ? db.select().from(sessions).where(eq(sessions.id, query.id)).get() as SessionDTO : null
        if (!existingRecord) {
            existingRecord = await this.create(item);
       } else {
            item = await this.encryptItem(item);
            existingRecord = item
            existingRecord.updatedAt = getCurrentTS() // TODO: load attachments
            db.update(sessions).set(existingRecord).where(eq(sessions.id, query.id)).run();
       }
       return Promise.resolve(existingRecord as SessionDTO)   
    }    

    async delete(query: Record<string, string>): Promise<boolean> {
        const db = (await this.db());
        if(query.agentId) 
            return db.delete(sessions).where(eq(sessions.agentId, query.agentId)).run().changes > 0
        if(query.sessionId) 
            return db.delete(sessions).where(eq(sessions.id, query.sessionId)).run().changes > 0   
        if(query.id) 
            return db.delete(sessions).where(eq(sessions.id, query.id)).run().changes > 0   

        return false;
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
        return Promise.resolve(await this.decryptItems(dbQuery.all() as SessionDTO[]))
    }

     async queryAll(agentId: string, { limit, offset, orderBy, query}: { query: string, offset: number, limit: number, orderBy: string }): Promise<PaginatedResult<SessionDTO[]>> {
        let orderColumn = desc(sessions.updatedAt);
        let notNullColumn:AnyColumn= sessions.createdAt;
        const db = (await this.db());

        switch (orderBy) {
          case 'userName':
            orderColumn = asc(sessions.userName);
            notNullColumn = sessions.userName;
            break;
        case 'userEmail':
            orderColumn = asc(sessions.userEmail);
            notNullColumn = sessions.userEmail;
            break;
          case 'createdAt':
            orderColumn = desc(sessions.createdAt);
            notNullColumn = sessions.createdAt;
            break;
          case 'updatedAt':
            orderColumn = desc(sessions.updatedAt);
            break;
        }
        let where = and(eq(sessions.agentId, agentId), isNotNull(notNullColumn));
        
        const encFieldQuery = this.encUtils ? await this.encUtils.encrypt(query) : query;
        if (query)
            where = and(where, or(like(sessions.userEmail, '%' + encFieldQuery + '%'), like(sessions.userName, '%' + encFieldQuery + '%'), like(sessions.id, '%' + query + '%')));

        const records = await db.select().from(sessions).where(where).limit(limit).offset(offset).orderBy(orderColumn).execute();
        const recordsCount = await db.select({ count: count() }).from(sessions).where(where).execute();
        
        return {
          rows: await this.decryptItems(records as SessionDTO[]),
          total: recordsCount[0].count,
          limit,
          offset,
          orderBy,
          query
        }
      }       
}