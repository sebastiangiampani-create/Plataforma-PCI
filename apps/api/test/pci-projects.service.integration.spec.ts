import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Client, Pool } from 'pg';
import {
  DEFAULT_MIGRATIONS_DIR,
  DEFAULT_SEEDS_DIR,
  runMigrationsUp,
  runSeeds,
} from '@pci/database';
import { PciProjectsService } from '../src/modules/pci-projects/pci-projects.service.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev';

let schema: string;
let setupClient: Client;
let pool: Pool;
let service: PciProjectsService;
let schoolId: string;
let otherSchoolId: string;
let userId: string;

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

  pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  service = new PciProjectsService(pool);
});

afterEach(async () => {
  await pool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await setupClient.end();
});

describe('PciProjectsService (integración real contra PostgreSQL)', () => {
  it('crea un proyecto con su primera versión en DRAFT', async () => {
    const project = await service.createProject(schoolId, 'PCI Escuela 1', userId);

    expect(project.schoolId).toBe(schoolId);
    expect(project.status).toBe('DRAFT');
    expect(project.currentVersion).toMatchObject({
      versionNumber: 1,
      status: 'DRAFT',
      pedagogicalRationale: null,
      createdBy: userId,
    });
  });

  it('lista solo los proyectos de la escuela indicada', async () => {
    await service.createProject(schoolId, 'PCI Escuela 1', userId);
    await service.createProject(otherSchoolId, 'PCI Escuela 2', userId);

    const list = await service.listForSchool(schoolId);
    expect(list).toHaveLength(1);
    expect(list[0]?.schoolId).toBe(schoolId);
  });

  it('rechaza acceder a un proyecto de otra escuela (ForbiddenException)', async () => {
    const project = await service.createProject(otherSchoolId, 'PCI Escuela 2', userId);

    await expect(service.getProject(schoolId, project.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('404 al pedir un proyecto inexistente', async () => {
    await expect(service.getProject(schoolId, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('permite editar pedagogicalRationale mientras la versión no esté publicada', async () => {
    const project = await service.createProject(schoolId, 'PCI Escuela 1', userId);
    const versionId = project.currentVersion!.id;

    const updated = await service.updateVersion(schoolId, versionId, 'Fundamento pedagógico real');
    expect(updated.pedagogicalRationale).toBe('Fundamento pedagógico real');
  });

  it('PCI-VER-002: no permite crear una versión nueva si la actual no está publicada', async () => {
    const project = await service.createProject(schoolId, 'PCI Escuela 1', userId);

    await expect(service.createVersion(schoolId, project.id, userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('publica una versión y habilita crear la siguiente (PCI-VER-002)', async () => {
    const project = await service.createProject(schoolId, 'PCI Escuela 1', userId);
    const versionId = project.currentVersion!.id;

    const published = await service.publishVersion(schoolId, versionId, userId);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeTruthy();
    expect(published.publishedBy).toBe(userId);

    const projectAfterPublish = await service.getProject(schoolId, project.id);
    expect(projectAfterPublish.status).toBe('PUBLISHED');

    const withNewVersion = await service.createVersion(schoolId, project.id, userId);
    expect(withNewVersion.currentVersion).toMatchObject({ versionNumber: 2, status: 'DRAFT' });
    expect(withNewVersion.status).toBe('DRAFT');
  });

  it('PCI-VER-001: una versión publicada es inmutable (no se puede editar ni volver a publicar)', async () => {
    const project = await service.createProject(schoolId, 'PCI Escuela 1', userId);
    const versionId = project.currentVersion!.id;
    await service.publishVersion(schoolId, versionId, userId);

    await expect(
      service.updateVersion(schoolId, versionId, 'Intento de edición post-publicación'),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(service.publishVersion(schoolId, versionId, userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
