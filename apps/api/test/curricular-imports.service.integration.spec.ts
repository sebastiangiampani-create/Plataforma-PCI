import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Client, Pool } from 'pg';
import {
  DEFAULT_MIGRATIONS_DIR,
  DEFAULT_SEEDS_DIR,
  runMigrationsUp,
  runSeeds,
} from '@pci/database';
import { CurricularImportsService } from '../src/modules/curricular-imports/curricular-imports.service.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

const CSV_HEADER =
  'component_code,orientation_code,area_code,subject_code,axis_code,code,content_text';

let schema: string;
let setupClient: Client;
let pool: Pool;
let service: CurricularImportsService;
let userId: string;

beforeEach(async () => {
  schema = `pci_test_${randomUUID().replace(/-/g, '')}`;
  setupClient = new Client({ connectionString: TEST_DATABASE_URL });
  await setupClient.connect();
  await setupClient.query(`CREATE SCHEMA "${schema}";`);
  await setupClient.query(`SET search_path TO "${schema}", public;`);

  await runMigrationsUp(setupClient, DEFAULT_MIGRATIONS_DIR);
  await runSeeds(setupClient, DEFAULT_SEEDS_DIR);

  const userResult = await setupClient.query<{ id: string }>(
    `INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id;`,
    ['docente.prueba@example.com', 'Docente de prueba'],
  );
  userId = userResult.rows[0]?.id ?? '';

  pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  service = new CurricularImportsService(pool);
});

afterEach(async () => {
  await pool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await setupClient.end();
});

describe('CurricularImportsService (integración real contra PostgreSQL)', () => {
  it('rechaza un CSV sin las columnas obligatorias', async () => {
    await expect(
      service.createImport(
        { sourceName: 'prueba', sourceVersion: 'v1', csvContent: 'a,b\n1,2' },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('previsualiza: valida filas correctas, detecta jerarquía inválida y duplicados', async () => {
    const csv = [
      CSV_HEADER,
      // válida: código nuevo, jerarquía real
      'FORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-nuevo-1,Contenido nuevo de prueba',
      // inválida: área inexistente
      'FORMACION_GENERAL,,AREA_INEXISTENTE,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-invalido-1,Contenido con área inexistente',
      // inválida: la materia no pertenece al área declarada
      'FORMACION_GENERAL,,CIENCIAS_SOCIALES,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-invalido-2,Materia que no pertenece al área',
      // duplicado contra la base: "c1" ya existe con este mismo source_version (seed 0006)
      'FORMACION_GENERAL,,ARTES,ARTES_ARTES_VISUALES,ARTES_ARTES_VISUALES_EJE_001,c1,Contenido que ya existe',
      // duplicado dentro del mismo archivo (repite test-nuevo-1)
      'FORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_002,test-nuevo-1,Repetido en el mismo archivo',
    ].join('\n');

    const result = await service.createImport(
      { sourceName: 'prueba', sourceVersion: 'matriz-pci-2026-08-audit', csvContent: csv },
      userId,
    );

    expect(result.status).toBe('PREVIEW');
    expect(result.rows).toHaveLength(5);
    expect(result.rows.map((r) => r.status)).toEqual([
      'VALID',
      'INVALID',
      'INVALID',
      'DUPLICATE',
      'DUPLICATE',
    ]);
    expect(result.rows[1]?.validationErrors?.[0]).toContain('AREA_INEXISTENTE');
    expect(result.rows[2]?.validationErrors?.[0]).toContain('no pertenece al área');
  });

  it('confirma: crea curricular_contents reales solo para las filas VALID', async () => {
    const csv = [
      CSV_HEADER,
      'FORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-confirmar-1,Contenido a confirmar',
      'FORMACION_GENERAL,,AREA_INEXISTENTE,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-invalido,Contenido inválido',
    ].join('\n');

    const created = await service.createImport(
      { sourceName: 'prueba', sourceVersion: 'v-confirmar', csvContent: csv },
      userId,
    );
    const confirmed = await service.confirmImport(created.id);

    expect(confirmed.status).toBe('APPLIED');
    const validRow = confirmed.rows.find((r) => r.rawData.code === 'test-confirmar-1');
    const invalidRow = confirmed.rows.find((r) => r.rawData.code === 'test-invalido');
    expect(validRow?.status).toBe('IMPORTED');
    expect(validRow?.curricularContentId).toBeTruthy();
    expect(invalidRow?.status).toBe('INVALID');
    expect(invalidRow?.curricularContentId).toBeNull();

    const contentResult = await setupClient.query(
      `SELECT content_text, source_version, status FROM curricular_contents WHERE code = 'test-confirmar-1';`,
    );
    expect(contentResult.rows[0]).toMatchObject({
      content_text: 'Contenido a confirmar',
      source_version: 'v-confirmar',
      status: 'ACTIVE',
    });

    await expect(service.confirmImport(created.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('revierte: archiva el contenido creado (no lo borra) y no permite revertir dos veces', async () => {
    const csv = [
      CSV_HEADER,
      'FORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-revertir-1,Contenido a revertir',
    ].join('\n');

    const created = await service.createImport(
      { sourceName: 'prueba', sourceVersion: 'v-revertir', csvContent: csv },
      userId,
    );
    await service.confirmImport(created.id);
    const reverted = await service.revertImport(created.id);

    expect(reverted.status).toBe('REVERTED');
    expect(reverted.revertedAt).toBeTruthy();

    const contentResult = await setupClient.query(
      `SELECT status, archived_at FROM curricular_contents WHERE code = 'test-revertir-1';`,
    );
    expect(contentResult.rows[0]?.status).toBe('ARCHIVED');
    expect(contentResult.rows[0]?.archived_at).toBeTruthy();

    await expect(service.revertImport(created.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('listImports resume conteos por estado de fila', async () => {
    const csv = [
      CSV_HEADER,
      'FORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-listado-1,Contenido de listado',
      'FORMACION_GENERAL,,AREA_INEXISTENTE,MATEMATICA_MATEMATICA,MATEMATICA_MATEMATICA_EJE_001,test-listado-2,Inválido',
    ].join('\n');

    const created = await service.createImport(
      { sourceName: 'prueba listado', sourceVersion: 'v-listado', csvContent: csv },
      userId,
    );

    const list = await service.listImports();
    const found = list.find((i) => i.id === created.id);

    expect(found).toMatchObject({ rowCount: 2, validCount: 1, invalidCount: 1, duplicateCount: 0 });
  });
});
