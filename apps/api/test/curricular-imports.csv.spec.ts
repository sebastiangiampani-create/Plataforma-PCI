import { CsvFormatError, parseCurricularImportCsv } from '../src/modules/curricular-imports/csv.js';

describe('parseCurricularImportCsv', () => {
  const HEADER =
    'component_code,orientation_code,area_code,subject_code,axis_code,code,content_text';

  it('parsea filas simples', () => {
    const rows = parseCurricularImportCsv(
      `${HEADER}\nFORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,EJE_1,c1,Texto simple`,
    );
    expect(rows).toEqual([
      {
        component_code: 'FORMACION_GENERAL',
        orientation_code: '',
        area_code: 'MATEMATICA',
        subject_code: 'MATEMATICA_MATEMATICA',
        axis_code: 'EJE_1',
        code: 'c1',
        content_text: 'Texto simple',
      },
    ]);
  });

  it('respeta comas y comillas embebidas en content_text', () => {
    const rows = parseCurricularImportCsv(
      `${HEADER}\nFORMACION_GENERAL,,MATEMATICA,MATEMATICA_MATEMATICA,EJE_1,c1,"Texto, con comas y ""comillas"""`,
    );
    expect(rows[0]?.content_text).toBe('Texto, con comas y "comillas"');
  });

  it('rechaza un CSV sin filas de datos', () => {
    expect(() => parseCurricularImportCsv(HEADER)).toThrow(CsvFormatError);
  });

  it('rechaza un CSV al que le faltan columnas obligatorias', () => {
    expect(() => parseCurricularImportCsv('a,b\n1,2')).toThrow(CsvFormatError);
  });
});
