import { useState } from 'react';
import type { SchoolSummary } from '@pci/domain';
import { ApiError } from '../lib/api-client';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export type SchoolsLoadStatus = 'loading' | 'ready' | 'error';

/** Componente controlado: la carga de datos vive en App, este solo presenta estado. */
export function SchoolSelectorPage({
  status,
  schools,
  errorMessage,
  onRetry,
  onSelect,
}: {
  status: SchoolsLoadStatus;
  schools: SchoolSummary[];
  errorMessage: string;
  onRetry: () => void;
  onSelect: (schoolId: string) => Promise<void>;
}) {
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  const handleSelect = async (schoolId: string) => {
    setSelectingId(schoolId);
    setSelectError(null);
    try {
      await onSelect(schoolId);
    } catch (err) {
      setSelectError(err instanceof ApiError ? err.message : 'No se pudo seleccionar la escuela.');
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="pci-card pci-card--wide">
      <h2>Seleccionar escuela</h2>
      {status === 'loading' ? <LoadingState label="Cargando escuelas…" /> : null}
      {status === 'error' ? <ErrorState message={errorMessage} onRetry={onRetry} /> : null}
      {status === 'ready' && schools.length === 0 ? (
        <EmptyState message="No hay escuelas disponibles para este usuario todavía." />
      ) : null}
      {status === 'ready' && schools.length > 0 ? (
        <>
          {selectError ? (
            <p className="pci-state pci-state--error" role="alert">
              {selectError}
            </p>
          ) : null}
          <ul className="pci-school-list">
            {schools.map((school) => (
              <li key={school.id}>
                <button
                  type="button"
                  className="pci-school-item"
                  onClick={() => handleSelect(school.id)}
                  disabled={selectingId !== null}
                >
                  <span>
                    {school.name}
                    <br />
                    <span className="pci-school-item__code">{school.code}</span>
                  </span>
                  <span>{selectingId === school.id ? 'Seleccionando…' : '→'}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
