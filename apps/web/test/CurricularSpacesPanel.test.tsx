import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CurricularSpacesPanel } from '../src/pages/CurricularSpacesPanel';

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const taxonomy = [
  { code: 'CIENCIAS_NATURALES', name: 'Ciencias Naturales', subjects: [] },
  { code: 'MATEMATICA', name: 'Matemática', subjects: [] },
];

const createdSpace = {
  id: '11111111-1111-4111-8111-111111111111',
  pciVersionId: '22222222-2222-4222-8222-222222222222',
  code: 'LAB-BIO-1',
  name: 'Laboratorio de Biología 1',
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CurricularSpacesPanel', () => {
  it('muestra el estado vacío cuando la versión no tiene espacios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));

    render(
      <CurricularSpacesPanel
        token="token"
        versionId="22222222-2222-4222-8222-222222222222"
        isPublished={false}
      />,
    );

    expect(await screen.findByText(/todavía no tiene espacios curriculares/i)).toBeInTheDocument();
  });

  it('crea un espacio con el nivel elegido y calcula los cuatrimestres automáticamente', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/curricular-taxonomy')) return Promise.resolve(jsonResponse(taxonomy));
      if (init?.method === 'POST' && url.includes('/curricular-spaces')) {
        return Promise.resolve(jsonResponse(createdSpace));
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <CurricularSpacesPanel
        token="token"
        versionId="22222222-2222-4222-8222-222222222222"
        isPublished={false}
      />,
    );

    await screen.findByText(/todavía no tiene espacios curriculares/i);
    fireEvent.click(screen.getByRole('button', { name: /nuevo espacio/i }));

    fireEvent.change(screen.getByLabelText(/código/i), { target: { value: 'LAB-BIO-1' } });
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: 'Laboratorio de Biología 1' },
    });
    fireEvent.change(screen.getByLabelText(/nivel/i), { target: { value: '3' } });

    await screen.findByText('Ciencias Naturales');
    fireEvent.click(screen.getByRole('checkbox', { name: /ciencias naturales/i }));

    fireEvent.click(screen.getByRole('button', { name: /crear espacio curricular/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/curricular-spaces'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"startTerm":5'),
        }),
      ),
    );
  });
});
