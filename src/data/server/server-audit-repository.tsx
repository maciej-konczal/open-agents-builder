import { BaseRepository, IFilter, IQuery } from "./base-repository"
import { and, eq } from "drizzle-orm/sql";
import { AggregatedStatsDTO, AuditDTO, StatDTO } from "../dto";
import { stats } from "./db-schema-stats";
import currentPricing from '@/data/ai/pricing.json'
import { create } from "./generic-repository";
import { audit } from "./db-schema-audit";
import { desc, asc } from 'drizzle-orm';
import { EncryptionUtils } from "@/lib/crypto";


export default class ServerAuditRepository extends BaseRepository<AuditDTO> {

    storageKey: string | null | undefined;
    encUtils:EncryptionUtils | null = null;

    constructor(databaseIdHash: string, storageKey: string | null | undefined, databaseSchema: string = '', databasePartition: string ='') {
        super(databaseIdHash, databaseSchema, databasePartition);
        this.storageKey = storageKey
        if (storageKey){
            this.encUtils = new EncryptionUtils(storageKey);
        }
    }    

    async encryptItem(item: AuditDTO): Promise<AuditDTO> {
        if(this.encUtils){
            if(item.diff) item.diff = await this.encUtils.encrypt(item.diff);
        }
        return item;
    }

    async decryptItem(item: AuditDTO): Promise<AuditDTO> {
        if (this.encUtils){
            if(item.diff) item.diff = await this.encUtils.decrypt(item.diff);
        }
        return item
    }

    async decryptItems(items: AuditDTO[]): Promise<AuditDTO[]> {
        if(this.encUtils){
            for(let item of items){
                item = await this.decryptItem(item);
            }
        }
        return items;
    }

    
    async create(item: AuditDTO): Promise<AuditDTO> {
        const db = (await this.db());
        return this.decryptItem(await create(await this.encryptItem(item), audit, db)); // generic implementation
    }

    async upsert(query:Record<string, any>, log: AuditDTO): Promise<AuditDTO> {        
        const db = (await this.db());
        const newLog  = await this.create(log)
        return Promise.resolve(newLog as AuditDTO)   
    }

    async findAll(query: IQuery): Promise<AuditDTO[]> {
        const db = (await this.db());
        return this.decryptItems(await db.select().from(audit).offset(query.offset ?? 0).limit(query.limit ?? 100).orderBy(desc(audit.createdAt)).all() as AuditDTO[])
    }

}