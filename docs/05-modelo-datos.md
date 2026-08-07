# Modelo de datos inicial

## Objetivo

Definir un único esquema relacional capaz de sostener escuelas, versiones del PCI, contenidos, espacios curriculares, cargas horarias, cobertura, trazabilidad, simulaciones y bitácora sin depender del nombre visible de cada elemento.

## Principios

- Todos los identificadores centrales serán UUID.
- Las versiones publicadas serán inmutables.
- Los contenidos archivados conservarán sus relaciones históricas.
- Las horas se almacenarán por cuatrimestre y área aportante.
- La simulación operará sobre un estado temporal separado.
- La trazabilidad será bidireccional: contenido → espacio y espacio → contenido.

## Tablas núcleo

### schools

- id
- code
- name
- status
- created_at
- updated_at

### users

- id
- email
- display_name
- status
- created_at
- updated_at

### roles

- id
- code
- name

### school_users

- school_id
- user_id
- role_id

### pci_projects

- id
- school_id
- name
- status
- current_version_id
- created_at
- updated_at

### pci_versions

- id
- pci_project_id
- version_number
- status
- pedagogical_rationale
- created_by
- published_by
- created_at
- published_at

### components

- id
- code
- name
- type

### orientations

- id
- component_id
- code
- name
- status

### areas

- id
- code
- name
- status

### subjects

- id
- area_id
- code
- name
- status

### axes

- id
- subject_id
- code
- name
- status

### curricular_contents

- id
- component_id
- orientation_id nullable
- area_id
- subject_id
- axis_id
- code
- content_text
- status
- source_version
- archived_at

### curricular_spaces

- id
- pci_version_id
- component_id
- orientation_id nullable
- code
- name
- space_type
- format_type
- character_type
- level_number
- start_term
- end_term
- objectives
- problem_context
- observations
- status

### space_areas

- id
- curricular_space_id
- area_id
- responsibility_text

### content_assignments

- id
- curricular_space_id
- curricular_content_id
- coverage_weight
- notes
- created_at

### weekly_hours

- id
- curricular_space_id
- term_number
- area_id
- hours
- source_space_id nullable

### articulations

- id
- articulator_space_id
- source_space_id
- term_number
- contributed_hours
- responsibilities

### validation_rules

- id
- code
- name
- severity
- rule_version
- active
- configuration_json

### validation_results

- id
- pci_version_id
- validation_rule_id
- entity_type
- entity_id
- message
- cause
- impact
- suggested_action
- resolved_at

### simulations

- id
- pci_version_id
- created_by
- status
- proposed_change_json
- impact_json
- created_at
- confirmed_at

### audit_log

- id
- school_id
- pci_project_id
- pci_version_id nullable
- user_id
- action_type
- entity_type
- entity_id
- reason
- before_json
- after_json
- created_at

### curricular_imports

- id
- school_id nullable
- source_name
- source_version
- status
- imported_by
- created_at
- reverted_at

### curricular_import_rows

- id
- curricular_import_id
- row_number
- curricular_content_id nullable
- raw_data_json
- validation_errors_json
- status

## Restricciones principales

- `schools.code` debe ser único.
- `curricular_contents.code` debe ser único dentro de su fuente curricular.
- `pci_versions` debe tener un número único por PCI.
- Una versión publicada no admite actualizaciones de contenido.
- `weekly_hours.term_number` solo admite valores de 1 a 10.
- `curricular_spaces.level_number` solo admite valores de 1 a 5.
- `start_term` no puede ser mayor que `end_term`.
- El Proyecto de Vinculación con el Futuro debe ocupar C9 y C10.
- Una articulación no puede producir horas adicionales fuera de las aportadas por sus espacios de origen.

## Próximos artefactos

1. Diagrama entidad–relación.
2. Esquema SQL inicial.
3. Migración `0001_core_schema`.
4. Datos semilla para roles, estados, componentes y cuatrimestres.
5. Pruebas de restricciones e invariantes.
