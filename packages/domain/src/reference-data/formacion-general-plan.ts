import { z } from 'zod';

/**
 * Carga horaria oficial de Formación General, tal como fue provista por la
 * dirección del proyecto a partir del plan de estudios institucional (ver
 * docs/08-plan-de-estudios-formacion-general.md, fuente de verdad — no son
 * números inferidos ni supuestos).
 *
 * `areaCode`/`subjectCode` enlazan cada fila con la taxonomía real sembrada en
 * `database/seeds/0005_curricular_taxonomy_formacion_general.sql` (extraída a
 * su vez de la bolsa de contenidos auditada en Matriz-PCI, ver
 * docs/09-auditoria-matriz-pci.md). El enlace solo se completa cuando es
 * inequívoco: varias filas del plan de estudios no tienen una correspondencia
 * 1:1 clara con la taxonomía de Matriz-PCI (ver `note`), y se dejan sin
 * enlazar en vez de inventar una asociación.
 *
 * Esta tabla NO se persiste todavía en `weekly_hours`: esa tabla está
 * asociada a un `curricular_space` real de una versión de PCI de una
 * escuela concreta, y ninguna escuela tiene todavía un proyecto PCI iniciado
 * (Fase 5 del roadmap). Sirve como referencia tipada para cuando esa función
 * se implemente.
 */

export const formacionGeneralPlanEntrySchema = z.object({
  unidadCurricular: z.string(),
  areaCode: z.string().nullable(),
  subjectCode: z.string().nullable(),
  weeklyHoursByLevel: z.tuple([
    z.number().nonnegative().nullable(),
    z.number().nonnegative().nullable(),
    z.number().nonnegative().nullable(),
    z.number().nonnegative().nullable(),
    z.number().nonnegative().nullable(),
  ]),
  totalHoursPlan: z.number().nonnegative(),
  note: z.string().optional(),
});

export type FormacionGeneralPlanEntry = z.infer<typeof formacionGeneralPlanEntrySchema>;

export const FORMACION_GENERAL_PLAN: readonly FormacionGeneralPlanEntry[] = [
  {
    unidadCurricular: 'Lengua y Literatura',
    areaCode: 'LENGUA_Y_LITERATURA',
    subjectCode: 'LENGUA_Y_LITERATURA_LENGUA_Y_LITERATURA',
    weeklyHoursByLevel: [5, 5, 4, 4, 4],
    totalHoursPlan: 22,
  },
  {
    unidadCurricular: 'Matemática',
    areaCode: 'MATEMATICA',
    subjectCode: 'MATEMATICA_MATEMATICA',
    weeklyHoursByLevel: [5, 5, 4, 4, 4],
    totalHoursPlan: 22,
  },
  {
    unidadCurricular: 'Lenguas Adicionales',
    areaCode: 'LENGUAS_ADICIONALES',
    subjectCode: 'LENGUAS_ADICIONALES_LENGUAS_ADICIONALES',
    weeklyHoursByLevel: [4, 4, 3, 3, 3],
    totalHoursPlan: 17,
  },
  {
    unidadCurricular: 'Educación Física',
    areaCode: 'EDUCACION_FISICA',
    subjectCode: 'EDUCACION_FISICA_EDUCACION_FISICA',
    weeklyHoursByLevel: [3, 3, 3, 3, 3],
    totalHoursPlan: 15,
  },
  {
    unidadCurricular: 'Artes',
    areaCode: 'ARTES',
    subjectCode: null,
    weeklyHoursByLevel: [3, 3, null, 2, null],
    totalHoursPlan: 8,
    note: 'El plan de estudios da esta carga a nivel de área. La bolsa real de Matriz-PCI divide Artes en 3 materias (Artes Visuales, Música, Teatro); el plan de estudios no especifica cómo se reparten las horas entre ellas, así que no se enlaza a una materia específica.',
  },
  {
    unidadCurricular: 'Tecnología de la Información',
    areaCode: 'TECNOLOGIAS',
    subjectCode: 'TECNOLOGIAS_TECNOLOGIAS_DE_LA_INFORMACION',
    weeklyHoursByLevel: [2, 2, 2, 2, null],
    totalHoursPlan: 8,
  },
  {
    unidadCurricular: 'FEC',
    areaCode: 'CIENCIAS_SOCIALES',
    subjectCode: 'CIENCIAS_SOCIALES_FORMACION_ETICA_Y_CIUDADANA',
    weeklyHoursByLevel: [2, 2, 2, 2, null],
    totalHoursPlan: 8,
  },
  {
    unidadCurricular: 'Geografía',
    areaCode: 'CIENCIAS_SOCIALES',
    subjectCode: 'CIENCIAS_SOCIALES_GEOGRAFIA',
    weeklyHoursByLevel: [3, 3, 2, 2, null],
    totalHoursPlan: 10,
  },
  {
    unidadCurricular: 'Historia',
    areaCode: 'CIENCIAS_SOCIALES',
    subjectCode: 'CIENCIAS_SOCIALES_HISTORIA',
    weeklyHoursByLevel: [4, 4, 2, 2, null],
    totalHoursPlan: 12,
  },
  {
    unidadCurricular: 'Filosofía',
    areaCode: 'CIENCIAS_SOCIALES',
    subjectCode: 'CIENCIAS_SOCIALES_FILOSOFIA',
    weeklyHoursByLevel: [null, null, null, null, 2],
    totalHoursPlan: 2,
  },
  {
    unidadCurricular: 'Economía',
    areaCode: 'CIENCIAS_SOCIALES',
    subjectCode: 'CIENCIAS_SOCIALES_ECONOMIA',
    weeklyHoursByLevel: [null, null, 3, null, null],
    totalHoursPlan: 3,
  },
  {
    unidadCurricular: 'Biología',
    areaCode: 'CIENCIAS_NATURALES',
    subjectCode: 'CIENCIAS_NATURALES_BIOLOGIA',
    weeklyHoursByLevel: [4, 4, 3, null, null],
    totalHoursPlan: 11,
  },
  {
    unidadCurricular: 'Físico-Química',
    areaCode: 'CIENCIAS_NATURALES',
    subjectCode: 'CIENCIAS_NATURALES_FISICO_QUIMICA',
    weeklyHoursByLevel: [null, null, 4, null, null],
    totalHoursPlan: 4,
  },
  {
    unidadCurricular: 'Física',
    areaCode: 'CIENCIAS_NATURALES',
    subjectCode: 'CIENCIAS_NATURALES_FISICA',
    weeklyHoursByLevel: [null, null, null, 3, null],
    totalHoursPlan: 3,
  },
  {
    unidadCurricular: 'Química',
    areaCode: 'CIENCIAS_NATURALES',
    subjectCode: 'CIENCIAS_NATURALES_QUIMICA',
    weeklyHoursByLevel: [null, null, null, null, 4],
    totalHoursPlan: 4,
  },
  {
    unidadCurricular: 'Tutoría',
    areaCode: null,
    subjectCode: null,
    weeklyHoursByLevel: [1, 1, null, null, null],
    totalHoursPlan: 2,
    note: 'No tiene materia ni contenidos en la bolsa auditada de Matriz-PCI (docs/09-auditoria-matriz-pci.md): esa bolsa no incluye Tutoría. Queda sin área/materia asociada hasta confirmar su tratamiento curricular.',
  },
] as const;

for (const entry of FORMACION_GENERAL_PLAN) {
  formacionGeneralPlanEntrySchema.parse(entry);
}
