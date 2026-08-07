import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { FORMACION_GENERAL_PLAN } from '@pci/domain';
import type { SetWeeklyHoursRequest, WeeklyHoursEntry, WeeklyHoursSuggestion } from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';

interface SpaceRow {
  id: string;
  pci_version_id: string;
  level_number: number;
  start_term: number;
  end_term: number;
  school_id: string;
  version_status: string;
}

interface WeeklyHoursRow {
  id: string;
  term_number: number;
  area_code: string;
  area_name: string;
  hours: string;
}

@Injectable()
export class WeeklyHoursService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(schoolId: string, spaceId: string): Promise<WeeklyHoursEntry[]> {
    await this.requireSpaceForSchool(this.pool, schoolId, spaceId);
    return this.listRows(this.pool, spaceId);
  }

  async suggestions(schoolId: string, spaceId: string): Promise<WeeklyHoursSuggestion[]> {
    const space = await this.requireSpaceForSchool(this.pool, schoolId, spaceId);

    const areaRows = await this.pool.query<{ code: string }>(
      `SELECT a.code FROM space_areas sa JOIN areas a ON a.id = sa.area_id WHERE sa.curricular_space_id = $1;`,
      [spaceId],
    );
    const spaceAreaCodes = new Set(areaRows.rows.map((row) => row.code));

    const suggestions: WeeklyHoursSuggestion[] = [];
    for (const entry of FORMACION_GENERAL_PLAN) {
      if (entry.areaCode === null || !spaceAreaCodes.has(entry.areaCode)) continue;
      const hours = entry.weeklyHoursByLevel[space.level_number - 1];
      if (hours === null || hours === undefined) continue;
      suggestions.push({
        unidadCurricular: entry.unidadCurricular,
        areaCode: entry.areaCode,
        subjectCode: entry.subjectCode,
        hours,
        note: entry.note,
      });
    }
    return suggestions;
  }

  async set(
    schoolId: string,
    spaceId: string,
    input: SetWeeklyHoursRequest,
  ): Promise<WeeklyHoursEntry[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const space = await this.requireSpaceForSchool(client, schoolId, spaceId);
      this.requireNotPublished(space);

      if (input.termNumber < space.start_term || input.termNumber > space.end_term) {
        throw new BadRequestException({
          code: 'TERM_OUTSIDE_SPACE_RANGE',
          message: `El cuatrimestre ${input.termNumber} está fuera del rango de este espacio (C${space.start_term}-C${space.end_term}).`,
        });
      }

      const areaResult = await client.query<{ id: string }>(
        `SELECT a.id FROM space_areas sa
         JOIN areas a ON a.id = sa.area_id
         WHERE sa.curricular_space_id = $1 AND a.code = $2;`,
        [spaceId, input.areaCode],
      );
      const areaId = areaResult.rows[0]?.id;
      if (!areaId) {
        throw new BadRequestException({
          code: 'AREA_NOT_CONTRIBUTING',
          message: `El área "${input.areaCode}" no es aportante de este espacio.`,
        });
      }

      await client.query(
        `DELETE FROM weekly_hours
         WHERE curricular_space_id = $1 AND term_number = $2 AND area_id = $3 AND source_space_id IS NULL;`,
        [spaceId, input.termNumber, areaId],
      );
      await client.query(
        `INSERT INTO weekly_hours (curricular_space_id, term_number, area_id, hours)
         VALUES ($1, $2, $3, $4);`,
        [spaceId, input.termNumber, areaId, input.hours],
      );

      await client.query('COMMIT');
      return this.listRows(this.pool, spaceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(
    schoolId: string,
    spaceId: string,
    areaCode: string,
    termNumber: number,
  ): Promise<WeeklyHoursEntry[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const space = await this.requireSpaceForSchool(client, schoolId, spaceId);
      this.requireNotPublished(space);

      const result = await client.query(
        `DELETE FROM weekly_hours
         WHERE curricular_space_id = $1 AND term_number = $2 AND source_space_id IS NULL
           AND area_id = (SELECT id FROM areas WHERE code = $3);`,
        [spaceId, termNumber, areaCode],
      );
      if (result.rowCount === 0) {
        throw new NotFoundException({
          code: 'WEEKLY_HOURS_NOT_FOUND',
          message: 'No hay carga horaria cargada para esa área/cuatrimestre en este espacio.',
        });
      }

      await client.query('COMMIT');
      return this.listRows(this.pool, spaceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private requireNotPublished(space: SpaceRow): void {
    if (space.version_status === 'PUBLISHED') {
      throw new ConflictException({
        code: 'PCI_VERSION_PUBLISHED',
        message: 'Una versión publicada es inmutable (PCI-VER-001): no se puede modificar.',
      });
    }
  }

  private async listRows(db: Pool | PoolClient, spaceId: string): Promise<WeeklyHoursEntry[]> {
    const result = await db.query<WeeklyHoursRow>(
      `SELECT wh.id, wh.term_number, a.code AS area_code, a.name AS area_name, wh.hours
       FROM weekly_hours wh
       JOIN areas a ON a.id = wh.area_id
       WHERE wh.curricular_space_id = $1 AND wh.source_space_id IS NULL
       ORDER BY wh.term_number, a.code;`,
      [spaceId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      termNumber: row.term_number,
      areaCode: row.area_code,
      areaName: row.area_name,
      hours: Number(row.hours),
    }));
  }

  private async requireSpaceForSchool(
    db: Pool | PoolClient,
    schoolId: string,
    spaceId: string,
  ): Promise<SpaceRow> {
    const result = await db.query<SpaceRow>(
      `SELECT cs.id, cs.pci_version_id, cs.level_number, cs.start_term, cs.end_term,
              pp.school_id, pv.status AS version_status
       FROM curricular_spaces cs
       JOIN pci_versions pv ON pv.id = cs.pci_version_id
       JOIN pci_projects pp ON pp.id = pv.pci_project_id
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
    if (row.school_id !== schoolId) {
      throw new ForbiddenException({
        code: 'CURRICULAR_SPACE_ACCESS_DENIED',
        message: 'El espacio curricular no pertenece a la escuela activa.',
      });
    }
    return row;
  }
}
