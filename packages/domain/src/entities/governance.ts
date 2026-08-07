import type { RuleSeverity } from './enums.js';

/** Regla curricular versionada y administrable (docs/06-rule-engine.md). */
export interface ValidationRule {
  id: string;
  code: string;
  name: string;
  severity: RuleSeverity;
  ruleVersion: number;
  active: boolean;
  configuration: Record<string, unknown>;
}

export interface ValidationResult {
  id: string;
  pciVersionId: string;
  validationRuleId: string;
  entityType: string;
  entityId: string | null;
  message: string;
  cause: string | null;
  impact: string | null;
  suggestedAction: string | null;
  resolvedAt: string | null;
}

export interface Simulation {
  id: string;
  pciVersionId: string;
  createdBy: string | null;
  status: 'OPEN' | 'CONFIRMED' | 'DISCARDED';
  proposedChange: Record<string, unknown>;
  impact: Record<string, unknown> | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  schoolId: string;
  pciProjectId: string;
  pciVersionId: string | null;
  userId: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: string;
}
