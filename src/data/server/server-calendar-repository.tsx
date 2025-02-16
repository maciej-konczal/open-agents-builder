import { BaseRepository, IQuery } from "./base-repository"
import { CalendarEventDTO, PaginatedResult, ResultDTO } from "../dto";
import { getCurrentTS } from "@/lib/utils";
import { calendarEvents } from "./db-schema";
import { and, AnyColumn, asc, count, desc, eq, isNotNull, like, or } from "drizzle-orm";
import { create } from "./generic-repository";
import { EncryptionUtils } from "@/lib/crypto";

export default class ServerCalendarRepository extends BaseRepository<CalendarEventDTO> {
    
    storageKey: string | null | undefined;
    encUtils:EncryptionUtils | null = null;

    async encryptItem(item: CalendarEventDTO): Promise<CalendarEventDTO> {
        if(this.encUtils){
            if(item.title) item.title = await this.encUtils.encrypt(item.title);
            if(item.location) item.location = await this.encUtils.encrypt(item.location);
            if(item.description) item.description = await this.encUtils.encrypt(item.description);
            if(item.participants) item.participants = await this.encUtils.encrypt(item.participants);
            if(item.start) item.start = await this.encUtils.encrypt(item.start);
            if(item.end) item.end = await this.encUtils.encrypt(item.end);

        }
        return item;
    }

    async decryptItems(items: CalendarEventDTO[]): Promise<CalendarEventDTO[]> {
        if(this.encUtils){
            for(let item of items){
                if(item.title) item.title = await this.encUtils.decrypt(item.title);
                if (item.location) item.location = await this.encUtils.decrypt(item.location);
                if (item.description) item.description = await this.encUtils.decrypt(item.description);
                if (item.participants) item.participants = await this.encUtils.decrypt(item.participants);
                if (item.start) item.start = await this.encUtils.decrypt(item.start);
                if (item.end) item.end = await this.encUtils.decrypt(item.end);
            }
        }
        return items;
    }

    constructor(databaseIdHash: string, storageKey: string | null | undefined, databaseSchema: string = '', databasePartition: string ='') {
        super(databaseIdHash, databaseSchema, databasePartition);
        this.storageKey = storageKey
        if (storageKey){
            this.encUtils = new EncryptionUtils(storageKey);
        }
    }
        
    async create(item: CalendarEventDTO): Promise<CalendarEventDTO> {
        const db = (await this.db());
        item = await this.encryptItem(item);
        return create(item, calendarEvents, db); // generic implementation
    }

    // update folder
    async upsert(query:Record<string, any>, item: CalendarEventDTO): Promise<CalendarEventDTO> { 
        const db = (await this.db());     
        let existingRecord:CalendarEventDTO | null = query.id ? db.select().from(calendarEvents).where(eq(calendarEvents.id, query.id)).get() as CalendarEventDTO : null
        if (!existingRecord) {
            existingRecord = await this.create(item);
       } else {
            item = await this.encryptItem(item);  
            existingRecord = item
            if (!existingRecord.start) existingRecord.start = getCurrentTS();
            if (!existingRecord.end) existingRecord.end = getCurrentTS();
            existingRecord.updatedAt = getCurrentTS() // TODO: load attachments
            db.update(calendarEvents).set(existingRecord).where(eq(calendarEvents.id, query.id)).run();
       }
       return Promise.resolve(existingRecord as CalendarEventDTO)   
    }    

    async delete(query: Record<string, string>): Promise<boolean> {
        const db = (await this.db());
        if(query.id) 
            return db.delete(calendarEvents).where(eq(calendarEvents.id, query.id)).run().changes > 0
        return false;
    }

    async findAll(query?: IQuery): Promise<CalendarEventDTO[]> {
        const db = (await this.db());
        let dbQuery = db.select().from(calendarEvents);
        if(query?.filter){
            if(query.filter['id']){
                dbQuery.where(eq(calendarEvents.id, query.filter['id'] as string));
            }
            if(query.filter['agentId']){
                dbQuery.where(eq(calendarEvents.agentId, query.filter['agentId'] as string));
            }
        }        
        return Promise.resolve(await this.decryptItems(dbQuery.all() as CalendarEventDTO[]))
    }


     async queryAll(agentId: string, { limit, offset, orderBy, query}: { query: string, offset: number, limit: number, orderBy: string }): Promise<PaginatedResult<CalendarEventDTO[]>> {
        let orderColumn = desc(calendarEvents.updatedAt);
        let notNullColumn:AnyColumn= calendarEvents.updatedAt;
        const db = (await this.db());

        switch (orderBy) {
          case 'createdAt':
            orderColumn = desc(calendarEvents.createdAt);
            notNullColumn = calendarEvents.createdAt;
            break;
          case 'updatedAt':
            orderColumn = desc(calendarEvents.updatedAt);
            break;
        }
        let where = and(eq(calendarEvents.agentId, agentId), isNotNull(notNullColumn));
        const encFieldQuery = this.encUtils ? await this.encUtils.encrypt(query) : query;

        
        const records = await db.select().from(calendarEvents).where(where).limit(limit).offset(offset).orderBy(orderColumn).execute();
        const recordsCount = await db.select({ count: count() }).from(calendarEvents).where(where).execute();

        return {
          rows: await this.decryptItems(records as CalendarEventDTO[]),
          total: recordsCount[0].count,
          limit,
          offset,
          orderBy,
          query
        }
      }    
}