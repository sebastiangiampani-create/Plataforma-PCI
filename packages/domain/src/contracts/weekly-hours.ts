import { z } from 'zod';

/**
 * Carga horaria semanal real de un espacio curricular (docs/05-modelo-datos.md:
 * weekly_hours; docs/06-rule-engine.md: PCI-HRS-001/002).
 *
 * PCI-HRS-001 ("la carga horaria se valida de forma independiente por
 * cuatrimestre") y PCI-HRS-002 ("no se permiten compensaciones entre
 * cuatrimestres") se respetan por construcción: cada fila es un
 * (cuatrimestre, área) independiente, sin ningún promedio ni ajuste
 * automático entre cuatrimestres.
 *
 * PCI-HRS-003/004 (coincidencia con el total del espacio, no doble conteo de
 * horas articuladas) quedan pendientes: dependen de `articulations`, que
 * todavía no tiene ningún endpoint propio.
 */

export const weeklyHoursEntrySchema = z.object({
  id: z.string().uuid(),
  termNumber: z.number().int().min(1).max(10),
  areaCode: z.string(),
  areaName: z.string(),
  hours: z.number().nonnegative(),
});
export type WeeklyHoursEntry = z.infer<typeof weeklyHoursEntrySchema>;

export const setWeeklyHoursRequestSchema = z.object({
  areaCode: z.string().min(1, 'areaCode es obligatorio'),
  termNumber: z.number().int().min(1).max(10),
  hours: z.number().nonnegative('hours no puede ser negativo'),
});
export type SetWeeklyHoursRequest = z.infer<typeof setWeeklyHoursRequestSchema>;

export const weeklyHoursSuggestionSchema = z.object({
  unidadCurricular: z.string(),
  areaCode: z.string(),
  subjectCode: z.string().nullable(),
  hours: z.number().nonnegative(),
  note: z.string().optional(),
});
export type WeeklyHoursSuggestion = z.infer<typeof weeklyHoursSuggestionSchema>;
