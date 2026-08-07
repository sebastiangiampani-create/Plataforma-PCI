import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CurricularImportsPage } from '../src/pages/CurricularImportsPage';

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CurricularImportsPage', () => {
  it('muestra el estado vacío cuando no hay importaciones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));

    render(<CurricularImportsPage token="token" />);

    expect(await screen.findByText(/todavía no se cargó ninguna importación/i)).toBeInTheDocument();
  });

  it('crea una importación, la previsualiza y permite confirmarla', async () => {
    const previewSummary = {
      id: '11111111-1111-4111-8111-111111111111',
      schoolId: null,
      sourceName: 'prueba',
      sourceVersion: 'v1',
      status: 'PREVIEW',
      importedBy: '22222222-2222-4222-8222-222222222222',
      createdAt: new Date().toISOString(),
      revertedAt: null,
      rows: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          rowNumber: 1,
          status: 'VALID',
          rawData: { code: 'c-nuevo' },
          validationErrors: null,
          curricularContentId: null,
        },
      ],
    };
    const appliedSummary = {
      ...previewSummary,
      status: 'APPLIED',
      rows: [
        {
          ...previewSummary.rows[0],
          status: 'IMPORTED',
          curricularContentId: '44444444-4444-4444-8444-444444444444',
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([])) // listado inicial
      .mockResolvedValueOnce(jsonResponse(previewSummary)) // crear
      .mockResolvedValueOnce(jsonResponse(appliedSummary)); // confirmar
    vi.stubGlobal('fetch', fetchMock);

    render(<CurricularImportsPage token="token" />);

    await screen.findByText(/todavía no se cargó ninguna importación/i);
    fireEvent.click(screen.getByRole('button', { name: /nueva importación/i }));

    fireEvent.change(screen.getByLabelText(/nombre de la fuente/i), {
      target: { value: 'prueba' },
    });
    fireEvent.change(screen.getByLabelText(/versión de la fuente/i), { target: { value: 'v1' } });
    fireEvent.change(screen.getByLabelText(/contenido csv/i), {
      target: { value: 'component_code\nFORMACION_GENERAL' },
    });
    fireEvent.click(screen.getByRole('button', { name: /previsualizar/i }));

    expect(await screen.findByText('c-nuevo')).toBeInTheDocument();
    expect(screen.getByText('Válida')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirmar importación/i }));

    await waitFor(() => expect(screen.getByText('Importada')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/curricular-imports/${previewSummary.id}/confirm`),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
