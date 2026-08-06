-- Escuelas previstas explícitamente en el PRD ("ESCUELAS, MODELOS Y ROLES"):
-- Escuela 1 (PCI-101), Escuela 2 (PCI-202), Escuela 3 (PCI-303) y Escuela 4
-- (PCI-404, a migrar en una fase posterior preservando sus datos reales).
-- Los nombres son provisorios: cada institución podrá actualizarlos sin que
-- el código PCI-1xx cambie, ya que el código -no el nombre visible- es el
-- identificador estable (docs/02-arquitectura.md).
INSERT INTO schools (code, name, status) VALUES
  ('PCI-101', 'Escuela 1', 'ACTIVE'),
  ('PCI-202', 'Escuela 2', 'ACTIVE'),
  ('PCI-303', 'Escuela 3', 'ACTIVE'),
  ('PCI-404', 'Escuela 4', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;
