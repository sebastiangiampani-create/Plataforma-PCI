import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { CurricularImportListItem, CurricularImportSummary } from '@pci/domain';
import {
  ApiError,
  confirmCurricularImport,
  createCurricularImport,
  getCurricularImport,
  listCurricularImports,
  revertCurricularImport,
} from '../lib/api-client';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';

type ListStatus = 'loading' | 'ready' | 'error';
type View = 'list' | 'form' | 'detail';

const ROW_STATUS_LABEL: Record<string, string> = {
  VALID: 'Válida',
  INVALID: 'Inválida',
  DUPLICATE: 'Duplicada',
  IMPORTED: 'Importada',
};

const IMPORT_STATUS_LABEL: Record<string, string> = {
  PREVIEW: 'Previsualización',
  APPLIED: 'Aplicada',
  REVERTED: 'Revertida',
};

export function CurricularImportsPage({ token }: { token: string }) {
  const [view, setView] = useState<View>('list');
  const [listStatus, setListStatus] = useState<ListStatus>('loading');
  const [imports, setImports] = useState<CurricularImportListItem[]>([]);
  const [listError, setListError] = useState('');
  const [detail, setDetail] = useState<CurricularImportSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(() => {
    setListStatus('loading');
    listCurricularImports(token)
      .then((result) => {
        setImports(result);
        setListStatus('ready');
      })
      .catch((err) => {
        setListError(
          err instanceof ApiError ? err.message : 'No se pudieron cargar las importaciones.',
        );
        setListStatus('error');
      });
  }, [token]);

  useEffect(() => {
    if (view === 'list') loadList();
  }, [view, loadList]);

  const openDetail = async (id: string) => {
    setActionError(null);
    try {
      const result = await getCurricularImport(token, id);
      setDetail(result);
      setView('detail');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo abrir la importación.');
    }
  };

  const handleCreated = (summary: CurricularImportSummary) => {
    setDetail(summary);
    setView('detail');
  };

  const runAction = async (
    action: (token: string, id: string) => Promise<CurricularImportSummary>,
  ) => {
    if (!detail) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await action(token, detail.id);
      setDetail(result);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'La acción no se pudo completar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pci-card pci-card--wide">
      <div className="pci-imports-header">
        <h2>Importación curricular</h2>
        {view === 'list' ? (
          <button type="button" className="pci-button" onClick={() => setView('form')}>
            Nueva importación
          </button>
        ) : (
          <button
            type="button"
            className="pci-button pci-button--secondary"
            onClick={() => setView('list')}
          >
            Volver al listado
          </button>
        )}
      </div>

      {view === 'list' ? (
        <ImportsList status={listStatus} imports={imports} error={listError} onOpen={openDetail} />
      ) : null}

      {view === 'form' ? <ImportForm token={token} onCreated={handleCreated} /> : null}

      {view === 'detail' && detail ? (
        <ImportDetail
          summary={detail}
          busy={busy}
          error={actionError}
          onConfirm={() => runAction(confirmCurricularImport)}
          onRevert={() => runAction(revertCurricularImport)}
        />
      ) : null}
    </div>
  );
}

function ImportsList({
  status,
  imports,
  error,
  onOpen,
}: {
  status: ListStatus;
  imports: CurricularImportListItem[];
  error: string;
  onOpen: (id: string) => void;
}) {
  if (status === 'loading') return <LoadingState label="Cargando importaciones…" />;
  if (status === 'error') return <ErrorState message={error} />;
  if (imports.length === 0)
    return <EmptyState message="Todavía no se cargó ninguna importación." />;

  return (
    <div className="pci-table-wrap">
      <table className="pci-table">
        <thead>
          <tr>
            <th>Fuente</th>
            <th>Estado</th>
            <th>Filas</th>
            <th>Válidas</th>
            <th>Inválidas</th>
            <th>Duplicadas</th>
            <th>Importadas</th>
            <th>Creada</th>
          </tr>
        </thead>
        <tbody>
          {imports.map((item) => (
            <tr key={item.id} className="pci-table__row" onClick={() => onOpen(item.id)}>
              <td>
                {item.sourceName}
                <div className="pci-table__muted">{item.sourceVersion}</div>
              </td>
              <td>{IMPORT_STATUS_LABEL[item.status] ?? item.status}</td>
              <td>{item.rowCount}</td>
              <td>{item.validCount}</td>
              <td>{item.invalidCount}</td>
              <td>{item.duplicateCount}</td>
              <td>{item.importedCount}</td>
              <td>{new Date(item.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (summary: CurricularImportSummary) => void;
}) {
  const [sourceName, setSourceName] = useState('');
  const [sourceVersion, setSourceVersion] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then(setCsvContent)
      .catch(() => setError('No se pudo leer el archivo.'));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await createCurricularImport(token, { sourceName, sourceVersion, csvContent });
      onCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la importación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="pci-table__muted">
        Subí un CSV con las columnas{' '}
        <code>
          component_code,orientation_code,area_code,subject_code,axis_code,code,content_text
        </code>{' '}
        (ver <code>docs/10-importador-curricular.md</code>). No se escribe nada todavía: esto solo
        genera una previsualización.
      </p>
      <div className="pci-field">
        <label htmlFor="sourceName">Nombre de la fuente</label>
        <input
          id="sourceName"
          type="text"
          required
          value={sourceName}
          onChange={(event) => setSourceName(event.target.value)}
          placeholder="Ej: Actualización 2026 - Ciencias Sociales"
        />
      </div>
      <div className="pci-field">
        <label htmlFor="sourceVersion">Versión de la fuente</label>
        <input
          id="sourceVersion"
          type="text"
          required
          value={sourceVersion}
          onChange={(event) => setSourceVersion(event.target.value)}
          placeholder="Ej: 2026-08-ciencias-sociales"
        />
      </div>
      <div className="pci-field">
        <label htmlFor="csvFile">Archivo CSV</label>
        <input
          id="csvFile"
          type="file"
          accept=".csv,text/csv"
          ref={fileInputRef}
          onChange={handleFile}
        />
      </div>
      <div className="pci-field">
        <label htmlFor="csvContent">Contenido CSV</label>
        <textarea
          id="csvContent"
          required
          rows={8}
          value={csvContent}
          onChange={(event) => setCsvContent(event.target.value)}
          placeholder="component_code,orientation_code,area_code,subject_code,axis_code,code,content_text"
        />
      </div>
      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="pci-button" disabled={submitting}>
        {submitting ? 'Previsualizando…' : 'Previsualizar'}
      </button>
    </form>
  );
}

function ImportDetail({
  summary,
  busy,
  error,
  onConfirm,
  onRevert,
}: {
  summary: CurricularImportSummary;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onRevert: () => void;
}) {
  return (
    <div>
      <p>
        <strong>{summary.sourceName}</strong> ({summary.sourceVersion}) ·{' '}
        {IMPORT_STATUS_LABEL[summary.status] ?? summary.status}
      </p>
      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="pci-imports-actions">
        {summary.status === 'PREVIEW' ? (
          <button type="button" className="pci-button" disabled={busy} onClick={onConfirm}>
            {busy ? 'Confirmando…' : 'Confirmar importación'}
          </button>
        ) : null}
        {summary.status === 'APPLIED' ? (
          <button
            type="button"
            className="pci-button pci-button--secondary"
            disabled={busy}
            onClick={onRevert}
          >
            {busy ? 'Revirtiendo…' : 'Revertir'}
          </button>
        ) : null}
      </div>
      <div className="pci-table-wrap">
        <table className="pci-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Código</th>
              <th>Estado</th>
              <th>Errores</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.rowNumber}</td>
                <td>{row.rawData.code}</td>
                <td>
                  <span className={`pci-badge pci-badge--${row.status.toLowerCase()}`}>
                    {ROW_STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
                <td>{row.validationErrors?.join(' ') ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
