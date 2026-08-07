import { z } from 'zod';
import {
  apiErrorResponseSchema,
  createCurricularImportRequestSchema,
  curricularImportListItemSchema,
  curricularImportSummarySchema,
  devLoginRequestSchema,
  schoolSummarySchema,
  selectSchoolRequestSchema,
  sessionResponseSchema,
  type CreateCurricularImportRequest,
  type CurricularImportListItem,
  type CurricularImportSummary,
  type DevLoginRequest,
  type SchoolSummary,
  type SessionResponse,
} from '@pci/domain';
import { webConfig } from './config';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${webConfig.VITE_API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No se pudo contactar a la API. Verifique su conexión.');
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(body);
    if (parsedError.success) {
      throw new ApiError(
        parsedError.data.error.code,
        parsedError.data.error.message,
        parsedError.data.error.details,
      );
    }
    throw new ApiError('UNKNOWN_ERROR', `Error inesperado del servidor (${response.status}).`);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('INVALID_RESPONSE', 'La API devolvió una respuesta con forma inesperada.');
  }
  return parsed.data;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function devLogin(payload: DevLoginRequest): Promise<SessionResponse> {
  const validated = devLoginRequestSchema.parse(payload);
  return request('/auth/dev-login', sessionResponseSchema, {
    method: 'POST',
    body: JSON.stringify(validated),
  });
}

export function fetchSession(token: string): Promise<SessionResponse> {
  return request('/session', sessionResponseSchema, { headers: authHeaders(token) });
}

export function fetchAccessibleSchools(token: string): Promise<SchoolSummary[]> {
  return request('/schools', z.array(schoolSummarySchema), { headers: authHeaders(token) });
}

export function selectActiveSchool(token: string, schoolId: string): Promise<SessionResponse> {
  const validated = selectSchoolRequestSchema.parse({ schoolId });
  return request('/session/school', sessionResponseSchema, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(validated),
  });
}

export function createCurricularImport(
  token: string,
  payload: CreateCurricularImportRequest,
): Promise<CurricularImportSummary> {
  const validated = createCurricularImportRequestSchema.parse(payload);
  return request('/curricular-imports', curricularImportSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(validated),
  });
}

export function listCurricularImports(
  token: string,
  schoolId?: string,
): Promise<CurricularImportListItem[]> {
  const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  return request(`/curricular-imports${query}`, z.array(curricularImportListItemSchema), {
    headers: authHeaders(token),
  });
}

export function getCurricularImport(token: string, id: string): Promise<CurricularImportSummary> {
  return request(`/curricular-imports/${id}`, curricularImportSummarySchema, {
    headers: authHeaders(token),
  });
}

export function confirmCurricularImport(
  token: string,
  id: string,
): Promise<CurricularImportSummary> {
  return request(`/curricular-imports/${id}/confirm`, curricularImportSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function revertCurricularImport(
  token: string,
  id: string,
): Promise<CurricularImportSummary> {
  return request(`/curricular-imports/${id}/revert`, curricularImportSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
  });
}
