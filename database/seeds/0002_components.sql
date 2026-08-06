-- Componentes curriculares descritos en docs/01-prd.md y docs/03-modelo-dominio.md.
INSERT INTO components (code, name, status) VALUES
  ('FORMACION_GENERAL', 'Formación General', 'ACTIVE'),
  ('FORMACION_ORIENTADA', 'Formación Orientada', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;
