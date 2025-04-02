import { migration as createInitialTables } from './001_create_initial_tables';
import { migration as addSessionAndExpiry } from './002_add_session_and_expiry';

export const storeMigrations = [
  createInitialTables,
  addSessionAndExpiry
]; 