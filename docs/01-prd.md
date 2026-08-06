# PRD — Plataforma PCI

## Objetivo

Construir una única plataforma web para diseñar, validar, simular, implementar, revisar y versionar el Proyecto Curricular Institucional.

## Alcance funcional

La plataforma debe incluir:

- Formación General y Formación Orientada.
- Diez cuatrimestres organizados en cinco niveles anuales.
- Bolsa administrable de contenidos.
- Agrupamientos obligatorios, electivos y formatos curriculares.
- Carga horaria validada por cuatrimestre.
- Mapa Curricular Institucional.
- Matriz de Trazabilidad Curricular.
- Simulación previa de movimientos.
- Motor de validación con errores, advertencias y recomendaciones.
- Versionado, publicación y bitácora institucional.
- Roles y permisos.
- Informes, impresión y exportación.

## Requisitos críticos

- La matriz histórica debe conservar su lógica funcional dentro de la nueva arquitectura.
- Una versión publicada no puede modificarse.
- El Proyecto de Vinculación con el Futuro ocupa C9 y C10, es anual y no genera horas nuevas.
- La Formación Orientada valida exactamente tres talleres y tres laboratorios.
- Las horas se validan de forma independiente por cuatrimestre.
- Los contenidos retirados se archivan sin destruir trazabilidad.
- La Escuela 4 debe migrarse conservando sus datos.

## Estados del PCI

1. Borrador.
2. En construcción.
3. Validado.
4. Publicado.

## Roles

- Administrador curricular.
- Asesor o constructor.
- Equipo directivo.
- Lector o supervisor.

## Criterio de finalización

Un módulo no se considera terminado si solo presenta datos ficticios, cálculos simulados sin persistencia o flujos incompletos.
