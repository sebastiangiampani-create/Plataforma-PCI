# Importador curricular reversible (Fase 3)

Implementa `curricular_imports`/`curricular_import_rows`
(`docs/05-modelo-datos.md`) y el punto del roadmap "Importación reversible"
(`docs/04-roadmap.md`, Fase 3; `docs/02-arquitectura.md`).

## Formato de entrada

Esta primera versión soporta **CSV** (no `.xlsx` todavía — queda pendiente).
El cliente envía el contenido del CSV como texto plano en el body de la
petición, no como archivo binario adjunto: quien construya la UI de carga
puede leer el archivo local y mandar su contenido como texto.

Columnas obligatorias (encabezado exacto, cualquier orden):

| Columna            | Obligatoria | Descripción                                                                 |
| ------------------ | :---------: | ----------------------------------------------------------------------------|
| `component_code`   | sí          | Código de `components` (`FORMACION_GENERAL` / `FORMACION_ORIENTADA`).       |
| `orientation_code` | no          | Código de `orientations`. Vacío para Formación General.                     |
| `area_code`        | sí          | Código de `areas`.                                                          |
| `subject_code`     | sí          | Código de `subjects`; debe pertenecer al `area_code` de la misma fila.      |
| `axis_code`        | sí          | Código de `axes`; debe pertenecer al `subject_code` de la misma fila.       |
| `code`             | sí          | Identificador estable del contenido (se guarda tal cual en `curricular_contents.code`). |
| `content_text`     | sí          | Texto del contenido curricular.                                             |

`database/seeds/0005_curricular_taxonomy_formacion_general.sql` ya sembró la
taxonomía real de Formación General con estos códigos; se puede usar como
ejemplo real de valores válidos.

## Flujo (previsualización → confirmación → reversión)

1. **`POST /curricular-imports`** — sube el CSV, lo parsea y valida cada
   fila sin escribir en `curricular_contents` todavía. Crea la importación
   en estado `PREVIEW` con una fila en `curricular_import_rows` por cada
   fila del CSV, cada una con su propio estado:
   - `VALID`: pasa todas las validaciones y no es un duplicado.
   - `INVALID`: falta un campo obligatorio, o un código (`area_code`,
     `subject_code`, `axis_code`, `component_code`, `orientation_code`) no
     existe o no respeta la jerarquía real (ej. una materia que no
     pertenece al área declarada en la misma fila).
   - `DUPLICATE`: el `code` ya existe en `curricular_contents` con el mismo
     `source_version`, o está repetido más de una vez dentro del mismo CSV.
2. **`GET /curricular-imports/:id`** — previsualización completa: la
   importación y el detalle de cada fila con su estado y sus errores.
3. **`POST /curricular-imports/:id/confirm`** — solo permitido si la
   importación está en `PREVIEW`. Crea un `curricular_contents` real por
   cada fila `VALID` (con `source_version` igual al de la importación) y
   marca esas filas como `IMPORTED`. Las filas `INVALID`/`DUPLICATE` quedan
   registradas pero no se importan — **es una confirmación parcial**, no
   todo o nada: se prioriza poder cargar lo válido de un archivo grande sin
   que un error en una fila bloquee el resto. La importación pasa a
   `APPLIED`.
4. **`POST /curricular-imports/:id/revert`** — solo permitido si la
   importación está `APPLIED`. Archiva (`status = 'ARCHIVED'`,
   `archived_at = now()`) los `curricular_contents` creados por esa
   importación — **no los borra** (principio PCI-IMP-001: "Archivar
   contenidos no elimina asignaciones históricas"). La importación pasa a
   `REVERTED` y no se puede volver a confirmar ni revertir.
5. **`GET /curricular-imports`** — lista todas las importaciones (filtrable
   por `schoolId`) con conteos por estado de fila, para ver de un vistazo
   el historial.

## Decisiones de alcance (para no inventar más de lo pedido)

- **Solo CSV, no `.xlsx`**: el roadmap pide "Excel/CSV"; se implementó CSV
  primero para no sumar una dependencia de parseo de Excel sin uso
  confirmado todavía. `.xlsx` queda como trabajo pendiente explícito.
- **Detección de duplicados por código, no por similitud de texto**: se
  detecta el mismo `code` repetido (dentro del archivo o contra la base),
  no contenidos con texto parecido bajo un código distinto. Una detección
  de duplicados "difusa" (fuzzy matching) queda fuera de este alcance.
- **La taxonomía (`area_code`/`subject_code`/`axis_code`/`component_code`/
  `orientation_code`) debe existir de antemano**: el importador no crea
  áreas/materias/ejes nuevos automáticamente a partir del CSV. Si el CSV
  referencia un código que no existe, la fila queda `INVALID` en vez de
  inventar una entrada nueva en la taxonomía.
- **Confirmación parcial, no transaccional para todo el archivo**: se
  decidió así (ver punto 3 arriba) en vez de exigir que el 100% de las
  filas sean válidas para poder confirmar.

## Pendiente

- Soporte de `.xlsx` además de CSV.
- UI web para subir el archivo, ver la previsualización y confirmar/revertir
  (por ahora es solo API).
- Los tests cubren el flujo con Formación General; falta ejercitarlo con
  filas de Formación Orientada (`orientation_code` no vacío) una vez que
  existan orientaciones reales sembradas.
