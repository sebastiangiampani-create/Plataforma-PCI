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
