/** Espejo de los tipos ENUM definidos en database/migrations (pci_status). */
export const PCI_STATUSES = ['DRAFT', 'IN_PROGRESS', 'VALIDATED', 'PUBLISHED'] as const;
export type PciStatus = (typeof PCI_STATUSES)[number];

/** Espejo de record_status. */
export const RECORD_STATUSES = ['ACTIVE', 'ARCHIVED', 'INACTIVE'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/** Espejo de rule_severity. */
export const RULE_SEVERITIES = ['ERROR', 'WARNING', 'RECOMMENDATION'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];
