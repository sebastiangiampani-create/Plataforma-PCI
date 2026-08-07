import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getTermsForLevel } from '@pci/domain';
import type {
  CurricularContentSummary,
  CurricularSpaceSummary,
  CurricularTaxonomyArea,
  WeeklyHoursEntry,
  WeeklyHoursSuggestion,
} from '@pci/domain';
import {
  ApiError,
  assignContentToSpace,
  createCurricularSpace,
  fetchContentAssignments,
  fetchCurricularContents,
  fetchCurricularSpaces,
  fetchCurricularTaxonomy,
  fetchWeeklyHours,
  fetchWeeklyHoursSuggestions,
  removeWeeklyHours,
  setWeeklyHours,
  unassignContentFromSpace,
} from '../lib/api-client';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';

type View = 'list' | 'form' | 'detail';

const SPACE_TYPES = ['AUTONOMO', 'INTEGRADO', 'ARTICULADOR'] as const;
const FORMAT_TYPES = [
  'NIVEL',
  'LABORATORIO',
  'TALLER',
  'SEMINARIO',
  'PROYECTO',
  'PROYECTO_SOCIOCOMUNITARIO_SOLIDARIO',
  'ORIENTACION',
  'PROYECTO_VINCULACION_FUTURO',
] as const;
const CHARACTER_TYPES = ['OBLIGATORIO', 'ELECTIVO'] as const;

export function CurricularSpacesPanel({
  token,
  versionId,
  isPublished,
}: {
  token: string;
  versionId: string;
  isPublished: boolean;
}) {
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [spaces, setSpaces] = useState<CurricularSpaceSummary[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CurricularSpaceSummary | null>(null);

  const loadSpaces = useCallback(() => {
    setStatus('loading');
    fetchCurricularSpaces(token, versionId)
      .then((result) => {
        setSpaces(result);
        setStatus('ready');
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudieron cargar los espacios curriculares.',
        );
        setStatus('error');
      });
  }, [token, versionId]);

  useEffect(() => {
    if (view === 'list') loadSpaces();
  }, [view, loadSpaces]);

  return (
    <div>
      <div className="pci-imports-header">
        <h3>Espacios curriculares</h3>
        {view === 'list' && !isPublished ? (
          <button type="button" className="pci-button" onClick={() => setView('form')}>
            Nuevo espacio
          </button>
        ) : null}
        {view !== 'list' ? (
          <button
            type="button"
            className="pci-button pci-button--secondary"
            onClick={() => setView('list')}
          >
            Volver al listado
          </button>
        ) : null}
      </div>

      {view === 'list' ? (
        <SpacesList
          status={status}
          spaces={spaces}
          error={error}
          onOpen={(space) => {
            setSelected(space);
            setView('detail');
          }}
        />
      ) : null}

      {view === 'form' ? (
        <SpaceForm
          token={token}
          versionId={versionId}
          onCreated={(space) => {
            setSelected(space);
            setView('detail');
          }}
        />
      ) : null}

      {view === 'detail' && selected ? (
        <SpaceDetail token={token} space={selected} isPublished={isPublished} />
      ) : null}
    </div>
  );
}

function SpacesList({
  status,
  spaces,
  error,
  onOpen,
}: {
  status: 'loading' | 'ready' | 'error';
  spaces: CurricularSpaceSummary[];
  error: string;
  onOpen: (space: CurricularSpaceSummary) => void;
}) {
  if (status === 'loading') return <LoadingState label="Cargando espacios curriculares…" />;
  if (status === 'error') return <ErrorState message={error} />;
  if (spaces.length === 0)
    return <EmptyState message="Esta versión todavía no tiene espacios curriculares." />;

  return (
    <div className="pci-table-wrap">
      <table className="pci-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Nivel</th>
            <th>Cuatrimestres</th>
            <th>Formato</th>
            <th>Áreas</th>
            <th>Contenidos</th>
          </tr>
        </thead>
        <tbody>
          {spaces.map((space) => (
            <tr key={space.id} className="pci-table__row" onClick={() => onOpen(space)}>
              <td>{space.code}</td>
              <td>{space.name}</td>
              <td>{space.levelNumber}</td>
              <td>
                C{space.startTerm}-C{space.endTerm}
              </td>
              <td>{space.formatType}</td>
              <td>{space.areas.map((area) => area.name).join(', ')}</td>
              <td>{space.contentCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpaceForm({
  token,
  versionId,
  onCreated,
}: {
  token: string;
  versionId: string;
  onCreated: (space: CurricularSpaceSummary) => void;
}) {
  const [taxonomy, setTaxonomy] = useState<CurricularTaxonomyArea[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [spaceType, setSpaceType] = useState<(typeof SPACE_TYPES)[number]>('AUTONOMO');
  const [formatType, setFormatType] = useState<(typeof FORMAT_TYPES)[number]>('LABORATORIO');
  const [characterType, setCharacterType] =
    useState<(typeof CHARACTER_TYPES)[number]>('OBLIGATORIO');
  const [levelNumber, setLevelNumber] = useState(1);
  const [areaCodes, setAreaCodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurricularTaxonomy(token, 'FORMACION_GENERAL')
      .then(setTaxonomy)
      .catch(() => setTaxonomy([]));
  }, [token]);

  const toggleArea = (areaCode: string) => {
    setAreaCodes((current) =>
      current.includes(areaCode)
        ? current.filter((code_) => code_ !== areaCode)
        : [...current, areaCode],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const [startTerm, endTerm] = getTermsForLevel(levelNumber as 1 | 2 | 3 | 4 | 5);
      const space = await createCurricularSpace(token, versionId, {
        code,
        name,
        componentCode: 'FORMACION_GENERAL',
        spaceType,
        formatType,
        characterType,
        levelNumber: levelNumber as 1 | 2 | 3 | 4 | 5,
        startTerm,
        endTerm,
        areaCodes,
      });
      onCreated(space);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el espacio curricular.');
    } finally {
      setSubmitting(false);
    }
  };

  const [previewStart, previewEnd] = getTermsForLevel(levelNumber as 1 | 2 | 3 | 4 | 5);

  return (
    <form onSubmit={handleSubmit}>
      <div className="pci-filters">
        <div className="pci-field">
          <label htmlFor="spaceCode">Código</label>
          <input
            id="spaceCode"
            type="text"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Ej: LAB-BIO-1"
          />
        </div>
        <div className="pci-field">
          <label htmlFor="spaceName">Nombre</label>
          <input
            id="spaceName"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Laboratorio de Biología 1"
          />
        </div>
        <div className="pci-field">
          <label htmlFor="spaceLevel">Nivel</label>
          <select
            id="spaceLevel"
            value={levelNumber}
            onChange={(event) => setLevelNumber(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                Nivel {level}
              </option>
            ))}
          </select>
        </div>
        <div className="pci-field">
          <label>Cuatrimestres (PCI-STR-002)</label>
          <p className="pci-table__muted">
            C{previewStart}-C{previewEnd}, calculado automáticamente a partir del nivel.
          </p>
        </div>
        <div className="pci-field">
          <label htmlFor="spaceType">Tipo de espacio</label>
          <select
            id="spaceType"
            value={spaceType}
            onChange={(event) => setSpaceType(event.target.value as (typeof SPACE_TYPES)[number])}
          >
            {SPACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="pci-field">
          <label htmlFor="formatType">Formato</label>
          <select
            id="formatType"
            value={formatType}
            onChange={(event) => setFormatType(event.target.value as (typeof FORMAT_TYPES)[number])}
          >
            {FORMAT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="pci-field">
          <label htmlFor="characterType">Carácter</label>
          <select
            id="characterType"
            value={characterType}
            onChange={(event) =>
              setCharacterType(event.target.value as (typeof CHARACTER_TYPES)[number])
            }
          >
            {CHARACTER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pci-field">
        <label>Áreas aportantes</label>
        <div className="pci-checkbox-group">
          {taxonomy.map((area) => (
            <label key={area.code} className="pci-checkbox">
              <input
                type="checkbox"
                checked={areaCodes.includes(area.code)}
                onChange={() => toggleArea(area.code)}
              />
              {area.name}
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="pci-button" disabled={submitting || areaCodes.length === 0}>
        {submitting ? 'Creando…' : 'Crear espacio curricular'}
      </button>
    </form>
  );
}

function SpaceDetail({
  token,
  space,
  isPublished,
}: {
  token: string;
  space: CurricularSpaceSummary;
  isPublished: boolean;
}) {
  const [assignments, setAssignments] = useState<
    Awaited<ReturnType<typeof fetchContentAssignments>>
  >([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<CurricularContentSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyContentId, setBusyContentId] = useState<string | null>(null);

  const loadAssignments = useCallback(() => {
    setStatus('loading');
    fetchContentAssignments(token, space.id)
      .then((result) => {
        setAssignments(result);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los contenidos.');
        setStatus('error');
      });
  }, [token, space.id]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    try {
      const result = await fetchCurricularContents(token, {
        search: searchInput.trim(),
        limit: 10,
      });
      setSearchResults(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo buscar contenido.');
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async (contentId: string) => {
    setBusyContentId(contentId);
    try {
      const updated = await assignContentToSpace(token, space.id, {
        curricularContentId: contentId,
      });
      setAssignments(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo asignar el contenido.');
    } finally {
      setBusyContentId(null);
    }
  };

  const handleUnassign = async (contentId: string) => {
    setBusyContentId(contentId);
    try {
      const updated = await unassignContentFromSpace(token, space.id, contentId);
      setAssignments(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo quitar el contenido.');
    } finally {
      setBusyContentId(null);
    }
  };

  const assignedIds = new Set(assignments.map((assignment) => assignment.curricularContentId));

  return (
    <div>
      <p>
        <strong>{space.code}</strong> — {space.name} · Nivel {space.levelNumber} · C
        {space.startTerm}- C{space.endTerm} · {space.areas.map((area) => area.name).join(', ')}
      </p>

      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}

      <h4>Contenidos asignados</h4>
      {status === 'loading' ? <LoadingState label="Cargando…" /> : null}
      {status === 'error' ? <ErrorState message={error} /> : null}
      {status === 'ready' && assignments.length === 0 ? (
        <EmptyState message="Todavía no se asignó contenido a este espacio." />
      ) : null}
      {status === 'ready' && assignments.length > 0 ? (
        <div className="pci-table-wrap">
          <table className="pci-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Área</th>
                <th>Materia</th>
                <th>Contenido</th>
                {!isPublished ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{assignment.code}</td>
                  <td>{assignment.areaName}</td>
                  <td>{assignment.subjectName}</td>
                  <td>{assignment.contentText}</td>
                  {!isPublished ? (
                    <td>
                      <button
                        type="button"
                        className="pci-button pci-button--secondary"
                        disabled={busyContentId === assignment.curricularContentId}
                        onClick={() => handleUnassign(assignment.curricularContentId)}
                      >
                        Quitar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isPublished ? (
        <>
          <h4>Asignar contenido de la bolsa</h4>
          <form className="pci-filters__search-row" onSubmit={handleSearch}>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar contenido para asignar…"
            />
            <button type="submit" className="pci-button pci-button--secondary" disabled={searching}>
              {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {searchResults.length > 0 ? (
            <div className="pci-table-wrap">
              <table className="pci-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Área</th>
                    <th>Contenido</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.areaName}</td>
                      <td>{item.contentText}</td>
                      <td>
                        <button
                          type="button"
                          className="pci-button pci-button--secondary"
                          disabled={assignedIds.has(item.id) || busyContentId === item.id}
                          onClick={() => handleAssign(item.id)}
                        >
                          {assignedIds.has(item.id) ? 'Ya asignado' : 'Asignar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      <WeeklyHoursSection token={token} space={space} isPublished={isPublished} />
    </div>
  );
}

function WeeklyHoursSection({
  token,
  space,
  isPublished,
}: {
  token: string;
  space: CurricularSpaceSummary;
  isPublished: boolean;
}) {
  const [entries, setEntries] = useState<WeeklyHoursEntry[]>([]);
  const [suggestions, setSuggestions] = useState<WeeklyHoursSuggestion[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const terms = Array.from(
    { length: space.endTerm - space.startTerm + 1 },
    (_, index) => space.startTerm + index,
  );
  const [termNumber, setTermNumber] = useState(terms[0] ?? space.startTerm);
  const [areaCode, setAreaCode] = useState(space.areas[0]?.code ?? '');
  const [hours, setHours] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    Promise.all([fetchWeeklyHours(token, space.id), fetchWeeklyHoursSuggestions(token, space.id)])
      .then(([entriesResult, suggestionsResult]) => {
        setEntries(entriesResult);
        setSuggestions(suggestionsResult);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la carga horaria.');
        setStatus('error');
      });
  }, [token, space.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const updated = await setWeeklyHours(token, space.id, {
        areaCode,
        termNumber,
        hours: Number(hours),
      });
      setEntries(updated);
      setHours('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la carga horaria.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (entry: WeeklyHoursEntry) => {
    const key = `${entry.areaCode}-${entry.termNumber}`;
    setBusyKey(key);
    setError('');
    try {
      const updated = await removeWeeklyHours(token, space.id, entry.areaCode, entry.termNumber);
      setEntries(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la carga horaria.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <h4>Carga horaria semanal</h4>

      {error ? (
        <p className="pci-state pci-state--error" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'loading' ? <LoadingState label="Cargando carga horaria…" /> : null}
      {status === 'error' ? <ErrorState message={error} /> : null}

      {status === 'ready' && suggestions.length > 0 ? (
        <p className="pci-table__muted">
          Horas oficiales sugeridas (plan de Formación General, Nivel {space.levelNumber}):{' '}
          {suggestions.map((s) => `${s.unidadCurricular}: ${s.hours} hs/semana`).join(' · ')}
        </p>
      ) : null}

      {status === 'ready' && entries.length === 0 ? (
        <EmptyState message="Todavía no se cargó carga horaria para este espacio." />
      ) : null}

      {status === 'ready' && entries.length > 0 ? (
        <div className="pci-table-wrap">
          <table className="pci-table">
            <thead>
              <tr>
                <th>Cuatrimestre</th>
                <th>Área</th>
                <th>Horas/semana</th>
                {!isPublished ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>C{entry.termNumber}</td>
                  <td>{entry.areaName}</td>
                  <td>{entry.hours}</td>
                  {!isPublished ? (
                    <td>
                      <button
                        type="button"
                        className="pci-button pci-button--secondary"
                        disabled={busyKey === `${entry.areaCode}-${entry.termNumber}`}
                        onClick={() => handleRemove(entry)}
                      >
                        Quitar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isPublished ? (
        <form className="pci-filters" onSubmit={handleSubmit}>
          <div className="pci-field">
            <label htmlFor="whTerm">Cuatrimestre</label>
            <select
              id="whTerm"
              value={termNumber}
              onChange={(event) => setTermNumber(Number(event.target.value))}
            >
              {terms.map((term) => (
                <option key={term} value={term}>
                  C{term}
                </option>
              ))}
            </select>
          </div>
          <div className="pci-field">
            <label htmlFor="whArea">Área</label>
            <select
              id="whArea"
              value={areaCode}
              onChange={(event) => setAreaCode(event.target.value)}
            >
              {space.areas.map((area) => (
                <option key={area.code} value={area.code}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div className="pci-field">
            <label htmlFor="whHours">Horas/semana</label>
            <input
              id="whHours"
              type="number"
              min={0}
              step="0.5"
              required
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
          </div>
          <button type="submit" className="pci-button" disabled={submitting || !areaCode}>
            {submitting ? 'Guardando…' : 'Cargar horas'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
