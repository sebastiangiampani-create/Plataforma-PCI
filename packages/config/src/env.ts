import type { z } from 'zod';

export class ConfigValidationError extends Error {
  constructor(
    public readonly context: string,
    public readonly issues: string[],
  ) {
    super(`Configuración inválida para "${context}":\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Parsea `source` (por ejemplo process.env o import.meta.env) contra un schema de Zod.
 * Nunca debe usarse para exponer secretos: el error solo lista rutas de campo, no valores.
 */
export function parseEnv<T extends z.ZodTypeAny>(
  context: string,
  schema: T,
  source: Record<string, string | boolean | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new ConfigValidationError(context, issues);
  }
  return result.data;
}
