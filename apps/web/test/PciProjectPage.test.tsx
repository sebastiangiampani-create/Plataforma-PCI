import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PciProjectPage } from '../src/pages/PciProjectPage';

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PciProjectPage', () => {
  it('muestra el estado vacío y permite crear el primer proyecto', async () => {
    const draftProject = {
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

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/curricular-spaces')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/curricular-taxonomy')) return Promise.resolve(jsonResponse([]));
      if (init?.method === 'POST' && url.includes('/pci-projects')) {
        return Promise.resolve(jsonResponse(draftProject));
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PciProjectPage token="token" />);

    expect(await screen.findByText(/todavía no tiene un proyecto pci/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /nuevo proyecto/i }));
    fireEvent.change(screen.getByLabelText(/nombre del proyecto/i), {
      target: { value: 'PCI Escuela 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear proyecto/i }));

    expect(await screen.findByText(/versión 1 · borrador/i)).toBeInTheDocument();
  });

  it('publica la versión actual y habilita crear una versión nueva', async () => {
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
        pedagogicalRationale: 'Fundamento existente',
        createdBy: '44444444-4444-4444-8444-444444444444',
        publishedBy: null,
        createdAt: new Date().toISOString(),
        publishedAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const publishedVersion = {
      ...project.currentVersion,
      status: 'PUBLISHED',
      publishedBy: '44444444-4444-4444-8444-444444444444',
      publishedAt: new Date().toISOString(),
    };

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/curricular-spaces')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/curricular-taxonomy')) return Promise.resolve(jsonResponse([]));
      if (init?.method === 'POST' && url.includes('/publish')) {
        return Promise.resolve(jsonResponse(publishedVersion));
      }
      return Promise.resolve(jsonResponse([project]));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PciProjectPage token="token" />);

    fireEvent.click(await screen.findByText('PCI Escuela 1'));
    fireEvent.click(await screen.findByRole('button', { name: /publicar versión/i }));

    await waitFor(() => expect(screen.getByText(/versión 1 · publicado/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /crear versión nueva/i })).toBeInTheDocument();
  });
});
