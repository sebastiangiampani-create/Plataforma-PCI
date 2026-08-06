# Plataforma PCI

Motor vivo para diseñar, validar, simular, implementar, revisar y versionar el Proyecto Curricular Institucional.

## Estado

Proyecto en etapa de fundación (`v0.1.0`).

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

## Flujo de desarrollo

- `main`: versiones estables.
- `agent/*` y `feature/*`: trabajo aislado.
- Todo cambio se integra mediante pull request.
