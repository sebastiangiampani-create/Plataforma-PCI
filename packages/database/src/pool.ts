import { Pool } from 'pg';
import type { DatabaseConfig } from '@pci/config';

export function createPool(config: DatabaseConfig): Pool {
  return new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
    max: config.DATABASE_POOL_MAX,
  });
}
