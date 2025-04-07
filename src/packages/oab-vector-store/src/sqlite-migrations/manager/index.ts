import { migration as createStoresIndex } from './001_create_stores_index';
import { migration as addItemCount } from './002_add_item_count';

export const managerMigrations = [
  createStoresIndex,
  addItemCount
]; 