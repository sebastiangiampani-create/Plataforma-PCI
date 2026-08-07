import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { getMigrationStatus, runMigrationsDown, runMigrationsUp } from '../src/migration-runner.js';
import { createIsolatedSchemaClient } from './helpers/test-db.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures/migrations');

let client: Client;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const isolated = await createIsolatedSchemaClient();
  client = isolated.client;
  cleanup = isolated.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe('runMigrationsUp', () => {
  it('aplica todas las migraciones pendientes en orden sobre una base limpia', async () => {
    const result = await runMigrationsUp(client, fixturesDir);
    expect(result.applied).toEqual(['0001_create_widgets', '0002_add_widget_color']);
    expect(result.skipped).toEqual([]);

    const columns = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'widgets'
       ORDER BY column_name;`,
    );
    expect(columns.rows.map((r) => r.column_name)).toEqual(['color', 'id', 'name']);
  });

  it('la segunda ejecución es un no-op (idempotente)', async () => {
    await runMigrationsUp(client, fixturesDir);
    const second = await runMigrationsUp(client, fixturesDir);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(['0001_create_widgets', '0002_add_widget_color']);
  });

  it('reporta el estado de cada migración', async () => {
    await runMigrationsUp(client, fixturesDir);
    const status = await getMigrationStatus(client, fixturesDir);
    expect(status.every((s) => s.applied && !s.drifted)).toBe(true);
    expect(status.map((s) => s.name)).toEqual(['0001_create_widgets', '0002_add_widget_color']);
  });
});

describe('runMigrationsDown', () => {
  it('revierte la última migración aplicada', async () => {
    await runMigrationsUp(client, fixturesDir);
    const result = await runMigrationsDown(client, fixturesDir, 1);
    expect(result.rolledBack).toEqual(['0002_add_widget_color']);

    const columns = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'widgets'
       ORDER BY column_name;`,
    );
    expect(columns.rows.map((r) => r.column_name)).toEqual(['id', 'name']);
  });

  it('revierte varios pasos en orden inverso y deja la base sin rastro de las tablas', async () => {
    await runMigrationsUp(client, fixturesDir);
    const result = await runMigrationsDown(client, fixturesDir, 2);
    expect(result.rolledBack).toEqual(['0002_add_widget_color', '0001_create_widgets']);

    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'widgets';`,
    );
    expect(tables.rows).toEqual([]);
  });
});
