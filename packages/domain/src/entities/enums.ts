/** Espejo de los tipos ENUM definidos en database/migrations (pci_status). */
export const PCI_STATUSES = ['DRAFT', 'IN_PROGRESS', 'VALIDATED', 'PUBLISHED'] as const;
export type PciStatus = (typeof PCI_STATUSES)[number];

/** Espejo de record_status. */
export const RECORD_STATUSES = ['ACTIVE', 'ARCHIVED', 'INACTIVE'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/** Espejo de rule_severity. */
export const RULE_SEVERITIES = ['ERROR', 'WARNING', 'RECOMMENDATION'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

/** Espejo de curricular_spaces.space_type (docs/03-modelo-dominio.md). */
export const SPACE_TYPES = ['AUTONOMO', 'INTEGRADO', 'ARTICULADOR'] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

/** Espejo de curricular_spaces.format_type (docs/03-modelo-dominio.md: 8 formatos). */
export const FORMAT_TYPES = [
  'NIVEL',
  'LABORATORIO',
  'TALLER',
  'SEMINARIO',
  'PROYECTO',
  'PROYECTO_SOCIOCOMUNITARIO_SOLIDARIO',
  'ORIENTACION',
  'PROYECTO_VINCULACION_FUTURO',
] as const;
export type FormatType = (typeof FORMAT_TYPES)[number];

/** Espejo de curricular_spaces.character_type. */
export const CHARACTER_TYPES = ['OBLIGATORIO', 'ELECTIVO'] as const;
export type CharacterType = (typeof CHARACTER_TYPES)[number];
