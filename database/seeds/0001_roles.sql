-- Roles listados en docs/01-prd.md ("Roles").
INSERT INTO roles (code, name) VALUES
  ('ADMIN_CURRICULAR', 'Administrador curricular'),
  ('ASESOR_CONSTRUCTOR', 'Asesor o constructor'),
  ('EQUIPO_DIRECTIVO', 'Equipo directivo'),
  ('LECTOR_SUPERVISOR', 'Lector o supervisor')
ON CONFLICT (code) DO NOTHING;
