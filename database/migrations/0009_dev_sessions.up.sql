-- Tabla de infraestructura técnica, no curricular: sostiene la autenticación
-- de desarrollo (AGENTS.md) y la persistencia real de la escuela activa
-- seleccionada por el usuario. No forma parte del modelo curricular descrito
-- en docs/05-modelo-datos.md y deberá revisarse cuando se defina la
-- autenticación definitiva de la plataforma.
CREATE TABLE dev_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  active_school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_dev_sessions_user ON dev_sessions(user_id);
