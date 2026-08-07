# Instrucciones operativas para agentes

## Repositorio y rama

- Repositorio: `sebastiangiampani-create/Plataforma-PCI`
- Rama de trabajo obligatoria: `agent/application-foundation`
- Rama base: `agent/project-foundation`
- No modificar `main`.
- No modificar `agent/project-foundation`.
- No reescribir historial ni usar `push --force`.

## Repositorios históricos

- `Matriz-PCI`: referencia estable e histórica. Solo lectura.
- `Matriz-PCI-Completa`: referencia secundaria. Solo lectura.
- No abrir PRs, no escribir archivos y no cambiar ramas en esos repositorios.
- No copiar código sin auditar previamente su función, persistencia, dependencias y licencias.

## Límites de seguridad

- No escribir en Supabase ni en bases de producción.
- No desplegar servicios públicos.
- No usar credenciales reales en archivos, commits, logs o pruebas.
- No usar `sudo`.
- No borrar archivos fuera del repositorio o de directorios temporales creados para pruebas.
- No ejecutar comandos destructivos sin una justificación explícita.
- No inventar horas, reglas curriculares ni datos oficiales.

## Objetivo actual

Completar el hito **Application Foundation** sobre la base documental y SQL existente.

## Entregables obligatorios

### Monorepo

Crear una estructura TypeScript con:

- `apps/web`: React + Vite.
- `apps/api`: NestJS.
- `packages/domain`: contratos, entidades, tipos y reglas puras.
- `packages/database`: conexión PostgreSQL, runner de migraciones y seeds.
- `packages/config`: validación de variables de entorno.

### Base de datos

- Reutilizar y revisar el esquema existente.
- Convertir la evolución del esquema en migraciones ordenadas e idempotentes.
- Incorporar seeds para roles, componentes, niveles, cuatrimestres y estados.
- Registrar migraciones aplicadas con checksum.
- Probar migración, repetición idempotente y rollback en PostgreSQL temporal.

### API

- Endpoint `GET /health`.
- Autenticación de desarrollo explícitamente controlada por variable de entorno.
- Endpoint de sesión.
- Consulta de escuelas accesibles.
- Selección de escuela activa.
- Manejo de errores consistente.
- Validación de entrada.

### Web

- Shell institucional responsive.
- Inicio de sesión de desarrollo.
- Selector de escuela.
- Estado de carga, vacío y error.
- Consumo tipado de la API.
- No incorporar todavía funcionalidades ficticias de Formación General.

### Infraestructura

- `compose.yaml` para PostgreSQL local.
- `.env.example` sin secretos.
- Scripts de desarrollo, build, lint, format, typecheck, tests, migraciones y seeds.
- README actualizado con instrucciones reproducibles.

### Calidad

Antes de cerrar el hito ejecutar y corregir:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

También validar:

- migraciones sobre base limpia;
- segunda ejecución sin cambios;
- seeds idempotentes;
- `GET /health` con base conectada;
- arranque de API y web;
- ausencia de secretos en el repositorio.

## Criterios de aceptación

El hito se considera completo solo si:

1. La instalación desde cero es reproducible.
2. La API y la web compilan y arrancan.
3. PostgreSQL se inicializa mediante migraciones y seeds.
4. La autenticación de desarrollo está desactivada por defecto fuera de desarrollo.
5. El selector de escuela funciona con datos persistidos.
6. Lint, typecheck, tests y build pasan.
7. No hay datos ficticios presentados como funcionalidad curricular terminada.
8. No se modificaron `main` ni los repositorios históricos.

## Estrategia de commits

Realizar commits pequeños y coherentes, por ejemplo:

1. `chore: initialize TypeScript monorepo`
2. `feat(database): add migration runner and reference seeds`
3. `feat(api): add health and development session endpoints`
4. `feat(web): add authenticated school selection shell`
5. `test: validate application foundation end to end`
6. `docs: document local development and worklog`

## Pull Request

Al finalizar:

- abrir PR en borrador desde `agent/application-foundation`;
- usar como base `agent/project-foundation`;
- incluir resumen, decisiones, pruebas, riesgos y pendientes;
- no hacer merge automáticamente.

## Continuidad automática

- Resolver problemas técnicos razonables sin pedir autorización.
- Si una tarea se bloquea, documentar el bloqueo y continuar con las demás.
- Detenerse únicamente ante una decisión funcional, curricular, de seguridad o de datos que no pueda inferirse del PRD.
- Mantener `WORKLOG.md` con avances, comandos de validación, commits y pendientes.
