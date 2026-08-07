import type { RecordStatus } from './enums.js';

/**
 * Contratos preparatorios del núcleo curricular (Formación General / Orientada).
 * No se implementa lógica de negocio sobre estas entidades durante Application
 * Foundation: solo se deja modelado el contrato para el siguiente hito
 * (docs/04-roadmap.md, Fase 4 en adelante).
 */

export type ComponentCode = 'FORMACION_GENERAL' | 'FORMACION_ORIENTADA';

export interface Component {
  id: string;
  code: ComponentCode;
  name: string;
  status: RecordStatus;
}

export interface Orientation {
  id: string;
  componentId: string;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface Area {
  id: string;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface Subject {
  id: string;
  areaId: string;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface Axis {
  id: string;
  subjectId: string;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface CurricularContent {
  id: string;
  componentId: string;
  orientationId: string | null;
  areaId: string;
  subjectId: string;
  axisId: string;
  code: string;
  contentText: string;
  sourceVersion: string | null;
  status: RecordStatus;
  archivedAt: string | null;
}

export type SpaceType = 'AUTONOMO' | 'INTEGRADO' | 'ARTICULADOR';

export type FormatType =
  | 'NIVEL'
  | 'LABORATORIO'
  | 'TALLER'
  | 'SEMINARIO'
  | 'PROYECTO'
  | 'PROYECTO_SOCIOCOMUNITARIO_SOLIDARIO'
  | 'ORIENTACION'
  | 'PROYECTO_VINCULACION_FUTURO';

export type CharacterType = 'OBLIGATORIO' | 'ELECTIVO';

export interface CurricularSpace {
  id: string;
  pciVersionId: string;
  componentId: string;
  orientationId: string | null;
  code: string;
  name: string;
  spaceType: SpaceType;
  formatType: FormatType;
  characterType: CharacterType;
  levelNumber: 1 | 2 | 3 | 4 | 5;
  startTerm: number;
  endTerm: number;
  objectives: string | null;
  problemContext: string | null;
  observations: string | null;
  status: RecordStatus;
}

export interface SpaceArea {
  id: string;
  curricularSpaceId: string;
  areaId: string;
  responsibilityText: string | null;
}

export interface ContentAssignment {
  id: string;
  curricularSpaceId: string;
  curricularContentId: string;
  coverageWeight: number;
  notes: string | null;
  createdAt: string;
}

export interface WeeklyHours {
  id: string;
  curricularSpaceId: string;
  termNumber: number;
  areaId: string;
  hours: number;
  sourceSpaceId: string | null;
}

export interface Articulation {
  id: string;
  articulatorSpaceId: string;
  sourceSpaceId: string;
  termNumber: number;
  contributedHours: number;
  responsibilities: string | null;
}

export type CurricularImportStatus = 'PREVIEW' | 'APPLIED' | 'REVERTED';

export interface CurricularImport {
  id: string;
  schoolId: string | null;
  sourceName: string;
  sourceVersion: string;
  status: CurricularImportStatus;
  importedBy: string;
  createdAt: string;
  revertedAt: string | null;
}

export type CurricularImportRowStatus = 'VALID' | 'INVALID' | 'DUPLICATE' | 'IMPORTED';

export interface CurricularImportRow {
  id: string;
  curricularImportId: string;
  rowNumber: number;
  curricularContentId: string | null;
  rawData: Record<string, string>;
  validationErrors: string[] | null;
  status: CurricularImportRowStatus;
}
