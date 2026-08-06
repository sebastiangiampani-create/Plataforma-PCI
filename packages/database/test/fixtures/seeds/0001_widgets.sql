INSERT INTO widgets (id, name, color) VALUES
  (1, 'tornillo', 'gray'),
  (2, 'tuerca', 'silver')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('widgets', 'id'), GREATEST((SELECT MAX(id) FROM widgets), 1));
