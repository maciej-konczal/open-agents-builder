import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable('agents', {
    id: text('id').primaryKey(),
    displayName: text('displayName'),
    options: text('options', { mode: 'json' }),
    prompt: text('prompt').notNull(),
    expectedResult: text('expectedResult'),
    safetyRules: text('safetyRules'),
    createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`)
}); 
