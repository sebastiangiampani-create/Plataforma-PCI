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
