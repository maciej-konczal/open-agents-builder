import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/data/server/db-schema.ts',
  out: './drizzle',
  dialect: 'sqlite', // 'postgresql' | 'mysql' | 'sqlite'
});
