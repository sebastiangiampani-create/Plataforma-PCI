CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE pci_status AS ENUM ('DRAFT','IN_PROGRESS','VALIDATED','PUBLISHED');
CREATE TYPE record_status AS ENUM ('ACTIVE','ARCHIVED','INACTIVE');
CREATE TYPE rule_severity AS ENUM ('ERROR','WARNING','RECOMMENDATION');

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL
);

CREATE TABLE school_users (
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  PRIMARY KEY (school_id, user_id, role_id)
);

CREATE TABLE pci_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name VARCHAR(255) NOT NULL,
  status pci_status NOT NULL DEFAULT 'DRAFT',
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pci_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pci_project_id UUID NOT NULL REFERENCES pci_projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status pci_status NOT NULL DEFAULT 'DRAFT',
  pedagogical_rationale TEXT,
  created_by UUID REFERENCES users(id),
  published_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (pci_project_id, version_number)
);

ALTER TABLE pci_projects
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES pci_versions(id);

CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE orientations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE curricular_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id),
  orientation_id UUID REFERENCES orientations(id),
  area_id UUID NOT NULL REFERENCES areas(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  axis_id UUID NOT NULL REFERENCES axes(id),
  code VARCHAR(120) NOT NULL,
  content_text TEXT NOT NULL,
  source_version VARCHAR(120),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  archived_at TIMESTAMPTZ,
  UNIQUE (source_version, code)
);

CREATE TABLE curricular_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pci_version_id UUID NOT NULL REFERENCES pci_versions(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id),
  orientation_id UUID REFERENCES orientations(id),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  space_type VARCHAR(40) NOT NULL,
  format_type VARCHAR(80) NOT NULL,
  character_type VARCHAR(20) NOT NULL,
  level_number SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 5),
  start_term SMALLINT NOT NULL CHECK (start_term BETWEEN 1 AND 10),
  end_term SMALLINT NOT NULL CHECK (end_term BETWEEN 1 AND 10),
  objectives TEXT,
  problem_context TEXT,
  observations TEXT,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  CHECK (start_term <= end_term),
  UNIQUE (pci_version_id, code)
);

CREATE TABLE space_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curricular_space_id UUID NOT NULL REFERENCES curricular_spaces(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id),
  responsibility_text TEXT,
  UNIQUE (curricular_space_id, area_id)
);

CREATE TABLE content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curricular_space_id UUID NOT NULL REFERENCES curricular_spaces(id) ON DELETE CASCADE,
  curricular_content_id UUID NOT NULL REFERENCES curricular_contents(id),
  coverage_weight NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (coverage_weight > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curricular_space_id, curricular_content_id)
);

CREATE TABLE weekly_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curricular_space_id UUID NOT NULL REFERENCES curricular_spaces(id) ON DELETE CASCADE,
  term_number SMALLINT NOT NULL CHECK (term_number BETWEEN 1 AND 10),
  area_id UUID NOT NULL REFERENCES areas(id),
  hours NUMERIC(5,2) NOT NULL CHECK (hours >= 0),
  source_space_id UUID REFERENCES curricular_spaces(id),
  UNIQUE (curricular_space_id, term_number, area_id, source_space_id)
);

CREATE TABLE articulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulator_space_id UUID NOT NULL REFERENCES curricular_spaces(id) ON DELETE CASCADE,
  source_space_id UUID NOT NULL REFERENCES curricular_spaces(id),
  term_number SMALLINT NOT NULL CHECK (term_number BETWEEN 1 AND 10),
  contributed_hours NUMERIC(5,2) NOT NULL CHECK (contributed_hours >= 0),
  responsibilities TEXT,
  CHECK (articulator_space_id <> source_space_id),
  UNIQUE (articulator_space_id, source_space_id, term_number)
);

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

CREATE INDEX idx_contents_taxonomy ON curricular_contents(component_id, orientation_id, area_id, subject_id, axis_id);
CREATE INDEX idx_assignments_content ON content_assignments(curricular_content_id);
CREATE INDEX idx_spaces_version_term ON curricular_spaces(pci_version_id, level_number, start_term, end_term);
CREATE INDEX idx_validation_version ON validation_results(pci_version_id);
CREATE INDEX idx_audit_project_time ON audit_log(pci_project_id, created_at DESC);
