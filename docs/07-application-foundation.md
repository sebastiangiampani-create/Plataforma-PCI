# Application Foundation — arquitectura técnica

Este documento describe las decisiones técnicas del hito **Application
Foundation**: el monorepo ejecutable sobre el que se construirán los módulos
curriculares (Formación General, Formación Orientada, etc.) en los hitos
siguientes. No implementa funcionalidad curricular: solo deja la base
(monorepo, base de datos, API, web, CI) lista y verificada.

## Estructura del monorepo

```
apps/
  api/      NestJS (Express). API HTTP.
  web/      React + Vite. Shell institucional.
packages/
  config/   Validación de variables de entorno (Zod) para api/web/database.
  domain/   Entidades, tipos y contratos (Zod) compartidos entre api y web.
  database/ Cliente PostgreSQL, runner de migraciones y runner de seeds.
database/
  migrations/  Migraciones SQL ordenadas (pares *.up.sql / *.down.sql).
  seeds/       Seeds SQL idempotentes.
.github/workflows/ci.yml  Pipeline de verificación.
```

Gestión de workspaces: `npm workspaces` (sin herramienta de monorepo
adicional). `packages/config`, `packages/domain` y `packages/database` son
paquetes TypeScript compilados a `dist/` antes de ser consumidos por
`apps/api` y `apps/web` (ver `npm run build:libs` en el `package.json` raíz).
Esto es deliberado y simple: no se usan TypeScript project references en
modo `-b`, así que cada paquete debe compilarse antes de que otro que
depende de él pueda resolver sus tipos o su código. Los scripts raíz
(`dev`, `build`, `typecheck`, `test`) ya encadenan `build:libs` como
prerequisito (`predev`, `prebuild`, `pretypecheck`, `pretest`).

## Motor de migraciones (`packages/database`)

Cada migración es un par de archivos `NNNN_nombre.up.sql` /
`NNNN_nombre.down.sql` en `database/migrations/`. El runner
(`packages/database/src/migration-runner.ts`):

- Crea (si no existe) una tabla de seguimiento `schema_migrations` con
  `name`, `checksum` (SHA-256 del contenido de `.up.sql`) y `applied_at`.
- `runMigrationsUp`: aplica en orden alfabético las migraciones no
  registradas. Si una migración ya aplicada tiene un checksum distinto al
  registrado, aborta con error explícito (nunca reaplica en silencio). Si
  no hay cambios pendientes, es un no-op — correr `up` dos veces seguidas
  no vuelve a ejecutar SQL.
- `runMigrationsDown`: revierte las últimas N migraciones aplicadas, en
  orden inverso, ejecutando su `.down.sql`.
- Recibe una única conexión (`pg.Client` o `pg.PoolClient`, nunca un
  `pg.Pool` directamente), porque `BEGIN`/`COMMIT`/`ROLLBACK` deben ocurrir
  sobre la misma conexión física — un `Pool` no lo garantiza entre llamadas.

El esquema `database/schema.sql` original (del hito Project Foundation) se
conserva como referencia histórica, pero ya no es la fuente de verdad
ejecutable: se dividió en 9 migraciones ordenadas por dominio (extensiones y
enums, identidad y acceso, núcleo del PCI, taxonomía curricular, contenidos
y espacios, horas y articulaciones, validación/simulación/auditoría,
índices, y sesiones de desarrollo).

### Seeds

`database/seeds/*.sql` se ejecutan en orden alfabético. Cada seed es
idempotente por construcción (`INSERT ... ON CONFLICT DO NOTHING`), así que
correr `npm run db:seed` varias veces no duplica filas. Se sembraron datos
tomados literalmente de la documentación aprobada (no inventados):

- `roles`: los 4 roles de `docs/01-prd.md`.
- `components`: Formación General / Formación Orientada.
- `validation_rules`: las 16 reglas de `docs/06-rule-engine.md` (solo como
  metadatos administrables; el motor de evaluación no se implementa en
  este hito).
- `schools`: las 4 escuelas explícitamente listadas en el PRD (PCI-101 a
  PCI-404), con nombres provisorios editables por cada institución.

## Autenticación de desarrollo

`DEV_AUTH_ENABLED` habilita `POST /auth/dev-login`, un login sin contraseña
pensado exclusivamente para desarrollo local. `packages/config` **fuerza**
`DEV_AUTH_ENABLED=false` salvo que `NODE_ENV=development`, sin importar el
valor de la variable de entorno — así que no hay forma de dejarlo activo por
accidente en otro entorno. Cuando está deshabilitado, el endpoint responde
`404` (no `403`), para no revelar su existencia.

La sesión se persiste en una tabla `dev_sessions` (migración `0009`, no
forma parte del modelo curricular): token opaco, usuario, escuela activa
seleccionada y expiración. Esto es lo que permite que el selector de
escuela persista de verdad entre recargas de página y — en la práctica —
entre dispositivos que compartan la misma base de datos, no solo en
`localStorage` del navegador (que solo guarda el token).

Por conveniencia de desarrollo, `POST /auth/dev-login` otorga al usuario
recién creado (o existente) rol `ADMIN_CURRICULAR` sobre todas las escuelas
activas automáticamente, para que `GET /schools` tenga datos reales sin
necesidad de un seed manual por email. Este comportamiento es exclusivo del
modo de desarrollo y deberá revisarse cuando se defina la autenticación
definitiva.

## Validación de entrada

`packages/domain` define los contratos (`zod`) compartidos entre `apps/api`
y `apps/web`: `devLoginRequestSchema`, `selectSchoolRequestSchema`,
`sessionResponseSchema`, `schoolSummarySchema`, `apiErrorResponseSchema`. La
API los aplica con un `ZodValidationPipe` **a nivel de parámetro**
(`@Body(new ZodValidationPipe(schema))`), nunca con `@UsePipes` a nivel de
método: un pipe de método se aplica a *todos* los parámetros del handler,
incluido `@CurrentSession()`, lo que rompía la validación en
`POST /session/school` durante el desarrollo de este hito (ver
`WORKLOG.md` y el test de regresión
`apps/api/test/session.controller.e2e.spec.ts`).

## Errores consistentes

Todas las respuestas de error de la API tienen la forma
`{ "error": { "code", "message", "details"? } }`
(`apps/api/src/common/filters/http-exception.filter.ts`), consumida en el
cliente web vía `apiErrorResponseSchema`.

## Decisión pendiente de un hito posterior

La bolsa de contenidos, el mapa curricular, la trazabilidad, los
agrupamientos y el resto de las funciones históricas listadas en el PRD
**no se implementan en este hito**. El modelo de datos y los contratos de
dominio (`packages/domain`) ya están preparados para sostenerlas (ver
`docs/03-modelo-dominio.md`), pero construirlas con datos simulados en
Application Foundation violaría el principio de no presentar datos
ficticios como funcionalidad terminada.
