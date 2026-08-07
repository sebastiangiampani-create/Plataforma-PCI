import { z } from 'zod';
import { parseEnv } from './env.js';
import { booleanFromEnv, nodeEnvSchema, portSchema } from './shared.js';

export const apiConfigSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema.default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria').url(),
    DATABASE_SSL: booleanFromEnv,
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DEV_AUTH_ENABLED: booleanFromEnv,
    DEV_SESSION_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .default(12),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  })
  .transform((config) => ({
    ...config,
    // La autenticación de desarrollo nunca puede quedar activa fuera de "development",
    // sin importar el valor explícito de DEV_AUTH_ENABLED.
    DEV_AUTH_ENABLED: config.DEV_AUTH_ENABLED && config.NODE_ENV === 'development',
  }));

export type ApiConfig = z.infer<typeof apiConfigSchema>;

export function loadApiConfig(env: Record<string, string | undefined> = process.env): ApiConfig {
  return parseEnv('api', apiConfigSchema, env);
}
