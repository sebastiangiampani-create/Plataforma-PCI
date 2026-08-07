import { useState, type FormEvent } from 'react';
import { ApiError } from '../lib/api-client';

export function LoginPage({
  onSubmit,
}: {
  onSubmit: (email: string, displayName: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(email, displayName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pci-card">
      <h1>Plataforma PCI</h1>
      <p>Inicio de sesión de desarrollo</p>
      <form onSubmit={handleSubmit}>
        <div className="pci-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="persona@institucion.edu.ar"
          />
        </div>
        <div className="pci-field">
          <label htmlFor="displayName">Nombre (opcional)</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Nombre y apellido"
          />
        </div>
        {error ? (
          <p className="pci-state pci-state--error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="pci-button" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
