import { listSeedFiles, readSeedSql } from './seed-files.js';
import { DEFAULT_SEEDS_DIR } from './paths.js';
import type { Queryable } from './queryable.js';

export interface SeedRunResult {
  executed: string[];
}

/**
 * Ejecuta cada archivo *.sql de `dir` en orden alfabético. Cada seed debe
 * ser idempotente por construcción (INSERT ... ON CONFLICT DO NOTHING/UPDATE),
 * por lo que este runner no necesita una tabla de seguimiento propia: correr
 * `seed` varias veces no debe duplicar filas.
 *
 * `db` debe ser una única conexión (Client o PoolClient), igual que en
 * migration-runner, para que cada seed corra dentro de su propia transacción.
 */
export async function runSeeds(
  db: Queryable,
  dir: string = DEFAULT_SEEDS_DIR,
): Promise<SeedRunResult> {
  const files = listSeedFiles(dir);
  const result: SeedRunResult = { executed: [] };

  for (const file of files) {
    const sql = readSeedSql(file.path);
    await db.query('BEGIN');
    try {
      await db.query(sql);
      await db.query('COMMIT');
      result.executed.push(file.name);
    } catch (error) {
      await db.query('ROLLBACK');
      throw new Error(`Falló el seed "${file.name}": ${(error as Error).message}`, {
        cause: error,
      });
    }
  }

  return result;
}
