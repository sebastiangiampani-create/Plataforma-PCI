import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CurricularContentsPage } from '../src/pages/CurricularContentsPage';

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const taxonomy = [
  {
    code: 'MATEMATICA',
    name: 'Matemática',
    subjects: [
      {
        code: 'MATEMATICA_MATEMATICA',
        name: 'Matemática',
        axes: [{ code: 'MATEMATICA_MATEMATICA_EJE_001', name: 'Números naturales' }],
      },
    ],
  },
];

const contentsResponse = {
  items: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'c1',
      contentText: 'Suma y resta de números naturales',
      status: 'ACTIVE',
      componentCode: 'FORMACION_GENERAL',
      areaCode: 'MATEMATICA',
      areaName: 'Matemática',
      subjectCode: 'MATEMATICA_MATEMATICA',
      subjectName: 'Matemática',
      axisCode: 'MATEMATICA_MATEMATICA_EJE_001',
      axisName: 'Números naturales',
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CurricularContentsPage', () => {
  it('carga la taxonomía y los contenidos, y muestra la tabla', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/curricular-taxonomy')) return Promise.resolve(jsonResponse(taxonomy));
      return Promise.resolve(jsonResponse(contentsResponse));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CurricularContentsPage token="token" />);

    expect(await screen.findByText('Suma y resta de números naturales')).toBeInTheDocument();
    expect(screen.getByText(/1 contenido/i)).toBeInTheDocument();
  });

  it('al elegir un área, vuelve a pedir los contenidos filtrados', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/curricular-taxonomy')) return Promise.resolve(jsonResponse(taxonomy));
      return Promise.resolve(jsonResponse(contentsResponse));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CurricularContentsPage token="token" />);
    await screen.findByText('Suma y resta de números naturales');

    fireEvent.change(screen.getByLabelText(/^área$/i), { target: { value: 'MATEMATICA' } });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('areaCode=MATEMATICA'),
        expect.anything(),
      ),
    );
  });
});
