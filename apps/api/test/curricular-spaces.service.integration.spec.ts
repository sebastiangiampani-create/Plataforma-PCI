import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Client, Pool } from 'pg';
import {
  DEFAULT_MIGRATIONS_DIR,
  DEFAULT_SEEDS_DIR,
  runMigrationsUp,
  runSeeds,
} from '@pci/database';
import type { CreateCurricularSpaceRequest } from '@pci/domain';
import { CurricularSpacesService } from '../src/modules/curricular-spaces/curricular-spaces.service.js';
import { PciProjectsService } from '../src/modules/pci-projects/pci-projects.service.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

let schema: string;
let setupClient: Client;
let pool: Pool;
let service: CurricularSpacesService;
let projectsService: PciProjectsService;
let schoolId: string;
let otherSchoolId: string;
let userId: string;
let versionId: string;
let contentId: string;

const validSpace: CreateCurricularSpaceRequest = {
  code: 'LAB-BIO-1',
  name: 'Laboratorio de Biología 1',
  componentCode: 'FORMACION_GENERAL',
  spaceType: 'AUTONOMO',
  formatType: 'LABORATORIO',
  characterType: 'OBLIGATORIO',
  levelNumber: 3,
  startTerm: 5,
  endTerm: 6,
  areaCodes: ['CIENCIAS_NATURALES'],
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
  otherSchoolId = schools.rows.find((s) => s.code === 'PCI-202')!.id;

  const userResult = await setupClient.query<{ id: string }>(
    `INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id;`,
    ['docente.prueba@example.com', 'Docente de prueba'],
  );
  userId = userResult.rows[0]?.id ?? '';

  const contentResult = await setupClient.query<{ id: string }>(
    `SELECT id FROM curricular_contents WHERE code = 'c1';`,
  );
  contentId = contentResult.rows[0]?.id ?? '';

  pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  service = new CurricularSpacesService(pool);
  projectsService = new PciProjectsService(pool);

  const project = await projectsService.createProject(schoolId, 'PCI Escuela 1', userId);
  versionId = project.currentVersion!.id;
});

afterEach(async () => {
  await pool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await setupClient.end();
});

describe('CurricularSpacesService (integración real contra PostgreSQL)', () => {
  it('crea un espacio curricular con sus áreas aportantes', async () => {
    const space = await service.createSpace(schoolId, versionId, validSpace);

    expect(space.code).toBe('LAB-BIO-1');
    expect(space.levelNumber).toBe(3);
    expect(space.startTerm).toBe(5);
    expect(space.endTerm).toBe(6);
    expect(space.areas).toEqual([
      { code: 'CIENCIAS_NATURALES', name: 'Ciencias Naturales', responsibilityText: null },
    ]);
    expect(space.contentCount).toBe(0);
  });

  it('rechaza areaCodes inexistentes (BadRequestException)', async () => {
    await expect(
      service.createSpace(schoolId, versionId, { ...validSpace, areaCodes: ['AREA_FALSA'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un code repetido dentro de la misma versión (ConflictException)', async () => {
    await service.createSpace(schoolId, versionId, validSpace);
    await expect(service.createSpace(schoolId, versionId, validSpace)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('no permite crear espacios en una versión de otra escuela (ForbiddenException)', async () => {
    const otherProject = await projectsService.createProject(
      otherSchoolId,
      'PCI Escuela 2',
      userId,
    );
    await expect(
      service.createSpace(schoolId, otherProject.currentVersion!.id, validSpace),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('PCI-VER-001: no permite crear espacios en una versión publicada', async () => {
    await projectsService.publishVersion(schoolId, versionId, userId);
    await expect(service.createSpace(schoolId, versionId, validSpace)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('asigna y desasigna contenido real de la bolsa a un espacio', async () => {
    const space = await service.createSpace(schoolId, versionId, validSpace);

    const afterAssign = await service.assignContent(schoolId, space.id, {
      curricularContentId: contentId,
    });
    expect(afterAssign).toHaveLength(1);
    expect(afterAssign[0]?.curricularContentId).toBe(contentId);
    expect(afterAssign[0]?.coverageWeight).toBe(1);

    const detail = await service.getSpace(schoolId, space.id);
    expect(detail.contentCount).toBe(1);

    const afterUnassign = await service.unassignContent(schoolId, space.id, contentId);
    expect(afterUnassign).toHaveLength(0);
  });

  it('no permite asignar el mismo contenido dos veces (ConflictException)', async () => {
    const space = await service.createSpace(schoolId, versionId, validSpace);
    await service.assignContent(schoolId, space.id, { curricularContentId: contentId });
    await expect(
      service.assignContent(schoolId, space.id, { curricularContentId: contentId }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('PCI-VER-001: no permite asignar contenido en una versión publicada', async () => {
    const space = await service.createSpace(schoolId, versionId, validSpace);
    await projectsService.publishVersion(schoolId, versionId, userId);

    await expect(
      service.assignContent(schoolId, space.id, { curricularContentId: contentId }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('listForVersion devuelve solo los espacios de esa versión', async () => {
    await service.createSpace(schoolId, versionId, validSpace);
    const list = await service.listForVersion(schoolId, versionId);
    expect(list).toHaveLength(1);
    expect(list[0]?.code).toBe('LAB-BIO-1');
  });
});
