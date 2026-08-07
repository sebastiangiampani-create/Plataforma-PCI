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
