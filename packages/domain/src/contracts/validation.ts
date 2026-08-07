import { z } from 'zod';
import { RULE_SEVERITIES } from '../entities/enums.js';

/**
 * Resultado real de correr el motor de reglas (docs/06-rule-engine.md)
 * contra una versión PCI concreta, persistido en `validation_results` y
 * catalogado contra `validation_rules` (ambas tablas ya existían desde
 * Application Foundation, sin usar hasta ahora).
 *
 * Solo se implementan las reglas evaluables con los datos reales
 * disponibles hoy, sin inventar ninguna: PCI-STR-001/002, PCI-ORI-002
 * (estructura de espacios curriculares) y PCI-COV-001 (cobertura de
 * contenidos de la bolsa). El resto de las reglas del catálogo
 * (PCI-HRS-003/004, PCI-ORI-001/003, PCI-GEN-001, PCI-COV-002,
 * PCI-MOD-001) dependen de datos que todavía no existen en la
 * plataforma (articulaciones, Formación Orientada, umbrales de
 * sobrerrepresentación sin definir en `configuration_json`) y quedan
 * pendientes. PCI-VER-001/002 e PCI-IMP-001 ya se aplican de forma
 * procedural en el momento de la mutación, no como chequeo estático de
 * una versión.
 */

export const validationSeveritySchema = z.enum(RULE_SEVERITIES);
export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;

/**
 * Vista denormalizada (join con `validation_rules`) que devuelve la API —
 * distinta de la entidad cruda `ValidationResult` (`entities/governance.ts`,
 * un espejo directo de la fila de la tabla).
 */
export const validationFindingSchema = z.object({
  id: z.string().uuid(),
  ruleCode: z.string(),
  ruleName: z.string(),
  severity: validationSeveritySchema,
  entityType: z.string(),
  entityId: z.string().uuid().nullable(),
  message: z.string(),
  cause: z.string().nullable(),
  impact: z.string().nullable(),
  suggestedAction: z.string().nullable(),
});
export type ValidationFinding = z.infer<typeof validationFindingSchema>;

export const validationSummaryEntrySchema = z.object({
  ruleCode: z.string(),
  ruleName: z.string(),
  severity: validationSeveritySchema,
  count: z.number().int().nonnegative(),
});
export type ValidationSummaryEntry = z.infer<typeof validationSummaryEntrySchema>;

export const validationRunResponseSchema = z.object({
  summary: z.array(validationSummaryEntrySchema),
  results: z.array(validationFindingSchema),
  truncated: z.boolean(),
});
export type ValidationRunResponse = z.infer<typeof validationRunResponseSchema>;
