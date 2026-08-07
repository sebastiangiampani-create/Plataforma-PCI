import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Client, Pool } from 'pg';
import {
  DEFAULT_MIGRATIONS_DIR,
  DEFAULT_SEEDS_DIR,
  runMigrationsUp,
  runSeeds,
} from '@pci/database';
import type { CreateCurricularSpaceRequest } from '@pci/domain';
import { ValidationService } from '../src/modules/validation/validation.service.js';
import { CurricularSpacesService } from '../src/modules/curricular-spaces/curricular-spaces.service.js';
import { PciProjectsService } from '../src/modules/pci-projects/pci-projects.service.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

let schema: string;
let setupClient: Client;
let pool: Pool;
let service: ValidationService;
let spacesService: CurricularSpacesService;
let projectsService: PciProjectsService;
let schoolId: string;
let userId: string;
let versionId: string;

const mathSpace: CreateCurricularSpaceRequest = {
  code: 'MAT-N1',
  name: 'Matemática Nivel 1',
  componentCode: 'FORMACION_GENERAL',
  spaceType: 'AUTONOMO',
  formatType: 'NIVEL',
  characterType: 'OBLIGATORIO',
  levelNumber: 1,
  startTerm: 1,
  endTerm: 2,
  areaCodes: ['MATEMATICA'],
};

beforeEach(async () => {
  schema = `pci_test_${randomUUID().replace(/-/g, '')}`;
  setupClient = new Client({ connectionString: TEST_DATABASE_URL });
  await setupClient.connect();
  await setupClient.query(`CREATE SCHEMA "${schema}";`);
  await setupClient.query(`SET search_path TO "${schema}", public;`);

  await runMigrationsUp(setupClient, DEFAULT_MIGRATIONS_DIR);
  await runSeeds(setupClient, DEFAULT_SEEDS_DIR);

  const schools = await setupClient.query<{ id: string; code: string }>(
    `SELECT id, code FROM schools ORDER BY code;`,
  );
  schoolId = schools.rows.find((s) => s.code === 'PCI-101')!.id;

  const userResult = await setupClient.query<{ id: string }>(
    `INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id;`,
    ['docente.prueba@example.com', 'Docente de prueba'],
  );
  userId = userResult.rows[0]?.id ?? '';

  pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  service = new ValidationService(pool);
  spacesService = new CurricularSpacesService(pool);
  projectsService = new PciProjectsService(pool);

  const project = await projectsService.createProject(schoolId, 'PCI Escuela 1', userId);
  versionId = project.currentVersion!.id;
});

afterEach(async () => {
  await pool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await setupClient.end();
});

async function insertRawSpace(
  code: string,
  levelNumber: number,
  startTerm: number,
  endTerm: number,
): Promise<string> {
  const componentResult = await setupClient.query<{ id: string }>(
    `SELECT id FROM components WHERE code = 'FORMACION_GENERAL';`,
  );
  const componentId = componentResult.rows[0]!.id;
  const spaceResult = await setupClient.query<{ id: string }>(
    `INSERT INTO curricular_spaces
       (pci_version_id, component_id, code, name, space_type, format_type, character_type,
        level_number, start_term, end_term)
     VALUES ($1, $2, $3, $4, 'AUTONOMO', 'NIVEL', 'OBLIGATORIO', $5, $6, $7)
     RETURNING id;`,
    [versionId, componentId, code, code, levelNumber, startTerm, endTerm],
  );
  return spaceResult.rows[0]!.id;
}

describe('ValidationService (integración real contra PostgreSQL)', () => {
  it('sin haber corrido validate todavía, currentResults está vacío', async () => {
    const response = await service.currentResults(schoolId, versionId);
    expect(response).toEqual({ summary: [], results: [], truncated: false });
  });

  it('PCI-STR-001: detecta cuatrimestres no consecutivos en un espacio (auditoría defensiva)', async () => {
    const spaceId = await insertRawSpace('BAD-STR-001', 1, 1, 3);

    const response = await service.run(schoolId, versionId);

    const finding = response.results.find(
      (r) => r.ruleCode === 'PCI-STR-001' && r.entityId === spaceId,
    );
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('ERROR');
  });

  it('PCI-STR-002: detecta un rango consecutivo que no corresponde al nivel', async () => {
    const spaceId = await insertRawSpace('BAD-STR-002', 1, 3, 4);

    const response = await service.run(schoolId, versionId);

    const str001 = response.results.find(
      (r) => r.ruleCode === 'PCI-STR-001' && r.entityId === spaceId,
    );
    const str002 = response.results.find(
      (r) => r.ruleCode === 'PCI-STR-002' && r.entityId === spaceId,
    );
    expect(str001).toBeUndefined();
    expect(str002).toBeDefined();
    expect(str002?.message).toContain('C1-C2');
  });

  it('PCI-COV-001: un contenido sin asignar aparece en los resultados; al asignarlo, deja de aparecer', async () => {
    const contentResult = await setupClient.query<{ id: string }>(
      `SELECT cc.id FROM curricular_contents cc
       JOIN areas a ON a.id = cc.area_id
       WHERE a.code = 'MATEMATICA' AND cc.status = 'ACTIVE' LIMIT 1;`,
    );
    const contentId = contentResult.rows[0]!.id;

    const totalActive = await setupClient.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM curricular_contents WHERE status = 'ACTIVE';`,
    );
    const totalCount = Number(totalActive.rows[0]!.count);

    await service.run(schoolId, versionId);
    const beforeAssign = await setupClient.query(
      `SELECT 1 FROM validation_results
       WHERE pci_version_id = $1 AND entity_type = 'curricular_content' AND entity_id = $2
         AND resolved_at IS NULL;`,
      [versionId, contentId],
    );
    expect(beforeAssign.rowCount).toBe(1);
    const summaryBefore = (await service.currentResults(schoolId, versionId)).summary.find(
      (s) => s.ruleCode === 'PCI-COV-001',
    );
    expect(summaryBefore?.count).toBe(totalCount);

    const space = await spacesService.createSpace(schoolId, versionId, mathSpace);
    await spacesService.assignContent(schoolId, space.id, { curricularContentId: contentId });

    const afterAssign = await service.run(schoolId, versionId);
    const stillUncovered = await setupClient.query(
      `SELECT 1 FROM validation_results
       WHERE pci_version_id = $1 AND entity_type = 'curricular_content' AND entity_id = $2
         AND resolved_at IS NULL;`,
      [versionId, contentId],
    );
    expect(stillUncovered.rowCount).toBe(0);
    const summaryAfter = afterAssign.summary.find((s) => s.ruleCode === 'PCI-COV-001');
    expect(summaryAfter?.count).toBe(totalCount - 1);
  });

  it('re-ejecutar validate resuelve los hallazgos anteriores y guarda un lote nuevo', async () => {
    const spaceId = await insertRawSpace('BAD-STR-001-B', 1, 1, 3);

    const first = await service.run(schoolId, versionId);
    const firstFinding = first.results.find((r) => r.entityId === spaceId)!;

    const second = await service.run(schoolId, versionId);
    const secondFinding = second.results.find((r) => r.entityId === spaceId)!;

    expect(secondFinding.id).not.toBe(firstFinding.id);
    expect(secondFinding.message).toBe(firstFinding.message);

    const resolvedRow = await setupClient.query<{ resolved_at: string | null }>(
      `SELECT resolved_at FROM validation_results WHERE id = $1;`,
      [firstFinding.id],
    );
    expect(resolvedRow.rows[0]?.resolved_at).not.toBeNull();
  });

  it('404 para una versión inexistente; ForbiddenException para otra escuela', async () => {
    await expect(service.currentResults(schoolId, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const schools = await setupClient.query<{ id: string; code: string }>(
      `SELECT id, code FROM schools ORDER BY code;`,
    );
    const otherSchoolId = schools.rows.find((s) => s.code === 'PCI-202')!.id;
    await expect(service.currentResults(otherSchoolId, versionId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
