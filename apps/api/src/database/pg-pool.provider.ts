import type { Provider } from '@nestjs/common';
import type { Pool } from 'pg';
import { loadDatabaseConfig } from '@pci/config';
import { createPool } from '@pci/database';

export const PG_POOL = Symbol('PG_POOL');

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  useFactory: (): Pool => createPool(loadDatabaseConfig(process.env)),
};
