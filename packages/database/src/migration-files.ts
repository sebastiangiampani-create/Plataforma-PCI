import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface MigrationFile {
  /** Nombre lógico de la migración, p. ej. "0002_identity_and_access". */
  name: string;
  upPath: string;
  downPath: string;
}

const UP_SUFFIX = '.up.sql';
const DOWN_SUFFIX = '.down.sql';

/**
 * Lee `dir` y empareja cada `NNNN_nombre.up.sql` con su `NNNN_nombre.down.sql`.
 * El orden es alfabético por nombre de archivo, por lo que el prefijo numérico
 * (0001, 0002, ...) determina el orden de aplicación.
 */
export function listMigrationFiles(dir: string): MigrationFile[] {
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(UP_SUFFIX))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  return entries.map((upFileName) => {
    const name = upFileName.slice(0, -UP_SUFFIX.length);
    const downFileName = `${name}${DOWN_SUFFIX}`;
    const upPath = join(dir, upFileName);
    const downPath = join(dir, downFileName);
    try {
      readFileSync(downPath, 'utf8');
    } catch {
      throw new Error(
        `La migración "${name}" no tiene su script de rollback esperado: ${downFileName}`,
      );
    }
    return { name, upPath, downPath };
  });
}

export function readMigrationSql(path: string): string {
  return readFileSync(path, 'utf8');
}
