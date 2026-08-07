import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  confirmCurricularImport,
  createCurricularImport,
  devLogin,
  fetchAccessibleSchools,
  fetchCurricularContents,
  fetchCurricularTaxonomy,
  listCurricularImports,
} from '../src/lib/api-client';

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('devLogin', () => {
  it('devuelve la sesión parseada cuando la API responde 200', async () => {
    const session = {
      token: 'abc',
      user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@b.com', displayName: 'A' },
      activeSchoolId: null,
      expiresAt: new Date().toISOString(),
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(session));
    vi.stubGlobal('fetch', fetchMock);

    const result = await devLogin({ email: 'a@b.com' });
    expect(result.token).toBe('abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/dev-login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lanza ApiError con el código del servidor cuando la API responde un error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'No encontrado' } }, { status: 404 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(devLogin({ email: 'a@b.com' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('lanza ApiError de red cuando fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(devLogin({ email: 'a@b.com' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('fetchAccessibleSchools', () => {
  it('parsea un arreglo de escuelas', async () => {
    const schools = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        code: 'PCI-101',
        name: 'Escuela 1',
        roleCode: 'ADMIN_CURRICULAR',
      },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(schools)));

    const result = await fetchAccessibleSchools('token');
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('PCI-101');
  });

  it('lanza INVALID_RESPONSE si la forma no coincide con el contrato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ nombre: 'algo' }])));
    await expect(fetchAccessibleSchools('token')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
});

describe('createCurricularImport', () => {
  it('envía el body validado y devuelve la importación parseada', async () => {
    const summary = {
      id: '11111111-1111-4111-8111-111111111111',
      schoolId: null,
      sourceName: 'prueba',
      sourceVersion: 'v1',
      status: 'PREVIEW',
      importedBy: '22222222-2222-4222-8222-222222222222',
      createdAt: new Date().toISOString(),
      revertedAt: null,
      rows: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(summary));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createCurricularImport('token', {
      sourceName: 'prueba',
      sourceVersion: 'v1',
      csvContent: 'a,b\n1,2',
    });

    expect(result.status).toBe('PREVIEW');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/curricular-imports'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('confirmCurricularImport', () => {
  it('llama al endpoint de confirmación por id', async () => {
    const summary = {
      id: '11111111-1111-4111-8111-111111111111',
      schoolId: null,
      sourceName: 'prueba',
      sourceVersion: 'v1',
      status: 'APPLIED',
      importedBy: '22222222-2222-4222-8222-222222222222',
      createdAt: new Date().toISOString(),
      revertedAt: null,
      rows: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(summary));
    vi.stubGlobal('fetch', fetchMock);

    const result = await confirmCurricularImport('token', summary.id);

    expect(result.status).toBe('APPLIED');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/curricular-imports/${summary.id}/confirm`),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('listCurricularImports', () => {
  it('parsea el listado con conteos por estado', async () => {
    const items = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        schoolId: null,
        sourceName: 'prueba',
        sourceVersion: 'v1',
        status: 'PREVIEW',
        importedBy: '22222222-2222-4222-8222-222222222222',
        createdAt: new Date().toISOString(),
        revertedAt: null,
        rowCount: 2,
        validCount: 1,
        invalidCount: 1,
        duplicateCount: 0,
        importedCount: 0,
      },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(items)));

    const result = await listCurricularImports('token');
    expect(result).toHaveLength(1);
    expect(result[0]?.rowCount).toBe(2);
  });
});

describe('fetchCurricularContents', () => {
  it('construye la query string con los filtros y omite los vacíos', async () => {
    const response = { items: [], total: 0, limit: 20, offset: 0 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);

    await fetchCurricularContents('token', {
      componentCode: 'FORMACION_GENERAL',
      areaCode: 'MATEMATICA',
      subjectCode: undefined,
      search: '',
      limit: 20,
      offset: 0,
    });

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('componentCode=FORMACION_GENERAL');
    expect(calledUrl).toContain('areaCode=MATEMATICA');
    expect(calledUrl).not.toContain('subjectCode');
    expect(calledUrl).not.toContain('search=');
  });

  it('parsea la respuesta paginada', async () => {
    const response = {
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          code: 'c1',
          contentText: 'Texto',
          status: 'ACTIVE',
          componentCode: 'FORMACION_GENERAL',
          areaCode: 'MATEMATICA',
          areaName: 'Matemática',
          subjectCode: 'MATEMATICA_MATEMATICA',
          subjectName: 'Matemática',
          axisCode: 'MATEMATICA_MATEMATICA_EJE_001',
          axisName: 'Eje 1',
        },
      ],
      total: 60,
      limit: 20,
      offset: 0,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(response)));

    const result = await fetchCurricularContents('token');
    expect(result.total).toBe(60);
    expect(result.items[0]?.code).toBe('c1');
  });
});

describe('fetchCurricularTaxonomy', () => {
  it('parsea la taxonomía anidada', async () => {
    const taxonomy = [
      {
        code: 'MATEMATICA',
        name: 'Matemática',
        subjects: [
          {
            code: 'MATEMATICA_MATEMATICA',
            name: 'Matemática',
            axes: [{ code: 'MATEMATICA_MATEMATICA_EJE_001', name: 'Eje 1' }],
          },
        ],
      },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(taxonomy)));

    const result = await fetchCurricularTaxonomy('token');
    expect(result[0]?.subjects[0]?.axes[0]?.code).toBe('MATEMATICA_MATEMATICA_EJE_001');
  });
});
