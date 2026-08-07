CREATE TABLE validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  severity rule_severity NOT NULL,
  rule_version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  configuration_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pci_version_id UUID NOT NULL REFERENCES pci_versions(id) ON DELETE CASCADE,
  validation_rule_id UUID NOT NULL REFERENCES validation_rules(id),
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  message TEXT NOT NULL,
  cause TEXT,
  impact TEXT,
  suggested_action TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pci_version_id UUID NOT NULL REFERENCES pci_versions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  proposed_change_json JSONB NOT NULL,
  impact_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  pci_project_id UUID NOT NULL REFERENCES pci_projects(id),
  pci_version_id UUID REFERENCES pci_versions(id),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  reason TEXT,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
