import { z } from 'zod';

/** Contrato compartido entre apps/api y apps/web para la autenticación de desarrollo. */
export const devLoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Debe ser un email válido'),
  displayName: z.string().trim().min(1).max(255).optional(),
});
export type DevLoginRequest = z.infer<typeof devLoginRequestSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionResponseSchema = z.object({
  token: z.string().min(1),
  user: sessionUserSchema,
  activeSchoolId: z.string().uuid().nullable(),
  expiresAt: z.string(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
