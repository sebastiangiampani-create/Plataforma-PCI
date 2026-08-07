import { parse } from 'csv-parse/sync';

export const CURRICULAR_IMPORT_CSV_COLUMNS = [
  'component_code',
  'orientation_code',
  'area_code',
  'subject_code',
  'axis_code',
  'code',
  'content_text',
] as const;

export type CurricularImportCsvColumn = (typeof CURRICULAR_IMPORT_CSV_COLUMNS)[number];

export type CurricularImportCsvRow = Record<CurricularImportCsvColumn, string>;

export class CsvFormatError extends Error {}

/**
 * Parsea la plantilla CSV del importador curricular (docs/10-importador-curricular.md).
 * Requiere fila de encabezado con exactamente estas columnas, en cualquier
 * orden. `orientation_code` puede quedar vacío (Formación General no tiene
 * orientación).
 */
export function parseCurricularImportCsv(csvContent: string): CurricularImportCsvRow[] {
  let records: Record<string, string>[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
  } catch (error) {
    throw new CsvFormatError(`No se pudo interpretar el CSV: ${(error as Error).message}`);
  }

  if (records.length === 0) {
    throw new CsvFormatError('El CSV no tiene filas de datos.');
  }

  const header = Object.keys(records[0] ?? {});
  const missing = CURRICULAR_IMPORT_CSV_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new CsvFormatError(`Faltan columnas obligatorias en el CSV: ${missing.join(', ')}.`);
  }

  return records.map((record) => {
    const row = {} as CurricularImportCsvRow;
    for (const column of CURRICULAR_IMPORT_CSV_COLUMNS) {
      row[column] = (record[column] ?? '').trim();
    }
    return row;
  });
}
