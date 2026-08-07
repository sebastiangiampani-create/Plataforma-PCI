CREATE INDEX idx_contents_taxonomy ON curricular_contents(component_id, orientation_id, area_id, subject_id, axis_id);
CREATE INDEX idx_assignments_content ON content_assignments(curricular_content_id);
CREATE INDEX idx_spaces_version_term ON curricular_spaces(pci_version_id, level_number, start_term, end_term);
CREATE INDEX idx_validation_version ON validation_results(pci_version_id);
CREATE INDEX idx_audit_project_time ON audit_log(pci_project_id, created_at DESC);
