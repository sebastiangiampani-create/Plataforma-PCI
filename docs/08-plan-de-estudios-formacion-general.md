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

## Pendiente

- Confirmar si esta tabla es Formación General completa o si faltan
  unidades curriculares que no llegaron a documentarse todavía.
- Conseguir la tabla equivalente de **Formación Orientada** (horas por
  orientación) — todavía no provista.
- Cuando ambas estén confirmadas completas, incorporar esta carga horaria
  al modelo de datos (`weekly_hours` u homólogo) como parte del hito de
  Formación General, en lugar de los `curricular_contents`/agrupamientos
  genéricos descritos en `docs/01-prd.md`.
