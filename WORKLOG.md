# WORKLOG — Application Foundation

Rama: `agent/application-foundation` · Base: `agent/project-foundation`
Repositorio: `sebastiangiampani-create/Plataforma-PCI`

## 1. Alcance de este hito

Construir la base ejecutable del monorepo (monorepo TypeScript, API,
web, base de datos, CI, documentación) descrita en `AGENTS.md` y el PRD.
No se implementó funcionalidad curricular (Formación General/Orientada,
bolsa de contenidos, mapa curricular, etc.): eso queda para el próximo
hito, con el modelo de datos y los contratos de dominio ya preparados
para sostenerla.

## 2. Trabajo preliminar

- Se inspeccionaron las ramas remotas: `agent/project-foundation` y
  `agent/application-foundation` ya existían en el repositorio remoto.
  `agent/application-foundation` resultó ser un descendiente directo de
  `agent/project-foundation` (agrega únicamente `AGENTS.md`), lo que
  confirmó la relación base/trabajo indicada tanto en `AGENTS.md` como en
  la segunda mitad del PRD recibido (la primera mitad del mensaje tenía
  una indicación de ramas ambigua/contradictoria con el resto; se siguió
  la versión consistente con el estado real del repositorio y repetida
  tres veces en el PRD: rama de trabajo `agent/application-foundation`,
  base y destino del PR `agent/project-foundation`).
- Se leyeron completos `AGENTS.md`, `README.md`, todo `docs/` y
  `database/schema.sql` antes de escribir código.
- No se modificó `main`, `agent/project-foundation`, ni los repositorios
  históricos (`Matriz-PCI`, `Matriz-PCI-Completa`) — no se los tocó en
  absoluto durante este hito.

## 3. Archivos creados (resumen por área)

- **Raíz**: `package.json` (workspaces npm), `tsconfig.base.json`,
  `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`,
  `.env.example`, `compose.yaml`.
- **`packages/config`**: validación de entorno con Zod (`api-config.ts`,
  `database-config.ts`, `web-config.ts`), con tests.
- **`packages/domain`**: entidades/tipos que reflejan el esquema (Escuela,
  Usuario, Rol, PCI, componentes curriculares, etc.), contratos Zod
  compartidos entre `apps/api` y `apps/web`, y una única regla curricular
  pura implementada (`term-level.ts`, PCI-STR-001/002 — mapeo nivel ↔
  cuatrimestres), con tests. El resto de las reglas de
  `docs/06-rule-engine.md` quedan registradas como datos administrables
  (seed `validation_rules`), no como código, porque el motor de
  evaluación no se construye en este hito.
- **`packages/database`**: cliente PostgreSQL (`pool.ts`), runner de
  migraciones con checksums y rollback (`migration-runner.ts`), runner de
  seeds idempotente (`seed-runner.ts`), CLIs (`cli/migrate.ts`,
  `cli/seed.ts`). Tests de integración reales contra PostgreSQL (esquema
  aislado por test, sin necesitar una base separada).
- **`database/migrations/0001..0009`**: el `schema.sql` heredado del hito
  anterior, convertido en 9 migraciones ordenadas por dominio, cada una
  con su `.down.sql`. `0009_dev_sessions` es una tabla nueva, de
  infraestructura técnica (no curricular), necesaria para persistir la
  sesión de desarrollo y la escuela activa — documentada como tal en el
  propio archivo SQL y en `docs/07-application-foundation.md`.
- **`database/seeds/0001..0004`**: roles, componentes, catálogo de
  `validation_rules` y las 4 escuelas explícitamente nombradas en el PRD.
- **`apps/api`**: NestJS con `GET /health` (chequea conexión real a la
  base), `POST /auth/dev-login` (solo si `DEV_AUTH_ENABLED=true` y
  `NODE_ENV=development`; `404` en cualquier otro caso), `GET /session`,
  `POST /session/school`, `GET /schools`. Filtro global de errores
  consistente, pipe de validación Zod, guard de sesión de desarrollo.
  Tests unitarios y un test e2e con `supertest`.
- **`apps/web`**: shell institucional responsive (React + Vite), login de
  desarrollo, selector de escuela con estados de carga/vacío/error,
  cliente API tipado contra los contratos de `@pci/domain`, persistencia
  de sesión en `localStorage` + base de datos. Sin módulos curriculares
  simulados.
- **`.github/workflows/ci.yml`**: instalación limpia, format check, lint,
  typecheck, migraciones (con verificación de idempotencia), seeds (con
  verificación de idempotencia), tests (con PostgreSQL real como servicio)
  y build.
- **`docs/07-application-foundation.md`**: arquitectura técnica de este
  hito (estructura del monorepo, motor de migraciones, autenticación de
  desarrollo, validación, manejo de errores).
- **`README.md`**: actualizado con instrucciones de desarrollo local
  reproducibles, tabla de scripts y variables de entorno relevantes.

## 4. Decisiones técnicas y por qué

- **Gestión del monorepo**: `npm workspaces` puro, sin Turborepo/Nx. Los
  paquetes internos (`config`, `domain`, `database`) deben compilarse
  antes que `apps/api`/`apps/web` puedan resolverlos (no se usan
  TypeScript project references en modo `-b`, para mantener el setup
  simple y predecible). Los scripts raíz encadenan esto automáticamente
  (`predev`, `prebuild`, `pretypecheck`, `pretest` corren `build:libs`).
- **ESM en todo el repo, salvo la ejecución de `apps/api` en desarrollo**:
  todos los paquetes son `"type": "module"` con `moduleResolution:
  NodeNext`. Para `apps/api` en desarrollo se usa `ts-node/esm` (no
  `tsx`) porque NestJS resuelve su inyección de dependencias vía
  `emitDecoratorMetadata`, que **esbuild (y por lo tanto `tsx`) no
  implementa** — usar `tsx` ahí rompería la inyección de dependencias en
  tiempo de ejecución de forma silenciosa. Esto se verificó arrancando la
  API real, no solo compilando.
- **Autenticación de desarrollo con persistencia real** (`dev_sessions`,
  ver `docs/07-application-foundation.md`): la alternativa (sesión solo
  en memoria del proceso de la API) no hubiera sobrevivido un reinicio ni
  hubiera permitido continuar el trabajo desde otra computadora, algo que
  la visión del producto pide explícitamente para el PCI en general y que
  se buscó respetar también en el mecanismo de sesión, aunque sea
  provisorio.
- **Migraciones divididas por dominio (9 archivos) en vez de una sola**:
  facilita revisar y revertir cambios de forma incremental más adelante,
  sin reescribir un único archivo monolítico.
- **`schema.sql` se conserva pero deja de ser la fuente de verdad**: se
  agregó una nota al inicio del archivo señalando que las migraciones son
  ahora lo ejecutable. No se borró contenido histórico.

## 5. Bug encontrado y corregido durante el desarrollo

`POST /session/school` respondía `400 Bad Request` ("schoolId: Required")
incluso enviando un body válido. Causa raíz: `@UsePipes(new
ZodValidationPipe(...))` estaba declarado **a nivel de método**, lo que en
NestJS aplica el pipe a *todos* los parámetros del handler — incluido
`@CurrentSession()`, que no tiene `schoolId`. El pipe fallaba validando la
sesión, no el body. Corrección: mover el pipe al parámetro
(`@Body(new ZodValidationPipe(schema))`) en `session.controller.ts` y
`auth.controller.ts`. Se agregó `apps/api/test/session.controller.e2e.spec.ts`
(monta la app real con `supertest`) para que esta clase de regresión no
pueda reaparecer sin que un test la detecte. Se encontró probando el flujo
manualmente contra PostgreSQL real (login → escuelas → seleccionar
escuela), no solo con los tests unitarios existentes.

También se corrigió un bug de aislamiento en los tests de
`packages/database`: dos consultas a `information_schema.columns` /
`information_schema.tables` en `migration-runner.test.ts` no filtraban por
`table_schema`, así que cuando `migration-runner.test.ts` y
`seed-runner.test.ts` corrían en paralelo (Vitest ejecuta archivos de test
distintos en paralelo por defecto), ambos esquemas aislados tenían una
tabla `widgets` simultáneamente y la consulta sin calificar devolvía
columnas de ambas. Se agregó `AND table_schema = current_schema()`;
verificado con 4 corridas consecutivas sin fallos tras la corrección
(antes fallaba de forma reproducible).

Un tercer detalle (no un bug, una corrección de higiene): el primer
`npm run lint:fix` convirtió automáticamente a `import type` los imports de
`SessionService`, `AuthService` y `SchoolsService` en 5 archivos de
`apps/api`, porque ESLint solo los ve referenciados en posiciones de tipo
(anotaciones de parámetros de constructor). Eso hubiera sido correcto en
código sin decoradores, pero en NestJS esos imports deben seguir siendo
imports de **valor**: la inyección de dependencias basada en tipo implícito
depende de que `emitDecoratorMetadata` capture la clase real en
`design:paramtypes`, algo que un `import type` (borrado por completo en el
JS emitido) rompe en silencio. Se revirtieron esos 5 archivos y se
deshabilitó la regla `@typescript-eslint/consistent-type-imports`
específicamente para `apps/api/src/**/*.ts` (ver comentario en
`eslint.config.js`).

## 6. Validaciones ejecutadas (todas reales, no simuladas)

Entorno: Node 22.22.2, npm 10.9.7, PostgreSQL 16.13 (servidor local del
contenedor de desarrollo — no había daemon de Docker disponible en este
entorno, ver sección de bloqueos). Todo se corrió tal cual, sin omitir
pasos:

| Validación | Resultado |
| --- | --- |
| `npm ci` / `npm install` (limpio) | OK — 684 paquetes instalados |
| `npm run format:check` | OK |
| `npm run lint` | OK (0 errores) |
| `npm run typecheck` | OK (`packages/config`, `packages/domain`, `packages/database`, `apps/api`, `apps/web`) |
| `npm test` | OK — 46 tests, 5 workspaces (10 config + 9 domain + 7 database + 13 api + 7 web) |
| `npm run build` | OK — compila los 5 workspaces; `apps/web` genera `dist/` con Vite |
| Migraciones sobre base limpia | OK — 9/9 aplicadas en orden, verificado con `\dt` |
| Segunda corrida de migraciones | OK — no-op (0 aplicadas, 9 "ya aplicadas") |
| Rollback completo (9 pasos) y reaplicación | OK — orden inverso correcto, esquema queda vacío salvo `schema_migrations`, luego reaplica sin error |
| Seeds corridos dos veces | OK — mismos 4/2/16/4 registros (roles/componentes/reglas/escuelas), sin duplicados |
| `GET /health` con base conectada | OK — `{"status":"ok","db":"ok",...}` |
| `GET /health` en modo `production` | OK — sigue funcionando (no depende de `DEV_AUTH_ENABLED`) |
| Arranque de la API | OK — todas las rutas mapeadas, sin errores de DI |
| Arranque de la web (Vite dev) | OK |
| Flujo de sesión de desarrollo completo (curl) | OK — dev-login → session → schools → select-school → session con `activeSchoolId` persistido |
| `POST /session/school` con escuela ajena | OK — `403 SCHOOL_ACCESS_DENIED` |
| `GET /schools` sin token | OK — `401 MISSING_SESSION_TOKEN` |
| `DEV_AUTH_ENABLED` fuera de `development` | OK — `404` en `/auth/dev-login` aunque la variable esté en `true` |
| Flujo completo en navegador real (Playwright + Chromium) | OK — login → selector de escuela → shell, recarga de página conserva sesión y escuela activa, layout responsive (375px) revisado visualmente |
| Ausencia de secretos | OK — sin `.env` commiteado, sin patrones de credenciales en el árbol versionado (`grep` dirigido) |
| Árbol de Git limpio (local, con los 6 commits) | OK |
| `npm ci` (instalación limpia y reproducible, contra el lockfile local completo) | OK — corrido al inicio del hito, 684 paquetes |

## 7. Bloqueos y cómo se resolvieron

- **BLOQUEO SIN RESOLVER: no fue posible publicar los commits en GitHub
  desde este entorno.** Se probaron los dos caminos disponibles y ambos
  fallaron:
  1. `git push` a `agent/application-foundation` devolvió `403` tanto
     desde el checkout de trabajo original como desde un clon nuevo hecho
     específicamente para tener credenciales inyectadas
     (`/workspace/plataforma-pci`, siguiendo las instrucciones de la
     herramienta `add_repo`). El estado del proxy de red confirmó que el
     `403` viene de GitHub, no del proxy (el `CONNECT` a `github.com` se
     resuelve sin problemas: `clone`/`fetch` funcionan bien en ambos
     lugares).
  2. `mcp__github__push_files` (la vía documentada para escribir en
     GitHub desde este entorno) devolvió:
     `failed to create tree: POST .../git/trees: 403 Resource not
     accessible by integration`. Esto indica que la integración/GitHub
     App de esta sesión no tiene permiso de escritura (`contents:
     write`) sobre este repositorio — es una restricción de
     autorización, no un problema técnico que se pueda resolver
     reintentando o cambiando de herramienta.

  Siguiendo la instrucción explícita para este caso ("no reintentar el
  mismo repo; comunicar el motivo exacto al usuario"), **se detuvo el
  intento de publicación**. Todo el trabajo del hito está completo,
  validado localmente (ver secciones 1–6) y commiteado en 7 commits
  locales sobre `agent/application-foundation` (los 6 originales más un
  ajuste de `npm ci` → `npm install`, ver más abajo), pero **no llegó al
  repositorio remoto**. Se necesita que alguien con acceso otorgue
  permiso de escritura sobre `sebastiangiampani-create/Plataforma-PCI` a
  la integración de GitHub de esta sesión (o publique estos commits por
  otra vía) para completar la apertura del Pull Request.

- **ACTUALIZACIÓN (resuelto):** cuando el permiso de escritura se
  arregló (ver más arriba), la publicación final se hizo con `git push`
  normal desde un clon con credenciales (no con `push_files`), así que
  `package-lock.json` (365 KB, ~10.300 líneas) **sí llegó completo al
  repositorio** — la limitación de tamaño era exclusiva de la API basada
  en parámetros de texto (`push_files`/`create_or_update_file`), no de
  `git push`, que transfiere objetos empaquetados sin ese límite. Se
  revirtió el workaround: CI y las instrucciones de desarrollo local
  vuelven a usar `npm ci` (instalación limpia y reproducible contra el
  lockfile commiteado), tal como se había validado localmente desde el
  principio (ver sección 6).
- **No había daemon de Docker disponible** en este entorno (`docker ps`
  falla: "no such file or directory" en el socket). `compose.yaml` está
  escrito y es correcto, pero no se pudo ejercitar `docker compose up`
  directamente aquí. Se usó en su lugar el servidor PostgreSQL 16 nativo
  ya instalado en el contenedor (mismo usuario/contraseña/base que define
  `compose.yaml`: `pci_dev` / `pci_dev_password` / `pci_dev`), lo que
  permitió correr **todas** las validaciones de base de datos contra
  PostgreSQL real, no simulado. El pipeline de CI sí usa un servicio
  `postgres:16-alpine` real (contenedor de GitHub Actions), así que
  `docker compose up` quedará ejercitado ahí en cada push.
- **Passthrough de argumentos con `npm run <script> --workspace X --
  --flag`** a través de dos niveles de `npm run` (el script raíz
  `db:migrate:down` invocando el script del workspace) no reenvía el flag
  correctamente — es una limitación conocida de npm con scripts anidados,
  no un bug del runner (se verificó invocando el mismo comando sin el
  nivel extra: funciona). Documentado en el README con la forma correcta
  de invocarlo directamente.

## 8. Riesgos conocidos / deuda técnica declarada

- La autenticación de desarrollo (`dev_sessions`) es explícitamente
  provisoria. No define roles reales más allá de un otorgamiento
  automático de `ADMIN_CURRICULAR` a todas las escuelas activas — correcto
  para probar el selector de escuela en este hito, pero deberá
  reemplazarse por un modelo de permisos real antes de exponer la
  plataforma fuera de desarrollo.
- `npm audit` reporta 14 vulnerabilidades (10 moderate, 3 high, 1
  critical) en dependencias transitivas de las herramientas de build/test
  (no se investigó cuáles paquetes puntuales ni si son explotables en este
  contexto). Pendiente de revisión antes de producción; no se corrió
  `npm audit fix --force` para no introducir cambios de versión no
  auditados en este hito.
- No se pudo ejercitar `docker compose up` en este entorno (ver sección 7).

## 9. Próximo hito recomendado

**Fase 3 (Base curricular administrable) o Fase 4 (Formación General)**
del roadmap (`docs/04-roadmap.md`), construyendo sobre el modelo de datos
y los contratos de dominio ya preparados en este hito:

- Importador Excel/CSV de la base curricular (plantilla, previsualización,
  detección de duplicados, importación reversible) — el modelo de datos ya
  previó `curricular_contents.source_version` para esto, pero faltan las
  tablas `curricular_imports`/`curricular_import_rows` mencionadas en
  `docs/05-modelo-datos.md` ("Próximos artefactos"), que no se crearon en
  este hito por no tener aún el flujo de importación que las use.
- Reconstrucción de la Formación General: bolsa de contenidos, filtros,
  selección múltiple, arrastre/asignación, agrupamientos obligatorios y
  electivos — auditando primero `Matriz-PCI` en modo lectura para no
  reinventar reglas que ya existen ahí (principio "no inventar reglas
  curriculares").

## 10. Trabajo posterior al cierre del hito

Sobre la misma rama/PR, después de que el hito quedó verde en CI:

- **Fix de reproducibilidad**: `db:migrate`/`db:seed` no tenían hook
  `predb:migrate`/`predb:seed` (a diferencia de `dev`/`build`/`typecheck`/
  `test`, que sí lo tienen), así que un checkout fresco fallaba con
  `ERR_MODULE_NOT_FOUND` al resolver `@pci/config/dist/index.js` desde
  `packages/database` si no se corría `build:libs` a mano primero
  (encontrado al migrar/sembrar en un Codespace recién clonado). Corregido
  agregando ambos hooks.
- **Auditoría de `Matriz-PCI` (solo lectura)** documentada en
  `docs/09-auditoria-matriz-pci.md`: arquitectura real (100% cliente,
  `localStorage`), configuración real de agrupamientos obligatorios
  (`CFG`), confirmación de que el reparto de grupos en cuatrimestres es
  una decisión manual de la escuela (no un reparto automático), ejemplo
  real de Escuela 4, y los 1155 contenidos reales de Formación General
  decodificados de sus archivos comprimidos (`docs/reference-data/`).
- **Plan de estudios oficial de Formación General**
  (`docs/08-plan-de-estudios-formacion-general.md`): tabla de horas
  cátedra semanales por nivel, provista directamente por la dirección del
  proyecto — reemplaza cualquier número supuesto en `docs/01-prd.md` o
  `docs/06-rule-engine.md`.
- **Taxonomía y bolsa de contenidos real de Formación General cargadas en
  la base**: `database/seeds/0005_curricular_taxonomy_formacion_general.sql`
  (8 áreas, 18 materias, 221 ejes) y
  `0006_curricular_contents_formacion_general.sql` (1155 contenidos),
  generados programáticamente a partir de
  `docs/reference-data/matriz-pci-formacion-general-contenidos.json` para
  evitar errores de transcripción manual en 1155 filas. Área → materia →
  eje es la jerarquía real encontrada en los datos (no inventada); el único
  choque de nombres de eje repetido entre dos materias (Artes Visuales /
  Teatro) se resolvió con códigos que incluyen la materia, no solo el eje.
  Verificado con datos reales: migraciones + seeds corridos dos veces
  seguidas contra PostgreSQL real sin duplicar filas, y conteo por área
  coincide exactamente con la tabla de `docs/09-auditoria-matriz-pci.md`.
- **`FORMACION_GENERAL_PLAN`** (`packages/domain/src/reference-data/
  formacion-general-plan.ts`): el plan de horas de `docs/08` como
  referencia tipada y validada con Zod, enlazada por código de área/materia
  con la taxonomía recién sembrada. **No se escribió en `weekly_hours`**:
  esa tabla depende de un `curricular_space` real de una versión de PCI de
  una escuela concreta, y ninguna escuela tiene todavía un proyecto PCI
  iniciado — crear uno de forma artificial solo para tener dónde guardar
  las horas hubiera violado el principio de no usar datos ficticios. Cruzar
  el plan de horas con la taxonomía real encontró tres huecos genuinos que
  se dejaron documentados en vez de resueltos por inferencia: la fila
  "Artes" del plan es un agregado de área (la bolsa real la divide en 3
  materias sin indicar el reparto), "Tutoría" tiene horas pero no aparece
  en la bolsa de contenidos, y "Educación Tecnológica" aparece en la bolsa
  pero no tiene fila de horas en el plan.
- **Tests nuevos, todos contra PostgreSQL real** (no simulados): 4 en
  `packages/domain` (integridad del plan: totales por nivel suman
  correctamente, 16 filas, notas presentes donde falta enlace, códigos de
  materia sin duplicados) y 4 en `packages/database` (cuenta exacta de
  1155 contenidos, distribución por área coincide con la auditoría, cada
  código de área/materia del plan existe realmente en la taxonomía
  sembrada, y los seeds corridos dos veces no duplican filas). Suite
  completa verificada de punta a punta en este entorno: `format:check`,
  `lint`, `typecheck`, `test` (54 tests, todos los workspaces) y `build`,
  todo verde.

## 11. Importador curricular reversible (Fase 3)

Detalle completo del diseño y sus decisiones de alcance en
`docs/10-importador-curricular.md`. Resumen:

- **Migración `0010_curricular_imports`**: crea `curricular_imports` y
  `curricular_import_rows`, documentadas en `docs/05-modelo-datos.md` desde
  el hito anterior pero nunca creadas. Rollback y reaplicación probados
  contra PostgreSQL real.
- **`apps/api/src/modules/curricular-imports`**: primer módulo de la API
  con lógica de negocio real (no solo CRUD). Parsea CSV (`csv-parse`, no un
  parser hecho a mano, para no fallar con comillas/comas embebidas en
  `content_text`), valida cada fila contra la taxonomía real ya sembrada
  (existencia y jerarquía: la materia debe pertenecer al área de la fila,
  el eje a la materia), detecta duplicados (mismo `code` repetido en el
  archivo o ya existente en `curricular_contents` con el mismo
  `source_version`), y expone el flujo completo: crear/previsualizar,
  listar, ver detalle, confirmar (importación parcial: solo se cargan las
  filas `VALID`) y revertir (archiva el contenido creado, no lo borra —
  PCI-IMP-001).
- **Zod en `@pci/domain`** (`contracts/curricular-imports.ts`) para
  request/response, siguiendo el patrón ya establecido en `contracts/schools.ts`.
- **Validado en tres niveles**: 5 tests de integración de
  `CurricularImportsService` contra PostgreSQL real (esquema aislado por
  test, igual que `packages/database`) cubriendo preview con
  válidos/inválidos/duplicados, confirmación parcial, reversión con
  archivado real y bloqueo de doble confirmación/reversión; 2 tests e2e HTTP
  del controller (incluyendo la regresión conocida del pipe de validación a
  nivel de parámetro, no de método); 4 tests unitarios del parser CSV.
  Además, flujo completo verificado con la API real corriendo y `curl`
  (dev-login → crear → confirmar → revertir), confirmando en la base que el
  contenido queda `ARCHIVED` (no borrado) tras revertir.
- Encontrado y corregido durante el desarrollo: `loadTaxonomy` hacía 5
  queries con `Promise.all` sobre una única conexión (`PoolClient`) dentro
  de una transacción — `pg` lo acepta mediante una API deprecada (avisa por
  consola) en vez de fallar, pero no es seguro; se cambió a queries
  secuenciales.
- Suite completa verificada de nuevo tras este cambio: `format:check`,
  `lint`, `typecheck`, `test` (65 tests, todos los workspaces) y `build`,
  todo verde.
