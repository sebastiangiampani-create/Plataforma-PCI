import type { RecordStatus } from './enums.js';

/** Institución que construye y publica sus propias versiones del PCI (docs/03-modelo-dominio.md). */
export interface School {
  id: string;
  code: string;
  name: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

/** Controla permisos para administrar, construir, consultar o supervisar (docs/01-prd.md). */
export interface Role {
  id: string;
  code: 'ADMIN_CURRICULAR' | 'ASESOR_CONSTRUCTOR' | 'EQUIPO_DIRECTIVO' | 'LECTOR_SUPERVISOR';
  name: string;
}

/** Relación N:M entre escuela, usuario y rol asignado dentro de esa escuela. */
export interface SchoolUser {
  schoolId: string;
  userId: string;
  roleId: string;
}
