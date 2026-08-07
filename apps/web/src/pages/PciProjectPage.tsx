import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { PciProjectSummary, ValidationRunResponse } from '@pci/domain';
import {
  ApiError,
  createPciProject,
  createPciVersion,
  fetchPciProjects,
  fetchValidationResults,
  publishPciVersion,
  runValidation,
  updatePciVersion,
} from '../lib/api-client';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { CurricularSpacesPanel } from './CurricularSpacesPanel';

type View = 'list' | 'form' | 'detail';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  VALIDATED: 'Validado',
  PUBLISHED: 'Publicado',
};

const SEVERITY_LABEL: Record<string, string> = {
  ERROR: 'Error',
  WARNING: 'Advertencia',
  RECOMMENDATION: 'Recomendación',
};

export function PciProjectPage({ token }: { token: string }) {
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [projects, setProjects] = useState<PciProjectSummary[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PciProjectSummary | null>(null);

  const loadProjects = useCallback(() => {
    setStatus('loading');
    fetchPciProjects(token)
      .then((result) => {
        setProjects(result);
        setStatus('ready');
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : 'No se pudieron cargar los proyectos PCI.',
        );
        setStatus('error');
      });
  }, [token]);

  useEffect(() => {
    if (view === 'list') loadProjects();
  }, [view, loadProjects]);

  const openProject = (project: PciProjectSummary) => {
    setSelected(project);
    setView('detail');
  };

  const handleCreated = (project: PciProjectSummary) => {
    setSelected(project);
    setView('detail');
  };

  return (
    <div className="pci-card pci-card--wide">
      <div className="pci-imports-header">
        <h2>Proyecto PCI</h2>
        {view === 'list' ? (
          <button type="button" className="pci-button" onClick={() => setView('form')}>
            Nuevo proyecto
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
        <ProjectsList status={status} projects={projects} error={error} onOpen={openProject} />
      ) : null}

      {view === 'form' ? <ProjectForm token={token} onCreated={handleCreated} /> : null}

      {view === 'detail' && selected ? (
        <ProjectDetail
          token={token}
          project={selected}
          onChanged={(updated) => setSelected(updated)}
        />
      ) : null}
    </div>
  );
}

function ProjectsList({
  status,
  projects,
  error,
  onOpen,
}: {
  status: 'loading' | 'ready' | 'error';
  projects: PciProjectSummary[];
  error: string;
  onOpen: (project: PciProjectSummary) => void;
}) {
  if (status === 'loading') return <LoadingState label="Cargando proyectos PCI…" />;
  if (status === 'error') return <ErrorState message={error} />;
  if (projects.length === 0)
    return <EmptyState message="Esta escuela todavía no tiene un proyecto PCI." />;

  return (
    <div className="pci-table-wrap">
      <table className="pci-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Versión actual</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="pci-table__row" onClick={() => onOpen(project)}>
              <td>{project.name}</td>
              <td>{STATUS_LABEL[project.status] ?? project.status}</td>
              <td>
                {project.currentVersion
                  ? `v${project.currentVersion.versionNumber} · ${
                      STATUS_LABEL[project.currentVersion.status] ?? project.currentVersion.status
                    }`
                  : '—'}
              </td>
              <td>{new Date(project.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (project: PciProjectSummary) => void;
}) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const project = await createPciProject(token, { name });
      onCreated(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el proyecto PCI.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="pci-field">
        <label htmlFor="pciProjectName">Nombre del proyecto</label>
        <input
          id="pciProjectName"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: PCI Escuela 1 — 2026"
        />
      </div>
      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="pci-button" disabled={submitting}>
        {submitting ? 'Creando…' : 'Crear proyecto'}
      </button>
    </form>
  );
}

function ProjectDetail({
  token,
  project,
  onChanged,
}: {
  token: string;
  project: PciProjectSummary;
  onChanged: (project: PciProjectSummary) => void;
}) {
  const version = project.currentVersion;
  const [rationale, setRationale] = useState(version?.pedagogicalRationale ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRationale(version?.pedagogicalRationale ?? '');
  }, [version?.id, version?.pedagogicalRationale]);

  if (!version) {
    return <EmptyState message="Este proyecto todavía no tiene una versión." />;
  }

  const isPublished = version.status === 'PUBLISHED';

  const handleSaveRationale = async () => {
    setBusy(true);
    setError(null);
    try {
      const updatedVersion = await updatePciVersion(token, version.id, rationale);
      onChanged({ ...project, currentVersion: updatedVersion });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo guardar el fundamento pedagógico.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    setError(null);
    try {
      const updatedVersion = await publishPciVersion(token, version.id);
      onChanged({ ...project, status: updatedVersion.status, currentVersion: updatedVersion });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo publicar la versión.');
    } finally {
      setBusy(false);
    }
  };

  const handleNewVersion = async () => {
    setBusy(true);
    setError(null);
    try {
      const updatedProject = await createPciVersion(token, project.id);
      onChanged(updatedProject);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear una nueva versión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p>
        <strong>{project.name}</strong> · versión {version.versionNumber} ·{' '}
        {STATUS_LABEL[version.status] ?? version.status}
      </p>
      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pci-field">
        <label htmlFor="pedagogicalRationale">Fundamento pedagógico</label>
        <textarea
          id="pedagogicalRationale"
          rows={6}
          value={rationale}
          disabled={isPublished}
          onChange={(event) => setRationale(event.target.value)}
          placeholder="Fundamento pedagógico de esta versión del PCI…"
        />
      </div>

      <div className="pci-imports-actions">
        {!isPublished ? (
          <button
            type="button"
            className="pci-button pci-button--secondary"
            disabled={busy || !rationale.trim()}
            onClick={handleSaveRationale}
          >
            {busy ? 'Guardando…' : 'Guardar fundamento'}
          </button>
        ) : null}
        {!isPublished ? (
          <button type="button" className="pci-button" disabled={busy} onClick={handlePublish}>
            {busy ? 'Publicando…' : 'Publicar versión'}
          </button>
        ) : (
          <button type="button" className="pci-button" disabled={busy} onClick={handleNewVersion}>
            {busy ? 'Creando…' : 'Crear versión nueva'}
          </button>
        )}
      </div>

      {isPublished ? (
        <p className="pci-table__muted">
          Esta versión está publicada y es inmutable (PCI-VER-001). Para seguir modificando el PCI,
          creá una versión nueva.
        </p>
      ) : null}

      <hr className="pci-divider" />
      <ValidationPanel token={token} versionId={version.id} />

      <hr className="pci-divider" />
      <CurricularSpacesPanel token={token} versionId={version.id} isPublished={isPublished} />
    </div>
  );
}

function ValidationPanel({ token, versionId }: { token: string; versionId: string }) {
  const [data, setData] = useState<ValidationRunResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    fetchValidationResults(token, versionId)
      .then((result) => {
        setData(result);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la validación.');
        setStatus('error');
      });
  }, [token, versionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRun = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await runValidation(token, versionId);
      setData(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo validar la versión.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="pci-imports-header">
        <h4>Validación (motor de reglas PCI)</h4>
        <button type="button" className="pci-button" disabled={running} onClick={handleRun}>
          {running ? 'Validando…' : 'Validar versión'}
        </button>
      </div>

      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'loading' ? <LoadingState label="Cargando validación…" /> : null}
      {status === 'error' ? <ErrorState message={error} /> : null}

      {status === 'ready' && data && data.summary.length === 0 ? (
        <EmptyState message="Todavía no se corrió la validación, o la última corrida no encontró hallazgos." />
      ) : null}

      {status === 'ready' && data && data.summary.length > 0 ? (
        <>
          <div className="pci-table-wrap">
            <table className="pci-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Severidad</th>
                  <th>Hallazgos</th>
                  <th>Regla</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((entry) => (
                  <tr key={entry.ruleCode}>
                    <td>{entry.ruleCode}</td>
                    <td>{SEVERITY_LABEL[entry.severity] ?? entry.severity}</td>
                    <td>{entry.count}</td>
                    <td>{entry.ruleName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pci-table-wrap">
            <table className="pci-table">
              <thead>
                <tr>
                  <th>Regla</th>
                  <th>Entidad</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.ruleCode}</td>
                    <td>{result.entityType}</td>
                    <td>{result.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.truncated ? (
            <p className="pci-table__muted">
              Se muestran los primeros {data.results.length} hallazgos de detalle; el resumen de
              arriba refleja el total real.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
