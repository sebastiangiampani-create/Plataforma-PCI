import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { runMigrationsUp } from '../src/migration-runner.js';
import { runSeeds } from '../src/seed-runner.js';
import { createIsolatedSchemaClient } from './helpers/test-db.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, 'fixtures/migrations');
const seedsDir = join(here, 'fixtures/seeds');

let client: Client;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const isolated = await createIsolatedSchemaClient();
  client = isolated.client;
  cleanup = isolated.cleanup;
  await runMigrationsUp(client, migrationsDir);
});

afterEach(async () => {
  await cleanup();
});

describe('runSeeds', () => {
  it('inserta los datos semilla', async () => {
    const result = await runSeeds(client, seedsDir);
    expect(result.executed).toEqual(['0001_widgets.sql']);

    const rows = await client.query('SELECT name FROM widgets ORDER BY id;');
    expect(rows.rows.map((r) => r.name)).toEqual(['tornillo', 'tuerca']);
  });

  it('correr los seeds dos veces no duplica filas', async () => {
    await runSeeds(client, seedsDir);
    await runSeeds(client, seedsDir);

    const rows = await client.query('SELECT count(*)::int AS count FROM widgets;');
    expect(rows.rows[0]?.count).toBe(2);
  });
});
