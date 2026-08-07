import { sha256 } from './checksum.js';
import { listMigrationFiles, readMigrationSql } from './migration-files.js';
import { DEFAULT_MIGRATIONS_DIR } from './paths.js';
import type { Queryable } from './queryable.js';

const MIGRATIONS_TABLE = 'schema_migrations';

export interface MigrationStatus {
  name: string;
  applied: boolean;
  checksum: string;
  appliedAt: string | null;
  /** true si el contenido actual del archivo .up.sql difiere de lo registrado al aplicarla. */
  drifted: boolean;
}

export interface MigrationRunResult {
  applied: string[];
  skipped: string[];
}

export interface MigrationRollbackResult {
  rolledBack: string[];
}

/**
 * IMPORTANTE: `db` debe ser una única conexión (pg.Client o pg.PoolClient
 * obtenido con `pool.connect()`), nunca un `pg.Pool` directamente. Los
 * comandos BEGIN/COMMIT/ROLLBACK deben ejecutarse sobre la misma conexión
 * física, algo que un Pool no garantiza entre llamadas.
 */
export async function ensureMigrationsTable(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

interface AppliedRow {
  name: string;
  checksum: string;
  applied_at: string;
}

async function getAppliedMigrations(db: Queryable): Promise<Map<string, AppliedRow>> {
  const result = await db.query<AppliedRow>(
    `SELECT name, checksum, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY name ASC;`,
  );
  return new Map(result.rows.map((row) => [row.name, row]));
}

export async function getMigrationStatus(
  db: Queryable,
  dir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationStatus[]> {
  await ensureMigrationsTable(db);
  const files = listMigrationFiles(dir);
  const applied = await getAppliedMigrations(db);

  return files.map((file) => {
    const checksum = sha256(readMigrationSql(file.upPath));
    const record = applied.get(file.name);
    return {
      name: file.name,
      applied: Boolean(record),
      checksum,
      appliedAt: record?.applied_at ?? null,
      drifted: Boolean(record) && record?.checksum !== checksum,
    };
  });
}

/**
 * Aplica todas las migraciones pendientes, en orden. Si una migración ya fue
 * aplicada y su checksum no cambió, se omite (idempotente: correr `up` dos
 * veces seguidas es un no-op). Si el checksum cambió respecto de lo
 * registrado, se aborta con un error explícito en lugar de reaplicarla
 * silenciosamente.
 */
export async function runMigrationsUp(
  db: Queryable,
  dir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationRunResult> {
  await ensureMigrationsTable(db);
  const files = listMigrationFiles(dir);
  const applied = await getAppliedMigrations(db);

  const result: MigrationRunResult = { applied: [], skipped: [] };

  for (const file of files) {
    const sql = readMigrationSql(file.upPath);
    const checksum = sha256(sql);
    const existing = applied.get(file.name);

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(
          `La migración "${file.name}" ya fue aplicada con un checksum distinto. ` +
            'No se puede reaplicar automáticamente: cree una nueva migración en lugar de editar una existente.',
        );
      }
      result.skipped.push(file.name);
      continue;
    }

    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query(`INSERT INTO ${MIGRATIONS_TABLE} (name, checksum) VALUES ($1, $2);`, [
        file.name,
        checksum,
      ]);
      await db.query('COMMIT');
      result.applied.push(file.name);
    } catch (error) {
      await db.query('ROLLBACK');
      throw new Error(`Falló la migración "${file.name}": ${(error as Error).message}`, {
        cause: error,
      });
    }
  }

  return result;
}

/**
 * Revierte las últimas `steps` migraciones aplicadas (por defecto 1), en
 * orden inverso de aplicación, ejecutando su script `.down.sql`.
 */
export async function runMigrationsDown(
  db: Queryable,
  dir: string = DEFAULT_MIGRATIONS_DIR,
  steps = 1,
): Promise<MigrationRollbackResult> {
  await ensureMigrationsTable(db);
  const files = listMigrationFiles(dir);
  const fileByName = new Map(files.map((f) => [f.name, f]));
  const applied = await getAppliedMigrations(db);

  const appliedNamesDesc = [...applied.values()]
    .sort((a, b) => b.name.localeCompare(a.name, 'en'))
    .slice(0, steps)
    .map((row) => row.name);

  const result: MigrationRollbackResult = { rolledBack: [] };

  for (const name of appliedNamesDesc) {
    const file = fileByName.get(name);
    if (!file) {
      throw new Error(
        `No se encontró el archivo de rollback para la migración aplicada "${name}".`,
      );
    }
    const sql = readMigrationSql(file.downPath);

    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1;`, [name]);
      await db.query('COMMIT');
      result.rolledBack.push(name);
    } catch (error) {
      await db.query('ROLLBACK');
      throw new Error(`Falló el rollback de "${name}": ${(error as Error).message}`, {
        cause: error,
      });
    }
  }

  return result;
}
