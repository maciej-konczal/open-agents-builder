import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/data/server/db-schema-templates.ts',
  out: './drizzle-templates',
  dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
});
