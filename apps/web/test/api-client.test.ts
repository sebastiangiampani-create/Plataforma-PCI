import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, devLogin, fetchAccessibleSchools } from '../src/lib/api-client';

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
