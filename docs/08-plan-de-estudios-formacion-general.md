# Plan de estudios — Formación General (fuente oficial de horas)

## Origen

Esta tabla fue provista directamente por la dirección del proyecto (Sebastián
Giampani) a partir del plan de estudios oficial de la institución. Es la
**fuente de verdad** para la carga horaria de Formación General — reemplaza
cualquier número supuesto o inferido en `docs/01-prd.md` o `docs/06-rule-engine.md`.

No se completa todavía el modelo de datos ni las migraciones con esta
información: queda documentada como referencia para el hito de Formación
General (Fase 4 del roadmap), cuando se implemente la carga horaria real.

## Convenciones

- **Nivel 1 a Nivel 5** corresponden a los 5 niveles anuales del proyecto
  (`docs/03-modelo-dominio.md`), cada uno cubriendo dos cuatrimestres
  consecutivos. La tabla original está expresada "por año"; se traspola
  1:1 a los niveles del proyecto.
- Cada celda es la carga en **horas cátedra semanales** de esa unidad
  curricular en ese nivel. Una celda vacía significa que la unidad
  curricular no se cursa en ese nivel.
- **Total Horas Plan** es la suma de las horas cátedra semanales de la
  unidad curricular a lo largo de los 5 niveles (no es el total de horas
  reloj del plan completo).
- Varias unidades curriculares "puntuales" (Filosofía, Economía, Biología,
  Físico-Química, Física, Química) son materias específicas dentro de
  áreas más amplias (p. ej. Ciencias Sociales, Ciencias Naturales) que se
  cursan solo en algunos niveles, no en los 5.

## Tabla — Formación General

| Unidad curricular            | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 | Nivel 5 | Total Horas Plan |
| ----------------------------- | :-----: | :-----: | :-----: | :-----: | :-----: | :---------------: |
| Lengua y Literatura            |    5    |    5    |    4    |    4    |    4    |         22         |
| Matemática                     |    5    |    5    |    4    |    4    |    4    |         22         |
| Lenguas Adicionales            |    4    |    4    |    3    |    3    |    3    |         17         |
| Educación Física               |    3    |    3    |    3    |    3    |    3    |         15         |
| Artes                          |    3    |    3    |    —    |    2    |    —    |          8         |
| Tecnología de la Información   |    2    |    2    |    2    |    2    |    —    |          8         |
| FEC                            |    2    |    2    |    2    |    2    |    —    |          8         |
| Geografía                      |    3    |    3    |    2    |    2    |    —    |         10         |
| Historia                       |    4    |    4    |    2    |    2    |    —    |         12         |
| Filosofía                      |    —    |    —    |    —    |    —    |    2    |          2         |
| Economía                       |    —    |    —    |    3    |    —    |    —    |          3         |
| Biología                       |    4    |    4    |    3    |    —    |    —    |         11         |
| Físico-Química                 |    —    |    —    |    4    |    —    |    —    |          4         |
| Física                         |    —    |    —    |    —    |    3    |    —    |          3         |
| Química                        |    —    |    —    |    —    |    —    |    4    |          4         |
| Tutoría                        |    1    |    1    |    —    |    —    |    —    |          2         |

## Enlace con la taxonomía real (Matriz-PCI)

Esta tabla ya está incorporada al modelo de datos como referencia tipada:
[`packages/domain/src/reference-data/formacion-general-plan.ts`](../packages/domain/src/reference-data/formacion-general-plan.ts)
(`FORMACION_GENERAL_PLAN`), enlazada por código de área/materia con la
taxonomía real sembrada en
[`database/seeds/0005_curricular_taxonomy_formacion_general.sql`](../database/seeds/0005_curricular_taxonomy_formacion_general.sql)
(extraída de la bolsa de contenidos auditada en `Matriz-PCI`, ver
`docs/09-auditoria-matriz-pci.md`). Cruzar ambas fuentes reveló dos huecos
reales que no se pueden resolver inventando datos:

- **Artes**: el plan de estudios da la carga horaria a nivel de área (3-3-—-2-—,
  total 8), pero la bolsa real divide Artes en 3 materias (Artes Visuales,
  Música, Teatro) sin indicar cómo se reparten esas horas entre ellas. Queda
  sin enlazar a una materia específica.
- **Tutoría**: tiene carga horaria en el plan de estudios (1-1-—-—-—, total 2)
  pero no tiene materia ni contenidos en la bolsa auditada de Matriz-PCI —
  esa bolsa no incluye Tutoría en absoluto. Queda sin área/materia asociada.
- **Educación Tecnológica**: es la situación inversa — existe como materia
  real en la bolsa de contenidos (dentro del área Tecnologías, con contenidos
  propios), pero no tiene fila en esta tabla de horas. Solo "Tecnología de la
  Información" (la otra materia de Tecnologías) tiene carga horaria
  documentada.

Todavía no se persiste esta carga horaria en `weekly_hours`: esa tabla está
asociada a un `curricular_space` real de una versión de PCI de una escuela
concreta, y ninguna escuela tiene todavía un proyecto PCI iniciado (Fase 5
del roadmap).

## Pendiente

- Resolver los tres huecos de la sección anterior (Artes por materia,
  Tutoría, Educación Tecnológica) con la fuente oficial, no por inferencia.
- Confirmar si esta tabla es Formación General completa o si faltan
  unidades curriculares que no llegaron a documentarse todavía.
- Conseguir la tabla equivalente de **Formación Orientada** (horas por
  orientación) — todavía no provista.
- Cuando un colegio inicie su primer proyecto PCI (Fase 5), usar
  `FORMACION_GENERAL_PLAN` para poblar `weekly_hours` de sus
  `curricular_spaces` reales de Formación General.
