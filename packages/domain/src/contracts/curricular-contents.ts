import { z } from 'zod';

/**
 * Bolsa de contenidos curriculares navegable (docs/04-roadmap.md, Fase 4:
 * "Bolsa de contenidos"). Solo lectura/filtrado por ahora — la selección,
 * arrastre y asignación a espacios curriculares queda para cuando exista un
 * flujo real de creación de proyectos/versiones PCI.
 */

export const curricularContentSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  contentText: z.string(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  componentCode: z.string(),
  areaCode: z.string(),
  areaName: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  axisCode: z.string(),
  axisName: z.string(),
});
export type CurricularContentSummary = z.infer<typeof curricularContentSummarySchema>;

export const curricularContentListResponseSchema = z.object({
  items: z.array(curricularContentSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});
export type CurricularContentListResponse = z.infer<typeof curricularContentListResponseSchema>;

export const curricularTaxonomyAxisSchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type CurricularTaxonomyAxis = z.infer<typeof curricularTaxonomyAxisSchema>;

export const curricularTaxonomySubjectSchema = z.object({
  code: z.string(),
  name: z.string(),
  axes: z.array(curricularTaxonomyAxisSchema),
});
export type CurricularTaxonomySubject = z.infer<typeof curricularTaxonomySubjectSchema>;

export const curricularTaxonomyAreaSchema = z.object({
  code: z.string(),
  name: z.string(),
  subjects: z.array(curricularTaxonomySubjectSchema),
});
export type CurricularTaxonomyArea = z.infer<typeof curricularTaxonomyAreaSchema>;

export const listCurricularContentsQuerySchema = z.object({
  componentCode: z.string().min(1).default('FORMACION_GENERAL'),
  areaCode: z.string().min(1).optional(),
  subjectCode: z.string().min(1).optional(),
  axisCode: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ListCurricularContentsQuery = z.infer<typeof listCurricularContentsQuerySchema>;
