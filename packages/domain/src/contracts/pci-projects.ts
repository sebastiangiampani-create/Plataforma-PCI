import { z } from 'zod';
import { PCI_STATUSES } from '../entities/enums.js';

/**
 * Alta de proyecto/versión PCI por escuela (docs/03-modelo-dominio.md: "PCI",
 * "Versión PCI"; docs/06-rule-engine.md: PCI-VER-001/002). Reglas aplicadas:
 * - Una versión publicada es inmutable (PCI-VER-001): no se puede editar
 *   `pedagogicalRationale` ni volver a publicar una versión ya PUBLISHED.
 * - Toda modificación posterior a una publicación crea una nueva versión
 *   (PCI-VER-002): solo se puede crear una versión nueva cuando la versión
 *   actual del proyecto está PUBLISHED (o el proyecto todavía no tiene
 *   ninguna versión).
 */

export const pciStatusSchema = z.enum(PCI_STATUSES);

export const pciVersionSummarySchema = z.object({
  id: z.string().uuid(),
  pciProjectId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  status: pciStatusSchema,
  pedagogicalRationale: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  publishedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
});
export type PciVersionSummary = z.infer<typeof pciVersionSummarySchema>;

export const pciProjectSummarySchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string(),
  status: pciStatusSchema,
  currentVersion: pciVersionSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PciProjectSummary = z.infer<typeof pciProjectSummarySchema>;

export const createPciProjectRequestSchema = z.object({
  name: z.string().min(1, 'name es obligatorio').max(255),
});
export type CreatePciProjectRequest = z.infer<typeof createPciProjectRequestSchema>;

export const updatePciVersionRequestSchema = z.object({
  pedagogicalRationale: z.string().min(1, 'pedagogicalRationale es obligatorio'),
});
export type UpdatePciVersionRequest = z.infer<typeof updatePciVersionRequestSchema>;
