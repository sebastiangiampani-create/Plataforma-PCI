import { z } from 'zod';

/**
 * Importación reversible de contenido curricular (docs/04-roadmap.md, Fase 3;
 * docs/05-modelo-datos.md, tablas curricular_imports/curricular_import_rows).
 *
 * El cliente sube el CSV como texto plano (una plantilla, no un binario
 * .xlsx): esta primera versión del importador cubre el formato CSV descrito
 * en docs/10-importador-curricular.md; el soporte de .xlsx queda pendiente.
 */

export const createCurricularImportRequestSchema = z.object({
  sourceName: z.string().min(1, 'sourceName es obligatorio'),
  sourceVersion: z.string().min(1, 'sourceVersion es obligatorio'),
  schoolId: z.string().uuid('schoolId debe ser un UUID válido').nullable().optional(),
  csvContent: z.string().min(1, 'csvContent es obligatorio'),
});
export type CreateCurricularImportRequest = z.infer<typeof createCurricularImportRequestSchema>;

export const curricularImportRowSummarySchema = z.object({
  id: z.string().uuid(),
  rowNumber: z.number().int().positive(),
  status: z.enum(['VALID', 'INVALID', 'DUPLICATE', 'IMPORTED']),
  rawData: z.record(z.string(), z.string()),
  validationErrors: z.array(z.string()).nullable(),
  curricularContentId: z.string().uuid().nullable(),
});
export type CurricularImportRowSummary = z.infer<typeof curricularImportRowSummarySchema>;

export const curricularImportSummarySchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid().nullable(),
  sourceName: z.string(),
  sourceVersion: z.string(),
  status: z.enum(['PREVIEW', 'APPLIED', 'REVERTED']),
  importedBy: z.string().uuid(),
  createdAt: z.string(),
  revertedAt: z.string().nullable(),
  rows: z.array(curricularImportRowSummarySchema),
});
export type CurricularImportSummary = z.infer<typeof curricularImportSummarySchema>;

export const curricularImportListItemSchema = curricularImportSummarySchema
  .omit({ rows: true })
  .extend({
    rowCount: z.number().int().nonnegative(),
    validCount: z.number().int().nonnegative(),
    invalidCount: z.number().int().nonnegative(),
    duplicateCount: z.number().int().nonnegative(),
    importedCount: z.number().int().nonnegative(),
  });
export type CurricularImportListItem = z.infer<typeof curricularImportListItemSchema>;
