import { z } from 'zod';
import { CHARACTER_TYPES, FORMAT_TYPES, RECORD_STATUSES, SPACE_TYPES } from '../entities/enums.js';
import { getTermsForLevel } from '../rules/term-level.js';

/**
 * Espacios curriculares y asignación de contenido (docs/03-modelo-dominio.md;
 * docs/05-modelo-datos.md: curricular_spaces/space_areas/content_assignments).
 * Aplica PCI-STR-001/002 (docs/06-rule-engine.md) al validar el rango de
 * cuatrimestres: se exige que coincida exactamente con el que corresponde al
 * nivel (`getTermsForLevel`), no cualquier par de cuatrimestres consecutivos.
 * PCI-ORI-002 exige que el Proyecto de Vinculación con el Futuro sea
 * exclusivo de Nivel 5 (ya cae en C9-C10 por STR-002, pero se valida
 * explícitamente el formato-nivel para dejar la regla clara).
 */

export const createCurricularSpaceRequestSchema = z
  .object({
    code: z.string().min(1, 'code es obligatorio').max(80),
    name: z.string().min(1, 'name es obligatorio').max(255),
    componentCode: z.string().min(1, 'componentCode es obligatorio'),
    orientationCode: z.string().min(1).nullable().optional(),
    spaceType: z.enum(SPACE_TYPES),
    formatType: z.enum(FORMAT_TYPES),
    characterType: z.enum(CHARACTER_TYPES),
    levelNumber: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    startTerm: z.number().int().min(1).max(10),
    endTerm: z.number().int().min(1).max(10),
    objectives: z.string().min(1).nullable().optional(),
    problemContext: z.string().min(1).nullable().optional(),
    observations: z.string().min(1).nullable().optional(),
    areaCodes: z.array(z.string().min(1)).min(1, 'Se requiere al menos un área aportante'),
  })
  .superRefine((value, ctx) => {
    const [expectedStart, expectedEnd] = getTermsForLevel(value.levelNumber);
    if (value.startTerm !== expectedStart || value.endTerm !== expectedEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTerm'],
        message: `PCI-STR-002: el Nivel ${value.levelNumber} ocupa C${expectedStart}-C${expectedEnd}, no C${value.startTerm}-C${value.endTerm}.`,
      });
    }
    if (value.formatType === 'PROYECTO_VINCULACION_FUTURO' && value.levelNumber !== 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['levelNumber'],
        message: 'PCI-ORI-002: el Proyecto de Vinculación con el Futuro es exclusivo de Nivel 5.',
      });
    }
  });
export type CreateCurricularSpaceRequest = z.infer<typeof createCurricularSpaceRequestSchema>;

export const spaceAreaSummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  responsibilityText: z.string().nullable(),
});
export type SpaceAreaSummary = z.infer<typeof spaceAreaSummarySchema>;

export const curricularSpaceSummarySchema = z.object({
  id: z.string().uuid(),
  pciVersionId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  componentCode: z.string(),
  orientationCode: z.string().nullable(),
  spaceType: z.enum(SPACE_TYPES),
  formatType: z.enum(FORMAT_TYPES),
  characterType: z.enum(CHARACTER_TYPES),
  levelNumber: z.number().int().min(1).max(5),
  startTerm: z.number().int(),
  endTerm: z.number().int(),
  objectives: z.string().nullable(),
  problemContext: z.string().nullable(),
  observations: z.string().nullable(),
  status: z.enum(RECORD_STATUSES),
  areas: z.array(spaceAreaSummarySchema),
  contentCount: z.number().int().nonnegative(),
});
export type CurricularSpaceSummary = z.infer<typeof curricularSpaceSummarySchema>;

export const assignContentRequestSchema = z.object({
  curricularContentId: z.string().uuid('curricularContentId debe ser un UUID válido'),
  coverageWeight: z.number().positive().max(999).optional(),
  notes: z.string().min(1).nullable().optional(),
});
export type AssignContentRequest = z.infer<typeof assignContentRequestSchema>;

export const contentAssignmentSummarySchema = z.object({
  id: z.string().uuid(),
  curricularContentId: z.string().uuid(),
  code: z.string(),
  contentText: z.string(),
  areaName: z.string(),
  subjectName: z.string(),
  axisName: z.string(),
  coverageWeight: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});
export type ContentAssignmentSummary = z.infer<typeof contentAssignmentSummarySchema>;
