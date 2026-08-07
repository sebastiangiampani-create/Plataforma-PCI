import { z } from 'zod';
import { parseEnv } from './env.js';

export const webConfigSchema = z.object({
  VITE_API_URL: z.string().min(1).url().default('http://localhost:3000'),
});

export type WebConfig = z.infer<typeof webConfigSchema>;

/**
 * Recibe `import.meta.env` (o un objeto equivalente) desde la app web,
 * ya que este paquete no debe acceder directamente a `import.meta` para
 * seguir siendo compilable con la configuración de módulos de Node.
 */
export function loadWebConfig(env: Record<string, string | undefined>): WebConfig {
  return parseEnv('web', webConfigSchema, env);
}
