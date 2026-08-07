CREATE TABLE curricular_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  source_name VARCHAR(255) NOT NULL,
  source_version VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PREVIEW' CHECK (status IN ('PREVIEW', 'APPLIED', 'REVERTED')),
  imported_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_at TIMESTAMPTZ
);

CREATE TABLE curricular_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curricular_import_id UUID NOT NULL REFERENCES curricular_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  curricular_content_id UUID REFERENCES curricular_contents(id),
  raw_data_json JSONB NOT NULL,
  validation_errors_json JSONB,
  status VARCHAR(20) NOT NULL CHECK (status IN ('VALID', 'INVALID', 'DUPLICATE', 'IMPORTED')),
  UNIQUE (curricular_import_id, row_number)
);

CREATE INDEX idx_curricular_import_rows_import ON curricular_import_rows (curricular_import_id);
