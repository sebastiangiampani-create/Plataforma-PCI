import { z } from 'zod';

/** Formato consistente de error para toda la API (AGENTS.md: "manejo de errores consistente"). */
export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.string()).optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
