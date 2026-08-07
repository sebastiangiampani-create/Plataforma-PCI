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
