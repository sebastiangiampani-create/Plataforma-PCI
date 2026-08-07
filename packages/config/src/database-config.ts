import { z } from 'zod';
import { parseEnv } from './env.js';
import { booleanFromEnv } from './shared.js';

export const databaseConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL es obligatoria')
    .url('DATABASE_URL debe ser una URL postgres:// válida'),
  DATABASE_SSL: booleanFromEnv,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export function loadDatabaseConfig(
  env: Record<string, string | undefined> = process.env,
): DatabaseConfig {
  return parseEnv('database', databaseConfigSchema, env);
}
