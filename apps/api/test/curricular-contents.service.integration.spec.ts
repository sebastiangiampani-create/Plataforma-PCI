import { randomUUID } from 'node:crypto';
import { Client, Pool } from 'pg';
import {
  DEFAULT_MIGRATIONS_DIR,
  DEFAULT_SEEDS_DIR,
  runMigrationsUp,
  runSeeds,
} from '@pci/database';
import { CurricularContentsService } from '../src/modules/curricular-contents/curricular-contents.service.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

let schema: string;
let setupClient: Client;
let pool: Pool;
let service: CurricularContentsService;

beforeEach(async () => {
  schema = `pci_test_${randomUUID().replace(/-/g, '')}`;
  setupClient = new Client({ connectionString: TEST_DATABASE_URL });
  await setupClient.connect();
  await setupClient.query(`CREATE SCHEMA "${schema}";`);
  await setupClient.query(`SET search_path TO "${schema}", public;`);

  await runMigrationsUp(setupClient, DEFAULT_MIGRATIONS_DIR);
  await runSeeds(setupClient, DEFAULT_SEEDS_DIR);

  pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  service = new CurricularContentsService(pool);
});

afterEach(async () => {
  await pool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await setupClient.end();
});

describe('CurricularContentsService (integración real contra PostgreSQL)', () => {
  it('lista con el total real y respeta paginación (limit/offset)', async () => {
    const page1 = await service.list({
      componentCode: 'FORMACION_GENERAL',
      limit: 10,
      offset: 0,
    });
    expect(page1.total).toBe(1155);
    expect(page1.items).toHaveLength(10);

    const page2 = await service.list({
      componentCode: 'FORMACION_GENERAL',
      limit: 10,
      offset: 10,
    });
    expect(page2.items[0]?.id).not.toBe(page1.items[0]?.id);
  });

  it('filtra por área y coincide con la distribución real auditada', async () => {
    const result = await service.list({
      componentCode: 'FORMACION_GENERAL',
      areaCode: 'MATEMATICA',
      limit: 200,
      offset: 0,
    });
    expect(result.total).toBe(60);
    expect(result.items.every((item) => item.areaCode === 'MATEMATICA')).toBe(true);
  });

  it('filtra en cascada por materia y por eje', async () => {
    const bySubject = await service.list({
      componentCode: 'FORMACION_GENERAL',
      areaCode: 'CIENCIAS_NATURALES',
      subjectCode: 'CIENCIAS_NATURALES_BIOLOGIA',
      limit: 200,
      offset: 0,
    });
    expect(bySubject.total).toBeGreaterThan(0);
    expect(
      bySubject.items.every((item) => item.subjectCode === 'CIENCIAS_NATURALES_BIOLOGIA'),
    ).toBe(true);

    const byAxis = await service.list({
      componentCode: 'FORMACION_GENERAL',
      axisCode: 'MATEMATICA_MATEMATICA_EJE_001',
      limit: 200,
      offset: 0,
    });
    expect(byAxis.total).toBeGreaterThan(0);
    expect(byAxis.items.every((item) => item.axisCode === 'MATEMATICA_MATEMATICA_EJE_001')).toBe(
      true,
    );
  });

  it('busca por texto (ILIKE) dentro del contenido', async () => {
    const result = await service.list({
      componentCode: 'FORMACION_GENERAL',
      search: 'Internet',
      limit: 50,
      offset: 0,
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((item) => item.contentText.toLowerCase().includes('internet'))).toBe(
      true,
    );
  });

  it('no devuelve nada para un componente sin contenidos cargados', async () => {
    const result = await service.list({
      componentCode: 'FORMACION_ORIENTADA',
      limit: 50,
      offset: 0,
    });
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('taxonomy devuelve área → materia → eje solo con datos reales', async () => {
    const taxonomy = await service.taxonomy('FORMACION_GENERAL');
    expect(taxonomy).toHaveLength(8);

    const matematica = taxonomy.find((area) => area.code === 'MATEMATICA');
    expect(matematica?.subjects).toHaveLength(1);
    expect(matematica?.subjects[0]?.axes.length).toBeGreaterThan(0);

    const empty = await service.taxonomy('FORMACION_ORIENTADA');
    expect(empty).toHaveLength(0);
  });
});
