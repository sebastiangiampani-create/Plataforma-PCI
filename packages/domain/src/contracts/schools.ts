import { z } from 'zod';

export const schoolSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  roleCode: z.string(),
});
export type SchoolSummary = z.infer<typeof schoolSummarySchema>;

export const selectSchoolRequestSchema = z.object({
  schoolId: z.string().uuid('schoolId debe ser un UUID válido'),
});
export type SelectSchoolRequest = z.infer<typeof selectSchoolRequestSchema>;
