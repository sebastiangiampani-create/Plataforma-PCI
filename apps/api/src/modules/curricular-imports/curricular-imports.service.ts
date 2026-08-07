import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  CreateCurricularImportRequest,
  CurricularImportListItem,
  CurricularImportRowSummary,
  CurricularImportSummary,
} from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';
import { CsvFormatError, parseCurricularImportCsv, type CurricularImportCsvRow } from './csv.js';

interface TaxonomyRow {
  code: string;
  id: string;
  parent_code: string | null;
}

interface Taxonomy {
  components: Map<string, string>;
  orientations: Map<string, { id: string; componentCode: string }>;
  areas: Map<string, string>;
  subjects: Map<string, { id: string; areaCode: string }>;
  axes: Map<string, { id: string; subjectCode: string }>;
}

interface PreparedRow {
  rowNumber: number;
  raw: CurricularImportCsvRow;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors: string[];
  componentId?: string;
  orientationId?: string | null;
  areaId?: string;
  subjectId?: string;
  axisId?: string;
}

interface ImportRow {
  id: string;
  row_number: number;
  curricular_content_id: string | null;
  raw_data_json: Record<string, string>;
  validation_errors_json: string[] | null;
  status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'IMPORTED';
}

interface ImportRecord {
  id: string;
  school_id: string | null;
  source_name: string;
  source_version: string;
  status: 'PREVIEW' | 'APPLIED' | 'REVERTED';
  imported_by: string;
  created_at: string;
  reverted_at: string | null;
}

@Injectable()
export class CurricularImportsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createImport(
    input: CreateCurricularImportRequest,
    importedBy: string,
  ): Promise<CurricularImportSummary> {
    let csvRows: CurricularImportCsvRow[];
    try {
      csvRows = parseCurricularImportCsv(input.csvContent);
    } catch (error) {
      if (error instanceof CsvFormatError) {
        throw new BadRequestException({ code: 'INVALID_CSV', message: error.message });
      }
      throw error;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const taxonomy = await this.loadTaxonomy(client);
      const existingCodes = await this.loadExistingCodes(
        client,
        input.sourceVersion,
        csvRows.map((row) => row.code).filter(Boolean),
      );
      const prepared = this.prepareRows(csvRows, taxonomy, existingCodes);

      const importResult = await client.query<{ id: string }>(
        `INSERT INTO curricular_imports (school_id, source_name, source_version, status, imported_by)
         VALUES ($1, $2, $3, 'PREVIEW', $4)
         RETURNING id;`,
        [input.schoolId ?? null, input.sourceName, input.sourceVersion, importedBy],
      );
      const importId = importResult.rows[0]?.id;
      if (!importId) throw new Error('No se pudo crear la importación.');

      for (const row of prepared) {
        await client.query(
          `INSERT INTO curricular_import_rows
             (curricular_import_id, row_number, raw_data_json, validation_errors_json, status)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5);`,
          [
            importId,
            row.rowNumber,
            JSON.stringify(row.raw),
            row.errors.length > 0 ? JSON.stringify(row.errors) : null,
            row.status,
          ],
        );
      }

      await client.query('COMMIT');
      return this.getImport(importId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listImports(schoolId?: string): Promise<CurricularImportListItem[]> {
    const result = await this.pool.query<
      ImportRecord & {
        row_count: string;
        valid_count: string;
        invalid_count: string;
        duplicate_count: string;
        imported_count: string;
      }
    >(
      `SELECT
         ci.*,
         count(cir.id)::int AS row_count,
         count(cir.id) FILTER (WHERE cir.status = 'VALID')::int AS valid_count,
         count(cir.id) FILTER (WHERE cir.status = 'INVALID')::int AS invalid_count,
         count(cir.id) FILTER (WHERE cir.status = 'DUPLICATE')::int AS duplicate_count,
         count(cir.id) FILTER (WHERE cir.status = 'IMPORTED')::int AS imported_count
       FROM curricular_imports ci
       LEFT JOIN curricular_import_rows cir ON cir.curricular_import_id = ci.id
       WHERE $1::uuid IS NULL OR ci.school_id = $1
       GROUP BY ci.id
       ORDER BY ci.created_at DESC;`,
      [schoolId ?? null],
    );

    return result.rows.map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      sourceName: row.source_name,
      sourceVersion: row.source_version,
      status: row.status,
      importedBy: row.imported_by,
      createdAt: new Date(row.created_at).toISOString(),
      revertedAt: row.reverted_at ? new Date(row.reverted_at).toISOString() : null,
      rowCount: Number(row.row_count),
      validCount: Number(row.valid_count),
      invalidCount: Number(row.invalid_count),
      duplicateCount: Number(row.duplicate_count),
      importedCount: Number(row.imported_count),
    }));
  }

  async getImport(id: string): Promise<CurricularImportSummary> {
    const importRow = await this.requireImport(this.pool, id);
    const rowsResult = await this.pool.query<ImportRow>(
      `SELECT id, row_number, curricular_content_id, raw_data_json, validation_errors_json, status
       FROM curricular_import_rows
       WHERE curricular_import_id = $1
       ORDER BY row_number ASC;`,
      [id],
    );

    return this.toSummary(importRow, rowsResult.rows);
  }

  async confirmImport(id: string): Promise<CurricularImportSummary> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const importRow = await this.requireImport(client, id);
      if (importRow.status !== 'PREVIEW') {
        throw new ConflictException({
          code: 'IMPORT_NOT_PREVIEW',
          message: `La importación está en estado "${importRow.status}"; solo se puede confirmar una importación en "PREVIEW".`,
        });
      }

      const rowsResult = await client.query<ImportRow>(
        `SELECT id, row_number, curricular_content_id, raw_data_json, validation_errors_json, status
         FROM curricular_import_rows
         WHERE curricular_import_id = $1 AND status = 'VALID'
         ORDER BY row_number ASC;`,
        [id],
      );

      const taxonomy = await this.loadTaxonomy(client);

      for (const row of rowsResult.rows) {
        const raw = row.raw_data_json;
        const ids = this.resolveTaxonomyIds(taxonomy, raw);
        const contentResult = await client.query<{ id: string }>(
          `INSERT INTO curricular_contents
             (component_id, orientation_id, area_id, subject_id, axis_id, code, content_text, source_version, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
           RETURNING id;`,
          [
            ids.componentId,
            ids.orientationId,
            ids.areaId,
            ids.subjectId,
            ids.axisId,
            raw.code,
            raw.content_text,
            importRow.source_version,
          ],
        );
        const contentId = contentResult.rows[0]?.id;
        await client.query(
          `UPDATE curricular_import_rows SET status = 'IMPORTED', curricular_content_id = $1 WHERE id = $2;`,
          [contentId, row.id],
        );
      }

      await client.query(`UPDATE curricular_imports SET status = 'APPLIED' WHERE id = $1;`, [id]);
      await client.query('COMMIT');
      return this.getImport(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revertImport(id: string): Promise<CurricularImportSummary> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const importRow = await this.requireImport(client, id);
      if (importRow.status !== 'APPLIED') {
        throw new ConflictException({
          code: 'IMPORT_NOT_APPLIED',
          message: `La importación está en estado "${importRow.status}"; solo se puede revertir una importación "APPLIED".`,
        });
      }

      await client.query(
        `UPDATE curricular_contents
         SET status = 'ARCHIVED', archived_at = now()
         WHERE id IN (
           SELECT curricular_content_id FROM curricular_import_rows
           WHERE curricular_import_id = $1 AND curricular_content_id IS NOT NULL
         );`,
        [id],
      );

      await client.query(
        `UPDATE curricular_imports SET status = 'REVERTED', reverted_at = now() WHERE id = $1;`,
        [id],
      );

      await client.query('COMMIT');
      return this.getImport(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private resolveTaxonomyIds(
    taxonomy: Taxonomy,
    raw: Record<string, string>,
  ): {
    componentId: string;
    orientationId: string | null;
    areaId: string;
    subjectId: string;
    axisId: string;
  } {
    const component = taxonomy.components.get(raw.component_code ?? '');
    const area = taxonomy.areas.get(raw.area_code ?? '');
    const subject = taxonomy.subjects.get(raw.subject_code ?? '');
    const axis = taxonomy.axes.get(raw.axis_code ?? '');
    const orientation = raw.orientation_code
      ? taxonomy.orientations.get(raw.orientation_code)
      : undefined;

    if (!component || !area || !subject || !axis) {
      // No debería ocurrir: las filas VALID ya pasaron esta misma resolución
      // en createImport. Si la taxonomía cambió entre el preview y el
      // confirm, se prefiere fallar fuerte antes que confirmar con datos
      // inconsistentes.
      throw new ConflictException({
        code: 'TAXONOMY_CHANGED',
        message:
          'La taxonomía cambió entre la previsualización y la confirmación de la importación.',
      });
    }

    return {
      componentId: component,
      orientationId: orientation?.id ?? null,
      areaId: area,
      subjectId: subject.id,
      axisId: axis.id,
    };
  }

  private prepareRows(
    csvRows: CurricularImportCsvRow[],
    taxonomy: Taxonomy,
    existingCodes: Set<string>,
  ): PreparedRow[] {
    const seenCodes = new Set<string>();

    return csvRows.map((raw, index) => {
      const rowNumber = index + 1;
      const errors: string[] = [];

      const component = taxonomy.components.get(raw.component_code);
      if (!raw.component_code) errors.push('component_code es obligatorio.');
      else if (!component) errors.push(`component_code "${raw.component_code}" no existe.`);

      const area = taxonomy.areas.get(raw.area_code);
      if (!raw.area_code) errors.push('area_code es obligatorio.');
      else if (!area) errors.push(`area_code "${raw.area_code}" no existe.`);

      const subject = taxonomy.subjects.get(raw.subject_code);
      if (!raw.subject_code) errors.push('subject_code es obligatorio.');
      else if (!subject) errors.push(`subject_code "${raw.subject_code}" no existe.`);
      else if (raw.area_code && subject.areaCode !== raw.area_code) {
        errors.push(`subject_code "${raw.subject_code}" no pertenece al área "${raw.area_code}".`);
      }

      const axis = taxonomy.axes.get(raw.axis_code);
      if (!raw.axis_code) errors.push('axis_code es obligatorio.');
      else if (!axis) errors.push(`axis_code "${raw.axis_code}" no existe.`);
      else if (raw.subject_code && axis.subjectCode !== raw.subject_code) {
        errors.push(
          `axis_code "${raw.axis_code}" no pertenece a la materia "${raw.subject_code}".`,
        );
      }

      if (raw.orientation_code) {
        const orientation = taxonomy.orientations.get(raw.orientation_code);
        if (!orientation) {
          errors.push(`orientation_code "${raw.orientation_code}" no existe.`);
        } else if (raw.component_code && orientation.componentCode !== raw.component_code) {
          errors.push(
            `orientation_code "${raw.orientation_code}" no pertenece al componente "${raw.component_code}".`,
          );
        }
      }

      if (!raw.code) errors.push('code es obligatorio.');
      if (!raw.content_text) errors.push('content_text es obligatorio.');

      let status: PreparedRow['status'] = errors.length > 0 ? 'INVALID' : 'VALID';

      if (status === 'VALID' && raw.code) {
        if (seenCodes.has(raw.code) || existingCodes.has(raw.code)) {
          status = 'DUPLICATE';
          errors.push(
            seenCodes.has(raw.code)
              ? `code "${raw.code}" está repetido dentro de este mismo archivo.`
              : `code "${raw.code}" ya existe en el catálogo para esta fuente (source_version).`,
          );
        }
        seenCodes.add(raw.code);
      }

      return {
        rowNumber,
        raw,
        status,
        errors,
        componentId: component,
        areaId: area,
        subjectId: subject?.id,
        axisId: axis?.id,
      };
    });
  }

  private async loadTaxonomy(db: Pool | PoolClient): Promise<Taxonomy> {
    // Consultas secuenciales a propósito: `db` puede ser un único PoolClient
    // dentro de una transacción (BEGIN/COMMIT), y una sola conexión de `pg`
    // no admite queries concurrentes (Promise.all) de forma segura.
    const components = await db.query<{ code: string; id: string }>(
      'SELECT code, id FROM components;',
    );
    const orientations = await db.query<{
      code: string;
      id: string;
      component_code: string;
    }>(
      `SELECT o.code, o.id, c.code AS component_code FROM orientations o
       JOIN components c ON c.id = o.component_id;`,
    );
    const areas = await db.query<{ code: string; id: string }>('SELECT code, id FROM areas;');
    const subjects = await db.query<TaxonomyRow>(
      `SELECT s.code, s.id, a.code AS parent_code FROM subjects s
       JOIN areas a ON a.id = s.area_id;`,
    );
    const axes = await db.query<TaxonomyRow>(
      `SELECT ax.code, ax.id, s.code AS parent_code FROM axes ax
       JOIN subjects s ON s.id = ax.subject_id;`,
    );

    return {
      components: new Map(components.rows.map((r) => [r.code, r.id])),
      orientations: new Map(
        orientations.rows.map((r) => [r.code, { id: r.id, componentCode: r.component_code }]),
      ),
      areas: new Map(areas.rows.map((r) => [r.code, r.id])),
      subjects: new Map(
        subjects.rows.map((r) => [r.code, { id: r.id, areaCode: r.parent_code ?? '' }]),
      ),
      axes: new Map(axes.rows.map((r) => [r.code, { id: r.id, subjectCode: r.parent_code ?? '' }])),
    };
  }

  private async loadExistingCodes(
    db: Pool | PoolClient,
    sourceVersion: string,
    codes: string[],
  ): Promise<Set<string>> {
    if (codes.length === 0) return new Set();
    const result = await db.query<{ code: string }>(
      `SELECT code FROM curricular_contents WHERE source_version = $1 AND code = ANY($2::text[]);`,
      [sourceVersion, codes],
    );
    return new Set(result.rows.map((r) => r.code));
  }

  private async requireImport(db: Pool | PoolClient, id: string): Promise<ImportRecord> {
    const result = await db.query<ImportRecord>('SELECT * FROM curricular_imports WHERE id = $1;', [
      id,
    ]);
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: 'CURRICULAR_IMPORT_NOT_FOUND',
        message: `No existe una importación con id "${id}".`,
      });
    }
    return row;
  }

  private toSummary(importRow: ImportRecord, rows: ImportRow[]): CurricularImportSummary {
    return {
      id: importRow.id,
      schoolId: importRow.school_id,
      sourceName: importRow.source_name,
      sourceVersion: importRow.source_version,
      status: importRow.status,
      importedBy: importRow.imported_by,
      createdAt: new Date(importRow.created_at).toISOString(),
      revertedAt: importRow.reverted_at ? new Date(importRow.reverted_at).toISOString() : null,
      rows: rows.map((row): CurricularImportRowSummary => ({
        id: row.id,
        rowNumber: row.row_number,
        status: row.status,
        rawData: row.raw_data_json,
        validationErrors: row.validation_errors_json,
        curricularContentId: row.curricular_content_id,
      })),
    };
  }
}
