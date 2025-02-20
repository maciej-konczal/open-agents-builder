import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/data/server/db-schema-commerce.ts',
  out: './drizzle-commerce',
  dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
});
