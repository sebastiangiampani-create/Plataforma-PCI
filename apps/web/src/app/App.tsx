import { useCallback, useEffect, useState } from 'react';
import type { SchoolSummary, SessionResponse } from '@pci/domain';
import {
  ApiError,
  devLogin,
  fetchAccessibleSchools,
  fetchSession,
  selectActiveSchool,
} from '../lib/api-client';
import { clearStoredToken, readStoredToken, writeStoredToken } from '../lib/session-storage';
import { LoadingState } from '../components/LoadingState';
import { LoginPage } from '../pages/LoginPage';
import { SchoolSelectorPage, type SchoolsLoadStatus } from '../pages/SchoolSelectorPage';
import { ShellPage } from '../pages/ShellPage';

type Phase = 'bootstrapping' | 'login' | 'select-school' | 'shell';

export function App() {
  const [phase, setPhase] = useState<Phase>('bootstrapping');
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [activeSchool, setActiveSchool] = useState<SchoolSummary | null>(null);

  const [schoolsStatus, setSchoolsStatus] = useState<SchoolsLoadStatus>('loading');
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [schoolsError, setSchoolsError] = useState('');

  const loadSchools = useCallback((token: string, onLoaded?: (loaded: SchoolSummary[]) => void) => {
    setSchoolsStatus('loading');
    fetchAccessibleSchools(token)
      .then((result) => {
        setSchools(result);
        setSchoolsStatus('ready');
        onLoaded?.(result);
      })
      .catch((err) => {
        setSchoolsError(
          err instanceof ApiError ? err.message : 'No se pudieron cargar las escuelas.',
        );
        setSchoolsStatus('error');
      });
  }, []);

  const establishSession = useCallback(
    (result: SessionResponse) => {
      setSession(result);
      loadSchools(result.token, (loadedSchools) => {
        if (result.activeSchoolId) {
          setActiveSchool(
            loadedSchools.find((school) => school.id === result.activeSchoolId) ?? null,
          );
          setPhase('shell');
        } else {
          setPhase('select-school');
        }
      });
    },
    [loadSchools],
  );

  useEffect(() => {
    const token = readStoredToken();
    if (!token) {
      setPhase('login');
      return;
    }
    fetchSession(token)
      .then(establishSession)
      .catch(() => {
        clearStoredToken();
        setPhase('login');
      });
  }, [establishSession]);

  const handleLogin = async (email: string, displayName: string) => {
    const result = await devLogin({ email, displayName: displayName || undefined });
    writeStoredToken(result.token);
    establishSession(result);
  };

  const handleSelectSchool = async (schoolId: string) => {
    if (!session) return;
    const result = await selectActiveSchool(session.token, schoolId);
    setSession(result);
    setActiveSchool(schools.find((school) => school.id === schoolId) ?? null);
    setPhase('shell');
  };

  const handleLogout = () => {
    clearStoredToken();
    setSession(null);
    setActiveSchool(null);
    setSchools([]);
    setPhase('login');
  };

  return (
    <div className="pci-shell">
      <header className="pci-header">
        <span className="pci-header__brand">Plataforma PCI</span>
        {session ? (
          <div className="pci-header__meta">
            <span>{session.user.displayName || session.user.email}</span>
            <button
              type="button"
              className="pci-button pci-button--secondary"
              onClick={handleLogout}
            >
              Salir
            </button>
          </div>
        ) : null}
      </header>
      <main className="pci-main">
        {phase === 'bootstrapping' ? <LoadingState label="Verificando sesión…" /> : null}
        {phase === 'login' ? <LoginPage onSubmit={handleLogin} /> : null}
        {phase === 'select-school' && session ? (
          <SchoolSelectorPage
            status={schoolsStatus}
            schools={schools}
            errorMessage={schoolsError}
            onRetry={() => loadSchools(session.token)}
            onSelect={handleSelectSchool}
          />
        ) : null}
        {phase === 'shell' && activeSchool && session ? (
          <ShellPage token={session.token} activeSchool={activeSchool} />
        ) : null}
      </main>
    </div>
  );
}
