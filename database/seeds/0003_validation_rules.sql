-- Catálogo inicial de reglas curriculares (docs/06-rule-engine.md).
-- Se registran como metadatos administrables; el motor de evaluación en sí
-- no se implementa todavía durante Application Foundation.
INSERT INTO validation_rules (code, name, severity, rule_version, active, configuration_json) VALUES
  ('PCI-STR-001', 'Cada Nivel ocupa exactamente dos cuatrimestres consecutivos', 'ERROR', 1, TRUE, '{}'),
  ('PCI-STR-002', 'Nivel 1 C1-C2; Nivel 2 C3-C4; Nivel 3 C5-C6; Nivel 4 C7-C8; Nivel 5 C9-C10', 'ERROR', 1, TRUE, '{}'),
  ('PCI-HRS-001', 'La carga horaria se valida de forma independiente por cuatrimestre', 'ERROR', 1, TRUE, '{}'),
  ('PCI-HRS-002', 'No se permiten compensaciones entre cuatrimestres', 'ERROR', 1, TRUE, '{}'),
  ('PCI-HRS-003', 'La suma de aportes por área debe coincidir con la carga horaria total del espacio en cada cuatrimestre', 'ERROR', 1, TRUE, '{}'),
  ('PCI-HRS-004', 'Una hora articulada no puede contabilizarse nuevamente como hora adicional', 'ERROR', 1, TRUE, '{}'),
  ('PCI-COV-001', 'Cada contenido debe poder localizarse en al menos un espacio para considerarse cubierto', 'WARNING', 1, TRUE, '{}'),
  ('PCI-COV-002', 'La repetición de contenidos debe distinguir cobertura válida de sobrerrepresentación', 'RECOMMENDATION', 1, TRUE, '{}'),
  ('PCI-GEN-001', 'Los agrupamientos obligatorios tienen prioridad sobre formatos complementarios', 'WARNING', 1, TRUE, '{}'),
  ('PCI-ORI-001', 'Cada orientación debe contener exactamente tres talleres y tres laboratorios', 'ERROR', 1, TRUE, '{}'),
  ('PCI-ORI-002', 'El Proyecto de Vinculación con el Futuro es obligatorio, anual, exclusivo de Nivel 5 y ocupa C9-C10', 'ERROR', 1, TRUE, '{}'),
  ('PCI-ORI-003', 'El Proyecto de Vinculación con el Futuro no genera horas nuevas', 'ERROR', 1, TRUE, '{}'),
  ('PCI-VER-001', 'Una versión publicada es inmutable', 'ERROR', 1, TRUE, '{}'),
  ('PCI-VER-002', 'Toda modificación posterior a una publicación crea una nueva versión', 'ERROR', 1, TRUE, '{}'),
  ('PCI-IMP-001', 'Archivar contenidos no elimina asignaciones históricas', 'WARNING', 1, TRUE, '{}'),
  ('PCI-MOD-001', 'Los modelos cerrados son inmutables y de solo lectura', 'ERROR', 1, TRUE, '{}')
ON CONFLICT (code) DO NOTHING;
