import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";


export const config = sqliteTable('config', {
    key: text('key', { mode: 'text' }).primaryKey(),
    value: text('value'),
    updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`)
});


export const agents = sqliteTable('agents', {
    id: text('id').primaryKey(),
    displayName: text('displayName'),
    options: text('options', { mode: 'json' }),
    prompt: text('prompt').notNull(),
    expectedResult: text('expectedResult'),
    safetyRules: text('safetyRules', { mode: 'json' }),
    createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`)
}); 

export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),   
    agentId: text('agentId').references(() => agents.id),
    user: text('user', { mode: 'json' }),
    messages: text('messages', { mode: 'json' }),
    result: text('result'),
    prompt: text('prompt').notNull(),
    safetyRules: text('safetyRules', { mode: 'json' }),
    createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    finalzedAt: text('finalizedAt')
}); 

export const keys = sqliteTable('keys', {
    keyLocatorHash: text('keyLocatorHash').primaryKey(),
    displayName: text('displayName'),
    databaseIdHash: text('databaseIdHash', { mode: 'text' }).notNull(),
    keyHash: text('keyHash').notNull(),
    keyHashParams: text('keyHashParams').notNull(),
    encryptedMasterKey: text('encryptedMasterKey').notNull(),
    acl: text('acl'),
    extra: text('extra'),
    expiryDate: text('expiryDate').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`)
}); 


export const Attachments = sqliteTable('attachments', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    
    displayName: text('displayName'),
    type: text('type'),
    url: text('url'),
    mimeType: text('mimeType'),

    assignedTo: text('assignedTo', { mode: 'json' }),

    json: text('json', { mode: 'json' }),
    extra: text('extra', { mode: 'json' }),
    size: integer('size', { mode: 'number' }),    


    storageKey: text('storageKey'),
    description: text('description'),
    
    createdAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const terms = sqliteTable('terms', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    content: text('content'),
    code: text('code'),
    key: text('key'),
    signature: text('signature'),
    ip: text('ip'),
    ua: text('ua'),
    name: text('name'),
    email: text('email'),
    signedAt: text('signedAt').notNull().default(sql`CURRENT_TIMESTAMP`)
});
