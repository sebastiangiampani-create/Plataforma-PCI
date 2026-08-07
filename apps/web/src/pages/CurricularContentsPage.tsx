import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CurricularContentSummary, CurricularTaxonomyArea } from '@pci/domain';
import { ApiError, fetchCurricularContents, fetchCurricularTaxonomy } from '../lib/api-client';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';

const PAGE_SIZE = 20;

export function CurricularContentsPage({ token }: { token: string }) {
  const [taxonomy, setTaxonomy] = useState<CurricularTaxonomyArea[]>([]);
  const [areaCode, setAreaCode] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [axisCode, setAxisCode] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<CurricularContentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurricularTaxonomy(token, 'FORMACION_GENERAL')
      .then(setTaxonomy)
      .catch(() => setTaxonomy([]));
  }, [token]);

  useEffect(() => {
    setStatus('loading');
    fetchCurricularContents(token, {
      componentCode: 'FORMACION_GENERAL',
      areaCode: areaCode || undefined,
      subjectCode: subjectCode || undefined,
      axisCode: axisCode || undefined,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
        setStatus('ready');
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : 'No se pudo cargar la bolsa de contenidos.',
        );
        setStatus('error');
      });
  }, [token, areaCode, subjectCode, axisCode, search, page]);

  const selectedArea = useMemo(
    () => taxonomy.find((area) => area.code === areaCode),
    [taxonomy, areaCode],
  );
  const selectedSubject = useMemo(
    () => selectedArea?.subjects.find((subject) => subject.code === subjectCode),
    [selectedArea, subjectCode],
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="pci-card pci-card--wide">
      <h2>Bolsa de contenidos — Formación General</h2>

      <div className="pci-filters">
        <div className="pci-field">
          <label htmlFor="filterArea">Área</label>
          <select
            id="filterArea"
            value={areaCode}
            onChange={(event) => {
              setAreaCode(event.target.value);
              setSubjectCode('');
              setAxisCode('');
              setPage(0);
            }}
          >
            <option value="">Todas</option>
            {taxonomy.map((area) => (
              <option key={area.code} value={area.code}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pci-field">
          <label htmlFor="filterSubject">Materia</label>
          <select
            id="filterSubject"
            value={subjectCode}
            disabled={!selectedArea}
            onChange={(event) => {
              setSubjectCode(event.target.value);
              setAxisCode('');
              setPage(0);
            }}
          >
            <option value="">Todas</option>
            {selectedArea?.subjects.map((subject) => (
              <option key={subject.code} value={subject.code}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pci-field">
          <label htmlFor="filterAxis">Eje</label>
          <select
            id="filterAxis"
            value={axisCode}
            disabled={!selectedSubject}
            onChange={(event) => {
              setAxisCode(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {selectedSubject?.axes.map((axis) => (
              <option key={axis.code} value={axis.code}>
                {axis.name}
              </option>
            ))}
          </select>
        </div>
        <form className="pci-field pci-filters__search" onSubmit={handleSearchSubmit}>
          <label htmlFor="filterSearch">Buscar texto</label>
          <div className="pci-filters__search-row">
            <input
              id="filterSearch"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Ej: internet, ciudadanía, energía…"
            />
            <button type="submit" className="pci-button pci-button--secondary">
              Buscar
            </button>
          </div>
        </form>
      </div>

      {status === 'loading' ? <LoadingState label="Cargando contenidos…" /> : null}
      {status === 'error' ? <ErrorState message={error} /> : null}
      {status === 'ready' && items.length === 0 ? (
        <EmptyState message="No hay contenidos que coincidan con los filtros." />
      ) : null}

      {status === 'ready' && items.length > 0 ? (
        <>
          <p className="pci-table__muted">
            {total} contenido{total === 1 ? '' : 's'} · página {page + 1} de {pageCount}
          </p>
          <div className="pci-table-wrap">
            <table className="pci-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Área</th>
                  <th>Materia</th>
                  <th>Eje</th>
                  <th>Contenido</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.areaName}</td>
                    <td>{item.subjectName}</td>
                    <td>{item.axisName}</td>
                    <td>{item.contentText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pci-imports-actions">
            <button
              type="button"
              className="pci-button pci-button--secondary"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="pci-button pci-button--secondary"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
