import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { FORMACION_GENERAL_PLAN } from '@pci/domain';
import { runMigrationsUp } from '../src/migration-runner.js';
import { runSeeds } from '../src/seed-runner.js';
import { DEFAULT_MIGRATIONS_DIR, DEFAULT_SEEDS_DIR } from '../src/paths.js';
import { createIsolatedSchemaClient } from './helpers/test-db.js';

let client: Client;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const isolated = await createIsolatedSchemaClient();
  client = isolated.client;
  cleanup = isolated.cleanup;
  await runMigrationsUp(client, DEFAULT_MIGRATIONS_DIR);
  await runSeeds(client, DEFAULT_SEEDS_DIR);
});

afterEach(async () => {
  await cleanup();
});

describe('seed real de Formación General (taxonomía y bolsa de contenidos)', () => {
  it('carga exactamente los 1155 contenidos reales auditados en Matriz-PCI', async () => {
    const result = await client.query('SELECT count(*)::int AS count FROM curricular_contents;');
    expect(result.rows[0]?.count).toBe(1155);
  });

  it('la distribución por área coincide con la auditoría (docs/09-auditoria-matriz-pci.md)', async () => {
    const result = await client.query(`
      SELECT a.name, count(*)::int AS count
      FROM curricular_contents cc
      JOIN areas a ON a.id = cc.area_id
      GROUP BY a.name
    `);
    const byArea = Object.fromEntries(
      result.rows.map((r) => [r.name as string, r.count as number]),
    );

    expect(byArea).toEqual({
      'Educación Física': 275,
      'Ciencias Naturales': 244,
      Artes: 187,
      'Ciencias Sociales': 177,
      'Lenguas Adicionales': 88,
      'Lengua y Literatura': 70,
      Matemática: 60,
      Tecnologías: 54,
    });
  });

  it('cada área/materia del plan horario oficial (docs/08) enlazada existe realmente en la taxonomía sembrada', async () => {
    const areaCodes = [
      ...new Set(
        FORMACION_GENERAL_PLAN.map((e) => e.areaCode).filter((c): c is string => c !== null),
      ),
    ];
    const subjectCodes = [
      ...new Set(
        FORMACION_GENERAL_PLAN.map((e) => e.subjectCode).filter((c): c is string => c !== null),
      ),
    ];

    const areaRows = await client.query('SELECT code FROM areas WHERE code = ANY($1::text[])', [
      areaCodes,
    ]);
    expect(areaRows.rows).toHaveLength(areaCodes.length);

    const subjectRows = await client.query(
      'SELECT code FROM subjects WHERE code = ANY($1::text[])',
      [subjectCodes],
    );
    expect(subjectRows.rows).toHaveLength(subjectCodes.length);
  });

  it('correr los seeds de nuevo no duplica ni la taxonomía ni la bolsa de contenidos', async () => {
    await runSeeds(client, DEFAULT_SEEDS_DIR);

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM areas) AS areas,
        (SELECT count(*)::int FROM subjects) AS subjects,
        (SELECT count(*)::int FROM axes) AS axes,
        (SELECT count(*)::int FROM curricular_contents) AS contents
    `);

    expect(counts.rows[0]).toEqual({ areas: 8, subjects: 18, axes: 221, contents: 1155 });
  });
});
