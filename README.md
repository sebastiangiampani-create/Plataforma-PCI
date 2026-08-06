# Plataforma PCI

Motor vivo para diseñar, validar, simular, implementar, revisar y versionar el Proyecto Curricular Institucional.

## Estado

Proyecto en etapa de fundación (`v0.1.0`). El hito **Application Foundation**
dejó un monorepo ejecutable (API + web + base de datos + CI) sin
funcionalidad curricular todavía — ver
[docs/07-application-foundation.md](docs/07-application-foundation.md) y
[WORKLOG.md](WORKLOG.md).

## Propósito

La plataforma acompañará la construcción colectiva del PCI, preservará la memoria de las decisiones y garantizará la trazabilidad curricular.

## Principios no negociables

- Una sola aplicación y un solo modelo de datos.
- Sin iframes, launchers encadenados ni aplicaciones paralelas.
- Sin datos ficticios presentados como funcionalidad terminada.
- Persistencia, trazabilidad, validación y versionado desde el núcleo.
- Las versiones publicadas son inmutables.
- El repositorio estable `Matriz-PCI` no se modifica.

## Repositorios

- `Matriz-PCI`: referencia estable e histórica.
- `Matriz-PCI-Completa`: desarrollo previo conservado como antecedente.
- `Plataforma-PCI`: desarrollo oficial desde cero.

## Alcance inicial

La primera etapa dejará completamente operativa la Formación General y conservará la experiencia funcional de la matriz anterior dentro de una arquitectura unificada.

## Documentación

- [Visión](docs/00-vision.md)
- [PRD](docs/01-prd.md)
- [Arquitectura](docs/02-arquitectura.md)
- [Modelo de dominio](docs/03-modelo-dominio.md)
- [Roadmap](docs/04-roadmap.md)
- [Modelo de datos](docs/05-modelo-datos.md)
- [Rule engine](docs/06-rule-engine.md)
- [Application Foundation (arquitectura técnica del monorepo)](docs/07-application-foundation.md)

## Flujo de desarrollo

- `main`: versiones estables.
- `agent/*` y `feature/*`: trabajo aislado.
- Todo cambio se integra mediante pull request.

## Desarrollo local

Requisitos: Node.js 20–22, npm ≥ 10, y PostgreSQL 16 accesible (vía
`compose.yaml` con Docker, o una instancia local).

> **Nota temporal:** `package-lock.json` todavía no está commiteado (el
> entorno en el que se desarrolló este hito no tenía acceso de escritura a
> Git; ver `WORKLOG.md`, sección "Bloqueos"). Por eso se usa `npm install`
> aquí y en CI en lugar de `npm ci`. La primera persona con acceso de
> push debería correr `npm install`, commitear el `package-lock.json`
> resultante y volver a cambiar CI a `npm ci` para una instalación
> estrictamente reproducible.

```bash
# 1. Instalar dependencias de todo el monorepo
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Ajustar DATABASE_URL si no se usa compose.yaml

# 3. Levantar PostgreSQL local (requiere Docker)
docker compose up -d

# 4. Aplicar migraciones y sembrar datos de referencia
npm run db:migrate
npm run db:seed

# 5. Levantar API (NestJS, puerto 3000) y web (Vite, puerto 5173)
npm run dev
```

Si no hay Docker disponible, cualquier PostgreSQL 16 accesible sirve:
apuntar `DATABASE_URL` en `.env` a esa instancia y seguir desde el paso 4.

### Scripts principales (raíz del monorepo)

| Script                  | Qué hace                                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| `npm run dev`             | API + web en paralelo, con recarga en caliente.                          |
| `npm run build`            | Compila `packages/*` y luego `apps/api` y `apps/web` (Vite build).       |
| `npm run lint` / `lint:fix` | ESLint sobre todo el monorepo.                                          |
| `npm run format` / `format:check` | Prettier sobre todo el monorepo (excepto `*.md` y `database/schema.sql`, conservado como referencia histórica). |
| `npm run typecheck`       | `tsc --noEmit` en cada paquete/app (compila primero `packages/*`, que son dependencias de `apps/*`). |
| `npm test`                 | Tests de cada workspace (Vitest en `packages/*` y `apps/web`, Jest en `apps/api`). |
| `npm run db:migrate`       | Aplica migraciones pendientes de `database/migrations/` (idempotente).   |
| `npm run db:migrate:down`  | Revierte la última migración aplicada (agregar `-- --steps=N` para revertir varias — ver nota abajo). |
| `npm run db:migrate:status`| Muestra qué migraciones están aplicadas.                                 |
| `npm run db:seed`          | Ejecuta `database/seeds/*.sql` (idempotente).                            |

> Nota: `npm run db:migrate:down -- --steps=N` no reenvía el flag a través
> de dos niveles de `npm run`. Para revertir varias migraciones, ejecutar
> directamente `npm run migrate:down --workspace packages/database -- --steps=N`.

### Variables de entorno relevantes

Ver `.env.example` para la lista completa. Las más importantes:

- `DEV_AUTH_ENABLED`: habilita `POST /auth/dev-login`. Solo tiene efecto si
  `NODE_ENV=development`; fuera de ese entorno se fuerza a `false` sin
  importar el valor configurado (ver `packages/config`).
- `DATABASE_URL`: cadena de conexión PostgreSQL, compartida por
  `packages/database` y `apps/api`.
- `VITE_API_URL`: URL de la API que consume `apps/web` (variable de
  Vite, expuesta al cliente).

### Pruebas de integración de `packages/database`

Los tests de `packages/database` corren migraciones y seeds reales contra
PostgreSQL, en un esquema aislado y descartable por test (no se necesita
una base de datos separada). Usan `TEST_DATABASE_URL` (o `DATABASE_URL`
como respaldo); por defecto apuntan a
`postgres://pci_dev:pci_dev_password@localhost:5432/pci_dev`, que coincide
con las credenciales de `compose.yaml`.
