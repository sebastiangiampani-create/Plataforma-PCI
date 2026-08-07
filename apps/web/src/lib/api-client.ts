import { z } from 'zod';
import {
  apiErrorResponseSchema,
  assignContentRequestSchema,
  contentAssignmentSummarySchema,
  createCurricularImportRequestSchema,
  createCurricularSpaceRequestSchema,
  createPciProjectRequestSchema,
  curricularContentListResponseSchema,
  curricularImportListItemSchema,
  curricularImportSummarySchema,
  curricularSpaceSummarySchema,
  curricularTaxonomyAreaSchema,
  devLoginRequestSchema,
  pciProjectSummarySchema,
  pciVersionSummarySchema,
  schoolSummarySchema,
  selectSchoolRequestSchema,
  sessionResponseSchema,
  updatePciVersionRequestSchema,
  type AssignContentRequest,
  type ContentAssignmentSummary,
  type CreateCurricularImportRequest,
  type CreateCurricularSpaceRequest,
  type CreatePciProjectRequest,
  type CurricularContentListResponse,
  type CurricularImportListItem,
  type CurricularImportSummary,
  type CurricularSpaceSummary,
  type CurricularTaxonomyArea,
  type DevLoginRequest,
  type PciProjectSummary,
  type PciVersionSummary,
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

export interface CurricularContentsFilters {
  componentCode?: string;
  areaCode?: string;
  subjectCode?: string;
  axisCode?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function fetchCurricularContents(
  token: string,
  filters: CurricularContentsFilters = {},
): Promise<CurricularContentListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/curricular-contents${query}`, curricularContentListResponseSchema, {
    headers: authHeaders(token),
  });
}

export function fetchCurricularTaxonomy(
  token: string,
  componentCode = 'FORMACION_GENERAL',
): Promise<CurricularTaxonomyArea[]> {
  return request(
    `/curricular-taxonomy?componentCode=${encodeURIComponent(componentCode)}`,
    z.array(curricularTaxonomyAreaSchema),
    { headers: authHeaders(token) },
  );
}

export function fetchPciProjects(token: string): Promise<PciProjectSummary[]> {
  return request('/pci-projects', z.array(pciProjectSummarySchema), {
    headers: authHeaders(token),
  });
}

export function createPciProject(
  token: string,
  payload: CreatePciProjectRequest,
): Promise<PciProjectSummary> {
  const validated = createPciProjectRequestSchema.parse(payload);
  return request('/pci-projects', pciProjectSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(validated),
  });
}

export function createPciVersion(token: string, projectId: string): Promise<PciProjectSummary> {
  return request(`/pci-projects/${projectId}/versions`, pciProjectSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function updatePciVersion(
  token: string,
  versionId: string,
  pedagogicalRationale: string,
): Promise<PciVersionSummary> {
  const validated = updatePciVersionRequestSchema.parse({ pedagogicalRationale });
  return request(`/pci-versions/${versionId}`, pciVersionSummarySchema, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(validated),
  });
}

export function publishPciVersion(token: string, versionId: string): Promise<PciVersionSummary> {
  return request(`/pci-versions/${versionId}/publish`, pciVersionSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function fetchCurricularSpaces(
  token: string,
  versionId: string,
): Promise<CurricularSpaceSummary[]> {
  return request(
    `/pci-versions/${versionId}/curricular-spaces`,
    z.array(curricularSpaceSummarySchema),
    { headers: authHeaders(token) },
  );
}

export function createCurricularSpace(
  token: string,
  versionId: string,
  payload: CreateCurricularSpaceRequest,
): Promise<CurricularSpaceSummary> {
  const validated = createCurricularSpaceRequestSchema.parse(payload);
  return request(`/pci-versions/${versionId}/curricular-spaces`, curricularSpaceSummarySchema, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(validated),
  });
}

export function fetchContentAssignments(
  token: string,
  spaceId: string,
): Promise<ContentAssignmentSummary[]> {
  return request(
    `/curricular-spaces/${spaceId}/content-assignments`,
    z.array(contentAssignmentSummarySchema),
    { headers: authHeaders(token) },
  );
}

export function assignContentToSpace(
  token: string,
  spaceId: string,
  payload: AssignContentRequest,
): Promise<ContentAssignmentSummary[]> {
  const validated = assignContentRequestSchema.parse(payload);
  return request(
    `/curricular-spaces/${spaceId}/content-assignments`,
    z.array(contentAssignmentSummarySchema),
    { method: 'POST', headers: authHeaders(token), body: JSON.stringify(validated) },
  );
}

export function unassignContentFromSpace(
  token: string,
  spaceId: string,
  contentId: string,
): Promise<ContentAssignmentSummary[]> {
  return request(
    `/curricular-spaces/${spaceId}/content-assignments/${contentId}`,
    z.array(contentAssignmentSummarySchema),
    { method: 'DELETE', headers: authHeaders(token) },
  );
}
