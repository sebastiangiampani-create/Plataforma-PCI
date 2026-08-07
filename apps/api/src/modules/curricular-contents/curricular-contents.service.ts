import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  CurricularContentListResponse,
  CurricularTaxonomyArea,
  ListCurricularContentsQuery,
} from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';

interface ContentRow {
  id: string;
  code: string;
  content_text: string;
  status: 'ACTIVE' | 'ARCHIVED';
  component_code: string;
  area_code: string;
  area_name: string;
  subject_code: string;
  subject_name: string;
  axis_code: string;
  axis_name: string;
}

interface TaxonomyRow {
  area_code: string;
  area_name: string;
  subject_code: string;
  subject_name: string;
  axis_code: string;
  axis_name: string;
}

@Injectable()
export class CurricularContentsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(query: ListCurricularContentsQuery): Promise<CurricularContentListResponse> {
    const conditions: string[] = ['cc.status = $1', 'comp.code = $2'];
    const params: unknown[] = ['ACTIVE', query.componentCode];

    if (query.areaCode) {
      params.push(query.areaCode);
      conditions.push(`a.code = $${params.length}`);
    }
    if (query.subjectCode) {
      params.push(query.subjectCode);
      conditions.push(`s.code = $${params.length}`);
    }
    if (query.axisCode) {
      params.push(query.axisCode);
      conditions.push(`ax.code = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`cc.content_text ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const joins = `
      FROM curricular_contents cc
      JOIN components comp ON comp.id = cc.component_id
      JOIN areas a ON a.id = cc.area_id
      JOIN subjects s ON s.id = cc.subject_id
      JOIN axes ax ON ax.id = cc.axis_id
      WHERE ${where}
    `;

    const totalResult = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count ${joins}`,
      params,
    );
    const total = Number(totalResult.rows[0]?.count ?? 0);

    const dataParams = [...params, query.limit, query.offset];
    const rowsResult = await this.pool.query<ContentRow>(
      `SELECT
         cc.id, cc.code, cc.content_text, cc.status,
         comp.code AS component_code,
         a.code AS area_code, a.name AS area_name,
         s.code AS subject_code, s.name AS subject_name,
         ax.code AS axis_code, ax.name AS axis_name
       ${joins}
       ORDER BY a.code, s.code, ax.code, cc.code
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};`,
      dataParams,
    );

    return {
      items: rowsResult.rows.map((row) => ({
        id: row.id,
        code: row.code,
        contentText: row.content_text,
        status: row.status,
        componentCode: row.component_code,
        areaCode: row.area_code,
        areaName: row.area_name,
        subjectCode: row.subject_code,
        subjectName: row.subject_name,
        axisCode: row.axis_code,
        axisName: row.axis_name,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async taxonomy(componentCode: string): Promise<CurricularTaxonomyArea[]> {
    const result = await this.pool.query<TaxonomyRow>(
      `SELECT DISTINCT
         a.code AS area_code, a.name AS area_name,
         s.code AS subject_code, s.name AS subject_name,
         ax.code AS axis_code, ax.name AS axis_name
       FROM curricular_contents cc
       JOIN components comp ON comp.id = cc.component_id
       JOIN areas a ON a.id = cc.area_id
       JOIN subjects s ON s.id = cc.subject_id
       JOIN axes ax ON ax.id = cc.axis_id
       WHERE comp.code = $1 AND cc.status = 'ACTIVE'
       ORDER BY a.code, s.code, ax.code;`,
      [componentCode],
    );

    const areas = new Map<string, CurricularTaxonomyArea>();
    for (const row of result.rows) {
      let area = areas.get(row.area_code);
      if (!area) {
        area = { code: row.area_code, name: row.area_name, subjects: [] };
        areas.set(row.area_code, area);
      }
      let subject = area.subjects.find((s) => s.code === row.subject_code);
      if (!subject) {
        subject = { code: row.subject_code, name: row.subject_name, axes: [] };
        area.subjects.push(subject);
      }
      subject.axes.push({ code: row.axis_code, name: row.axis_name });
    }

    return [...areas.values()];
  }
}
