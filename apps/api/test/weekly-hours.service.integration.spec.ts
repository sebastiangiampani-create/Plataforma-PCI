import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Client, Pool } from 'pg';
import {
  DEFAULT_MIGRATIONS_DIR,
  DEFAULT_SEEDS_DIR,
  runMigrationsUp,
  runSeeds,
} from '@pci/database';
import type { CreateCurricularSpaceRequest } from '@pci/domain';
import { WeeklyHoursService } from '../src/modules/weekly-hours/weekly-hours.service.js';
import { CurricularSpacesService } from '../src/modules/curricular-spaces/curricular-spaces.service.js';
import { PciProjectsService } from '../src/modules/pci-projects/pci-projects.service.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

let schema: string;
let setupClient: Client;
let pool: Pool;
let service: WeeklyHoursService;
let spacesService: CurricularSpacesService;
let projectsService: PciProjectsService;
let schoolId: string;
let userId: string;
let spaceId: string;
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
  service = new WeeklyHoursService(pool);
  spacesService = new CurricularSpacesService(pool);
  projectsService = new PciProjectsService(pool);

  const project = await projectsService.createProject(schoolId, 'PCI Escuela 1', userId);
  versionId = project.currentVersion!.id;
  const space = await spacesService.createSpace(schoolId, versionId, mathSpace);
  spaceId = space.id;
});

afterEach(async () => {
  await pool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await setupClient.end();
});

describe('WeeklyHoursService (integración real contra PostgreSQL)', () => {
  it('sugiere las horas oficiales reales del plan para el área y nivel del espacio', async () => {
    const suggestions = await service.suggestions(schoolId, spaceId);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      unidadCurricular: 'Matemática',
      areaCode: 'MATEMATICA',
      hours: 5,
    });
  });

  it('carga y lista horas por cuatrimestre/área', async () => {
    await service.set(schoolId, spaceId, { areaCode: 'MATEMATICA', termNumber: 1, hours: 5 });
    const afterFirst = await service.set(schoolId, spaceId, {
      areaCode: 'MATEMATICA',
      termNumber: 2,
      hours: 5,
    });

    expect(afterFirst).toHaveLength(2);
    expect(afterFirst.map((e) => e.termNumber)).toEqual([1, 2]);
    expect(afterFirst.every((e) => e.hours === 5)).toBe(true);
  });

  it('actualizar el mismo cuatrimestre/área reemplaza el valor (no duplica filas)', async () => {
    await service.set(schoolId, spaceId, { areaCode: 'MATEMATICA', termNumber: 1, hours: 5 });
    const updated = await service.set(schoolId, spaceId, {
      areaCode: 'MATEMATICA',
      termNumber: 1,
      hours: 4,
    });

    expect(updated).toHaveLength(1);
    expect(updated[0]?.hours).toBe(4);
  });

  it('rechaza un cuatrimestre fuera del rango del espacio', async () => {
    await expect(
      service.set(schoolId, spaceId, { areaCode: 'MATEMATICA', termNumber: 5, hours: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un área que no es aportante del espacio', async () => {
    await expect(
      service.set(schoolId, spaceId, { areaCode: 'ARTES', termNumber: 1, hours: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PCI-VER-001: no permite cargar horas en una versión publicada', async () => {
    await projectsService.publishVersion(schoolId, versionId, userId);
    await expect(
      service.set(schoolId, spaceId, { areaCode: 'MATEMATICA', termNumber: 1, hours: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('elimina una fila cargada; 404 si no existe', async () => {
    await service.set(schoolId, spaceId, { areaCode: 'MATEMATICA', termNumber: 1, hours: 5 });
    const afterRemove = await service.remove(schoolId, spaceId, 'MATEMATICA', 1);
    expect(afterRemove).toHaveLength(0);

    await expect(service.remove(schoolId, spaceId, 'MATEMATICA', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no permite operar sobre un espacio de otra escuela (ForbiddenException)', async () => {
    const schools = await setupClient.query<{ id: string; code: string }>(
      `SELECT id, code FROM schools ORDER BY code;`,
    );
    const otherSchoolId = schools.rows.find((s) => s.code === 'PCI-202')!.id;

    await expect(service.list(otherSchoolId, spaceId)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
