import type { PciStatus } from './enums.js';

export interface PciProject {
  id: string;
  schoolId: string;
  name: string;
  status: PciStatus;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Instantánea inmutable una vez publicada (docs/03-modelo-dominio.md). */
export interface PciVersion {
  id: string;
  pciProjectId: string;
  versionNumber: number;
  status: PciStatus;
  pedagogicalRationale: string | null;
  createdBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  publishedAt: string | null;
}
