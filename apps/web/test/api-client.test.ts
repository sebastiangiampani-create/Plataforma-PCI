import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  assignContentToSpace,
  confirmCurricularImport,
  createCurricularImport,
  createCurricularSpace,
  createPciProject,
  devLogin,
  fetchAccessibleSchools,
  fetchCurricularContents,
  fetchCurricularSpaces,
  fetchCurricularTaxonomy,
  fetchPciProjects,
  listCurricularImports,
  publishPciVersion,
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

describe('createPciProject', () => {
  it('crea el proyecto con su primera versión en DRAFT', async () => {
    const project = {
      id: '11111111-1111-4111-8111-111111111111',
      schoolId: '22222222-2222-4222-8222-222222222222',
      name: 'PCI Escuela 1',
      status: 'DRAFT',
      currentVersion: {
        id: '33333333-3333-4333-8333-333333333333',
        pciProjectId: '11111111-1111-4111-8111-111111111111',
        versionNumber: 1,
        status: 'DRAFT',
        pedagogicalRationale: null,
        createdBy: '44444444-4444-4444-8444-444444444444',
        publishedBy: null,
        createdAt: new Date().toISOString(),
        publishedAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(project));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createPciProject('token', { name: 'PCI Escuela 1' });
    expect(result.currentVersion?.versionNumber).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/pci-projects'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('fetchPciProjects', () => {
  it('parsea el listado de proyectos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));
    const result = await fetchPciProjects('token');
    expect(result).toEqual([]);
  });
});

describe('publishPciVersion', () => {
  it('llama al endpoint de publicación por id de versión', async () => {
    const version = {
      id: '33333333-3333-4333-8333-333333333333',
      pciProjectId: '11111111-1111-4111-8111-111111111111',
      versionNumber: 1,
      status: 'PUBLISHED',
      pedagogicalRationale: 'Fundamento',
      createdBy: '44444444-4444-4444-8444-444444444444',
      publishedBy: '44444444-4444-4444-8444-444444444444',
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(version));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishPciVersion('token', version.id);
    expect(result.status).toBe('PUBLISHED');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/pci-versions/${version.id}/publish`),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('createCurricularSpace', () => {
  it('crea el espacio con sus áreas aportantes', async () => {
    const space = {
      id: '11111111-1111-4111-8111-111111111111',
      pciVersionId: '22222222-2222-4222-8222-222222222222',
      code: 'LAB-1',
      name: 'Laboratorio 1',
      componentCode: 'FORMACION_GENERAL',
      orientationCode: null,
      spaceType: 'AUTONOMO',
      formatType: 'LABORATORIO',
      characterType: 'OBLIGATORIO',
      levelNumber: 3,
      startTerm: 5,
      endTerm: 6,
      objectives: null,
      problemContext: null,
      observations: null,
      status: 'ACTIVE',
      areas: [{ code: 'CIENCIAS_NATURALES', name: 'Ciencias Naturales', responsibilityText: null }],
      contentCount: 0,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(space));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createCurricularSpace('token', space.pciVersionId, {
      code: 'LAB-1',
      name: 'Laboratorio 1',
      componentCode: 'FORMACION_GENERAL',
      spaceType: 'AUTONOMO',
      formatType: 'LABORATORIO',
      characterType: 'OBLIGATORIO',
      levelNumber: 3,
      startTerm: 5,
      endTerm: 6,
      areaCodes: ['CIENCIAS_NATURALES'],
    });

    expect(result.areas).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/pci-versions/${space.pciVersionId}/curricular-spaces`),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('fetchCurricularSpaces', () => {
  it('parsea el listado de espacios de una versión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));
    const result = await fetchCurricularSpaces('token', '22222222-2222-4222-8222-222222222222');
    expect(result).toEqual([]);
  });
});

describe('assignContentToSpace', () => {
  it('asigna un contenido y devuelve la lista actualizada', async () => {
    const assignments = [
      {
        id: '33333333-3333-4333-8333-333333333333',
        curricularContentId: '44444444-4444-4444-8444-444444444444',
        code: 'c1',
        contentText: 'Texto',
        areaName: 'Matemática',
        subjectName: 'Matemática',
        axisName: 'Eje 1',
        coverageWeight: 1,
        notes: null,
        createdAt: new Date().toISOString(),
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(assignments));
    vi.stubGlobal('fetch', fetchMock);

    const result = await assignContentToSpace('token', '11111111-1111-4111-8111-111111111111', {
      curricularContentId: '44444444-4444-4444-8444-444444444444',
    });

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/content-assignments'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
