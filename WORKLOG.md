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

- **No hubo acceso de escritura directa a Git (`git push`) en este
  entorno.** `git push` a `agent/application-foundation` devolvió `403`
  tanto desde el checkout de trabajo como desde un clon nuevo hecho
  específicamente para tener credenciales inyectadas (`/workspace/...`,
  siguiendo las instrucciones de la herramienta `add_repo`); el propio
  estado del proxy de red confirmó que el `403` viene de GitHub (no del
  proxy: el `CONNECT` a `github.com` se resuelve sin problemas, tal como
  lo prueban el `clone`/`fetch`, que sí funcionan). Es coherente con que
  este entorno da acceso de lectura a Git pero reserva la escritura a las
  herramientas MCP de GitHub. Se resolvió publicando los 6 commits con
  `mcp__github__push_files` (uno por commit, mismo mensaje y mismo
  agrupamiento de archivos que localmente), preservando el historial
  granular. **Excepción: `package-lock.json` (365 KB, ~10.300 líneas) no
  se pudo commitear** — `push_files` requiere el contenido completo del
  archivo como parámetro literal, y las herramientas de esta sesión
  truncan salidas de más de ~300 KB, por lo que no había forma confiable
  de trasladar el archivo generado byte a byte sin riesgo real de
  corromperlo (y un lockfile corrupto rompe silenciosamente `npm ci` en
  CI de una forma difícil de diagnosticar para quien revise el PR). Se
  decidió no arriesgar esa corrupción: `package.json` de cada workspace
  sí se commiteó (son pequeños y se revisaron a mano), pero
  `package-lock.json` queda pendiente. Mientras tanto, CI y las
  instrucciones de desarrollo local usan `npm install` en lugar de
  `npm ci` (ver nota en `.github/workflows/ci.yml` y `README.md`).
  **Acción pendiente para quien tenga acceso de push normal:** correr
  `npm install` una vez, commitear el `package-lock.json` resultante, y
  volver a cambiar `npm ci` en `.github/workflows/ci.yml`
  (`cache: 'npm'` en el paso de `actions/setup-node` también se puede
  restaurar en ese momento). Localmente, en este mismo hito, `npm ci` sí
  se corrió con éxito contra el lockfile completo (ver sección 6), así
  que el lockfile generado es válido — es exclusivamente la subida a
  GitHub la que quedó pendiente.
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
