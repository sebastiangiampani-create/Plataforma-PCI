import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  AssignContentRequest,
  ContentAssignmentSummary,
  CreateCurricularSpaceRequest,
  CurricularSpaceSummary,
} from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';

interface VersionOwnershipRow {
  id: string;
  status: string;
  school_id: string;
}

interface SpaceRow {
  id: string;
  pci_version_id: string;
  code: string;
  name: string;
  component_code: string;
  orientation_code: string | null;
  space_type: CurricularSpaceSummary['spaceType'];
  format_type: CurricularSpaceSummary['formatType'];
  character_type: CurricularSpaceSummary['characterType'];
  level_number: number;
  start_term: number;
  end_term: number;
  objectives: string | null;
  problem_context: string | null;
  observations: string | null;
  status: CurricularSpaceSummary['status'];
}

interface AreaRow {
  curricular_space_id: string;
  code: string;
  name: string;
  responsibility_text: string | null;
}

interface AssignmentRow {
  id: string;
  curricular_content_id: string;
  code: string;
  content_text: string;
  area_name: string;
  subject_name: string;
  axis_name: string;
  coverage_weight: string;
  notes: string | null;
  created_at: string;
}

@Injectable()
export class CurricularSpacesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listForVersion(schoolId: string, versionId: string): Promise<CurricularSpaceSummary[]> {
    await this.requireVersionForSchool(this.pool, schoolId, versionId);

    const spaces = await this.pool.query<SpaceRow>(
      `SELECT
         cs.id, cs.pci_version_id, cs.code, cs.name,
         comp.code AS component_code, ori.code AS orientation_code,
         cs.space_type, cs.format_type, cs.character_type,
         cs.level_number, cs.start_term, cs.end_term,
         cs.objectives, cs.problem_context, cs.observations, cs.status
       FROM curricular_spaces cs
       JOIN components comp ON comp.id = cs.component_id
       LEFT JOIN orientations ori ON ori.id = cs.orientation_id
       WHERE cs.pci_version_id = $1
       ORDER BY cs.level_number, cs.code;`,
      [versionId],
    );

    return Promise.all(spaces.rows.map((row) => this.toSummary(this.pool, row)));
  }

  async getSpace(schoolId: string, spaceId: string): Promise<CurricularSpaceSummary> {
    const row = await this.requireSpaceForSchool(this.pool, schoolId, spaceId);
    return this.toSummary(this.pool, row);
  }

  async createSpace(
    schoolId: string,
    versionId: string,
    input: CreateCurricularSpaceRequest,
  ): Promise<CurricularSpaceSummary> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const version = await this.requireVersionForSchool(client, schoolId, versionId);
      this.requireNotPublished(version);

      const componentResult = await client.query<{ id: string }>(
        `SELECT id FROM components WHERE code = $1;`,
        [input.componentCode],
      );
      const componentId = componentResult.rows[0]?.id;
      if (!componentId) {
        throw new BadRequestException({
          code: 'COMPONENT_NOT_FOUND',
          message: `componentCode "${input.componentCode}" no existe.`,
        });
      }

      let orientationId: string | null = null;
      if (input.orientationCode) {
        const orientationResult = await client.query<{ id: string; component_id: string }>(
          `SELECT id, component_id FROM orientations WHERE code = $1;`,
          [input.orientationCode],
        );
        const orientation = orientationResult.rows[0];
        if (!orientation) {
          throw new BadRequestException({
            code: 'ORIENTATION_NOT_FOUND',
            message: `orientationCode "${input.orientationCode}" no existe.`,
          });
        }
        if (orientation.component_id !== componentId) {
          throw new BadRequestException({
            code: 'ORIENTATION_COMPONENT_MISMATCH',
            message: `orientationCode "${input.orientationCode}" no pertenece al componente "${input.componentCode}".`,
          });
        }
        orientationId = orientation.id;
      }

      const areaRows = await client.query<{ id: string; code: string }>(
        `SELECT id, code FROM areas WHERE code = ANY($1::text[]);`,
        [input.areaCodes],
      );
      const missingAreaCodes = input.areaCodes.filter(
        (code) => !areaRows.rows.some((row) => row.code === code),
      );
      if (missingAreaCodes.length > 0) {
        throw new BadRequestException({
          code: 'AREA_NOT_FOUND',
          message: `areaCodes inexistentes: ${missingAreaCodes.join(', ')}.`,
        });
      }

      let spaceId: string;
      try {
        const spaceResult = await client.query<{ id: string }>(
          `INSERT INTO curricular_spaces
             (pci_version_id, component_id, orientation_id, code, name, space_type, format_type,
              character_type, level_number, start_term, end_term, objectives, problem_context, observations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id;`,
          [
            versionId,
            componentId,
            orientationId,
            input.code,
            input.name,
            input.spaceType,
            input.formatType,
            input.characterType,
            input.levelNumber,
            input.startTerm,
            input.endTerm,
            input.objectives ?? null,
            input.problemContext ?? null,
            input.observations ?? null,
          ],
        );
        spaceId = spaceResult.rows[0]?.id ?? '';
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException({
            code: 'CURRICULAR_SPACE_CODE_TAKEN',
            message: `Ya existe un espacio curricular con code "${input.code}" en esta versión.`,
          });
        }
        throw error;
      }

      for (const areaRow of areaRows.rows) {
        await client.query(
          `INSERT INTO space_areas (curricular_space_id, area_id) VALUES ($1, $2);`,
          [spaceId, areaRow.id],
        );
      }

      await client.query('COMMIT');
      return this.getSpace(schoolId, spaceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAssignments(schoolId: string, spaceId: string): Promise<ContentAssignmentSummary[]> {
    await this.requireSpaceForSchool(this.pool, schoolId, spaceId);

    const result = await this.pool.query<AssignmentRow>(
      `SELECT
         ca.id, ca.curricular_content_id, cc.code, cc.content_text,
         a.name AS area_name, s.name AS subject_name, ax.name AS axis_name,
         ca.coverage_weight, ca.notes, ca.created_at
       FROM content_assignments ca
       JOIN curricular_contents cc ON cc.id = ca.curricular_content_id
       JOIN areas a ON a.id = cc.area_id
       JOIN subjects s ON s.id = cc.subject_id
       JOIN axes ax ON ax.id = cc.axis_id
       WHERE ca.curricular_space_id = $1
       ORDER BY ca.created_at ASC;`,
      [spaceId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      curricularContentId: row.curricular_content_id,
      code: row.code,
      contentText: row.content_text,
      areaName: row.area_name,
      subjectName: row.subject_name,
      axisName: row.axis_name,
      coverageWeight: Number(row.coverage_weight),
      notes: row.notes,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async assignContent(
    schoolId: string,
    spaceId: string,
    input: AssignContentRequest,
  ): Promise<ContentAssignmentSummary[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const space = await this.requireSpaceForSchool(client, schoolId, spaceId);
      const version = await this.requireVersionForSchool(client, schoolId, space.pci_version_id);
      this.requireNotPublished(version);

      const contentResult = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM curricular_contents WHERE id = $1;`,
        [input.curricularContentId],
      );
      const content = contentResult.rows[0];
      if (!content) {
        throw new NotFoundException({
          code: 'CURRICULAR_CONTENT_NOT_FOUND',
          message: `No existe un contenido con id "${input.curricularContentId}".`,
        });
      }
      if (content.status !== 'ACTIVE') {
        throw new BadRequestException({
          code: 'CURRICULAR_CONTENT_NOT_ACTIVE',
          message: 'No se puede asignar un contenido archivado.',
        });
      }

      try {
        await client.query(
          `INSERT INTO content_assignments (curricular_space_id, curricular_content_id, coverage_weight, notes)
           VALUES ($1, $2, $3, $4);`,
          [spaceId, input.curricularContentId, input.coverageWeight ?? 1, input.notes ?? null],
        );
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException({
            code: 'CONTENT_ALREADY_ASSIGNED',
            message: 'Este contenido ya está asignado a este espacio curricular.',
          });
        }
        throw error;
      }

      await client.query('COMMIT');
      return this.listAssignments(schoolId, spaceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async unassignContent(
    schoolId: string,
    spaceId: string,
    contentId: string,
  ): Promise<ContentAssignmentSummary[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const space = await this.requireSpaceForSchool(client, schoolId, spaceId);
      const version = await this.requireVersionForSchool(client, schoolId, space.pci_version_id);
      this.requireNotPublished(version);

      const result = await client.query(
        `DELETE FROM content_assignments WHERE curricular_space_id = $1 AND curricular_content_id = $2;`,
        [spaceId, contentId],
      );
      if (result.rowCount === 0) {
        throw new NotFoundException({
          code: 'CONTENT_ASSIGNMENT_NOT_FOUND',
          message: 'Ese contenido no está asignado a este espacio curricular.',
        });
      }

      await client.query('COMMIT');
      return this.listAssignments(schoolId, spaceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private requireNotPublished(version: VersionOwnershipRow): void {
    if (version.status === 'PUBLISHED') {
      throw new ConflictException({
        code: 'PCI_VERSION_PUBLISHED',
        message: 'Una versión publicada es inmutable (PCI-VER-001): no se puede modificar.',
      });
    }
  }

  private async requireVersionForSchool(
    db: Pool | PoolClient,
    schoolId: string,
    versionId: string,
  ): Promise<VersionOwnershipRow> {
    const result = await db.query<VersionOwnershipRow>(
      `SELECT pv.id, pv.status, pp.school_id
       FROM pci_versions pv
       JOIN pci_projects pp ON pp.id = pv.pci_project_id
       WHERE pv.id = $1;`,
      [versionId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: 'PCI_VERSION_NOT_FOUND',
        message: `No existe una versión PCI con id "${versionId}".`,
      });
    }
    if (row.school_id !== schoolId) {
      throw new ForbiddenException({
        code: 'PCI_VERSION_ACCESS_DENIED',
        message: 'La versión PCI no pertenece a la escuela activa.',
      });
    }
    return row;
  }

  private async requireSpaceForSchool(
    db: Pool | PoolClient,
    schoolId: string,
    spaceId: string,
  ): Promise<SpaceRow> {
    const result = await db.query<SpaceRow>(
      `SELECT
         cs.id, cs.pci_version_id, cs.code, cs.name,
         comp.code AS component_code, ori.code AS orientation_code,
         cs.space_type, cs.format_type, cs.character_type,
         cs.level_number, cs.start_term, cs.end_term,
         cs.objectives, cs.problem_context, cs.observations, cs.status
       FROM curricular_spaces cs
       JOIN components comp ON comp.id = cs.component_id
       LEFT JOIN orientations ori ON ori.id = cs.orientation_id
       WHERE cs.id = $1;`,
      [spaceId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: 'CURRICULAR_SPACE_NOT_FOUND',
        message: `No existe un espacio curricular con id "${spaceId}".`,
      });
    }
    await this.requireVersionForSchool(db, schoolId, row.pci_version_id);
    return row;
  }

  private async toSummary(db: Pool | PoolClient, row: SpaceRow): Promise<CurricularSpaceSummary> {
    const [areasResult, countResult] = await Promise.all([
      db.query<AreaRow>(
        `SELECT sa.curricular_space_id, a.code, a.name, sa.responsibility_text
         FROM space_areas sa
         JOIN areas a ON a.id = sa.area_id
         WHERE sa.curricular_space_id = $1
         ORDER BY a.code;`,
        [row.id],
      ),
      db.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM content_assignments WHERE curricular_space_id = $1;`,
        [row.id],
      ),
    ]);

    return {
      id: row.id,
      pciVersionId: row.pci_version_id,
      code: row.code,
      name: row.name,
      componentCode: row.component_code,
      orientationCode: row.orientation_code,
      spaceType: row.space_type,
      formatType: row.format_type,
      characterType: row.character_type,
      levelNumber: row.level_number,
      startTerm: row.start_term,
      endTerm: row.end_term,
      objectives: row.objectives,
      problemContext: row.problem_context,
      observations: row.observations,
      status: row.status,
      areas: areasResult.rows.map((area) => ({
        code: area.code,
        name: area.name,
        responsibilityText: area.responsibility_text,
      })),
      contentCount: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
