import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { PciProjectSummary, PciVersionSummary } from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';

interface ProjectRow {
  id: string;
  school_id: string;
  name: string;
  status: PciProjectSummary['status'];
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  pci_project_id: string;
  version_number: number;
  status: PciVersionSummary['status'];
  pedagogical_rationale: string | null;
  created_by: string | null;
  published_by: string | null;
  created_at: string;
  published_at: string | null;
}

@Injectable()
export class PciProjectsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listForSchool(schoolId: string): Promise<PciProjectSummary[]> {
    const projects = await this.pool.query<ProjectRow>(
      `SELECT * FROM pci_projects WHERE school_id = $1 ORDER BY created_at DESC;`,
      [schoolId],
    );
    return Promise.all(projects.rows.map((row) => this.toProjectSummary(this.pool, row)));
  }

  async getProject(schoolId: string, projectId: string): Promise<PciProjectSummary> {
    const row = await this.requireProject(this.pool, schoolId, projectId);
    return this.toProjectSummary(this.pool, row);
  }

  async createProject(
    schoolId: string,
    name: string,
    createdBy: string,
  ): Promise<PciProjectSummary> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const projectResult = await client.query<{ id: string }>(
        `INSERT INTO pci_projects (school_id, name, status) VALUES ($1, $2, 'DRAFT') RETURNING id;`,
        [schoolId, name],
      );
      const projectId = projectResult.rows[0]?.id;
      if (!projectId) throw new Error('No se pudo crear el proyecto PCI.');

      const versionResult = await client.query<{ id: string }>(
        `INSERT INTO pci_versions (pci_project_id, version_number, status, created_by)
         VALUES ($1, 1, 'DRAFT', $2)
         RETURNING id;`,
        [projectId, createdBy],
      );
      const versionId = versionResult.rows[0]?.id;

      await client.query(`UPDATE pci_projects SET current_version_id = $1 WHERE id = $2;`, [
        versionId,
        projectId,
      ]);

      await client.query('COMMIT');
      return this.getProject(schoolId, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createVersion(
    schoolId: string,
    projectId: string,
    createdBy: string,
  ): Promise<PciProjectSummary> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const project = await this.requireProject(client, schoolId, projectId);
      const currentVersion = project.current_version_id
        ? await this.requireVersionRow(client, project.current_version_id)
        : null;

      if (currentVersion && currentVersion.status !== 'PUBLISHED') {
        throw new ConflictException({
          code: 'PCI_VERSION_NOT_PUBLISHED',
          message:
            'Solo se puede crear una versión nueva cuando la versión actual ya fue publicada (PCI-VER-002).',
        });
      }

      const nextVersionNumber = (currentVersion?.version_number ?? 0) + 1;
      const versionResult = await client.query<{ id: string }>(
        `INSERT INTO pci_versions (pci_project_id, version_number, status, created_by)
         VALUES ($1, $2, 'DRAFT', $3)
         RETURNING id;`,
        [projectId, nextVersionNumber, createdBy],
      );
      const versionId = versionResult.rows[0]?.id;

      await client.query(
        `UPDATE pci_projects SET current_version_id = $1, status = 'DRAFT', updated_at = now() WHERE id = $2;`,
        [versionId, projectId],
      );

      await client.query('COMMIT');
      return this.getProject(schoolId, projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateVersion(
    schoolId: string,
    versionId: string,
    pedagogicalRationale: string,
  ): Promise<PciVersionSummary> {
    const version = await this.requireVersionForSchool(this.pool, schoolId, versionId);
    if (version.status === 'PUBLISHED') {
      throw new ConflictException({
        code: 'PCI_VERSION_PUBLISHED',
        message: 'Una versión publicada es inmutable (PCI-VER-001).',
      });
    }

    const result = await this.pool.query<VersionRow>(
      `UPDATE pci_versions SET pedagogical_rationale = $1 WHERE id = $2 RETURNING *;`,
      [pedagogicalRationale, versionId],
    );
    return this.toVersionSummary(this.requireRow(result.rows));
  }

  async publishVersion(
    schoolId: string,
    versionId: string,
    publishedBy: string,
  ): Promise<PciVersionSummary> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const version = await this.requireVersionForSchool(client, schoolId, versionId);
      if (version.status === 'PUBLISHED') {
        throw new ConflictException({
          code: 'PCI_VERSION_ALREADY_PUBLISHED',
          message: 'Esta versión ya está publicada.',
        });
      }

      const result = await client.query<VersionRow>(
        `UPDATE pci_versions
         SET status = 'PUBLISHED', published_at = now(), published_by = $1
         WHERE id = $2
         RETURNING *;`,
        [publishedBy, versionId],
      );
      const updated = this.requireRow(result.rows);

      await client.query(
        `UPDATE pci_projects SET status = 'PUBLISHED', updated_at = now() WHERE id = $1;`,
        [updated.pci_project_id],
      );

      await client.query('COMMIT');
      return this.toVersionSummary(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async requireProject(
    db: Pool | PoolClient,
    schoolId: string,
    projectId: string,
  ): Promise<ProjectRow> {
    const result = await db.query<ProjectRow>(`SELECT * FROM pci_projects WHERE id = $1;`, [
      projectId,
    ]);
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: 'PCI_PROJECT_NOT_FOUND',
        message: `No existe un proyecto PCI con id "${projectId}".`,
      });
    }
    if (row.school_id !== schoolId) {
      throw new ForbiddenException({
        code: 'PCI_PROJECT_ACCESS_DENIED',
        message: 'El proyecto PCI no pertenece a la escuela activa.',
      });
    }
    return row;
  }

  private async requireVersionRow(db: Pool | PoolClient, versionId: string): Promise<VersionRow> {
    const result = await db.query<VersionRow>(`SELECT * FROM pci_versions WHERE id = $1;`, [
      versionId,
    ]);
    return this.requireRow(
      result.rows,
      'PCI_VERSION_NOT_FOUND',
      `No existe la versión "${versionId}".`,
    );
  }

  private async requireVersionForSchool(
    db: Pool | PoolClient,
    schoolId: string,
    versionId: string,
  ): Promise<VersionRow> {
    const version = await this.requireVersionRow(db, versionId);
    await this.requireProject(db, schoolId, version.pci_project_id);
    return version;
  }

  private requireRow<T>(rows: T[], code = 'NOT_FOUND', message = 'No encontrado.'): T {
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({ code, message });
    }
    return row;
  }

  private async toProjectSummary(
    db: Pool | PoolClient,
    row: ProjectRow,
  ): Promise<PciProjectSummary> {
    const currentVersion = row.current_version_id
      ? this.toVersionSummary(await this.requireVersionRow(db, row.current_version_id))
      : null;

    return {
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      status: row.status,
      currentVersion,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private toVersionSummary(row: VersionRow): PciVersionSummary {
    return {
      id: row.id,
      pciProjectId: row.pci_project_id,
      versionNumber: row.version_number,
      status: row.status,
      pedagogicalRationale: row.pedagogical_rationale,
      createdBy: row.created_by,
      publishedBy: row.published_by,
      createdAt: new Date(row.created_at).toISOString(),
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    };
  }
}
