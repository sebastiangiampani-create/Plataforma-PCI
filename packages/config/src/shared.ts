import { z } from 'zod';

export const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

/** Acepta "true"/"false"/"1"/"0" tal como llegan desde variables de entorno de texto. */
export const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  })
  .default(false);

export const portSchema = z.coerce.number().int().min(1).max(65535);
