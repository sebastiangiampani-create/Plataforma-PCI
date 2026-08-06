const STORAGE_KEY = 'pci.session.token';

export function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Almacenamiento no disponible (p. ej. modo privado); la sesión sigue
    // funcionando en memoria durante la pestaña actual.
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ver comentario en writeStoredToken
  }
}
