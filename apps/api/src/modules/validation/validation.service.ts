import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { areConsecutiveTerms, getTermsForLevel } from '@pci/domain';
import type {
  Level,
  Term,
  ValidationFinding,
  ValidationRunResponse,
  ValidationSummaryEntry,
} from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';

const MAX_RESULTS = 200;

interface RuleRow {
  id: string;
  code: string;
  name: string;
  severity: ValidationFinding['severity'];
}

interface Finding {
  ruleCode: string;
  entityType: string;
  entityId: string | null;
  message: string;
}

interface SpaceCheckRow {
  id: string;
  code: string;
  name: string;
  level_number: number;
  start_term: number;
  end_term: number;
  format_type: string;
}

interface UncoveredContentRow {
  id: string;
  code: string;
  content_text: string;
  area_name: string;
}

@Injectable()
export class ValidationService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async run(schoolId: string, versionId: string): Promise<ValidationRunResponse> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.requireVersionForSchool(client, schoolId, versionId);

      const rules = await this.loadActiveRules(client);
      const findings = [
        ...(await this.checkSpaceStructure(client, versionId, rules)),
        ...(await this.checkContentCoverage(client, versionId, rules)),
      ];

      await client.query(
        `UPDATE validation_results SET resolved_at = now() WHERE pci_version_id = $1 AND resolved_at IS NULL;`,
        [versionId],
      );
      await this.insertFindings(client, versionId, findings, rules);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return this.currentResults(schoolId, versionId);
  }

  async currentResults(schoolId: string, versionId: string): Promise<ValidationRunResponse> {
    await this.requireVersionForSchool(this.pool, schoolId, versionId);

    const summaryResult = await this.pool.query<{
      code: string;
      name: string;
      severity: ValidationFinding['severity'];
      count: string;
    }>(
      `SELECT vr.code, vr.name, vr.severity, count(*)::text AS count
       FROM validation_results res
       JOIN validation_rules vr ON vr.id = res.validation_rule_id
       WHERE res.pci_version_id = $1 AND res.resolved_at IS NULL
       GROUP BY vr.code, vr.name, vr.severity
       ORDER BY (CASE vr.severity WHEN 'ERROR' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END), vr.code;`,
      [versionId],
    );

    const detailResult = await this.pool.query<{
      id: string;
      rule_code: string;
      rule_name: string;
      severity: ValidationFinding['severity'];
      entity_type: string;
      entity_id: string | null;
      message: string;
      cause: string | null;
      impact: string | null;
      suggested_action: string | null;
    }>(
      `SELECT res.id, vr.code AS rule_code, vr.name AS rule_name, vr.severity,
              res.entity_type, res.entity_id, res.message, res.cause, res.impact, res.suggested_action
       FROM validation_results res
       JOIN validation_rules vr ON vr.id = res.validation_rule_id
       WHERE res.pci_version_id = $1 AND res.resolved_at IS NULL
       ORDER BY (CASE vr.severity WHEN 'ERROR' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END), vr.code, res.entity_type
       LIMIT $2;`,
      [versionId, MAX_RESULTS + 1],
    );

    const truncated = detailResult.rows.length > MAX_RESULTS;
    const results: ValidationFinding[] = detailResult.rows.slice(0, MAX_RESULTS).map((row) => ({
      id: row.id,
      ruleCode: row.rule_code,
      ruleName: row.rule_name,
      severity: row.severity,
      entityType: row.entity_type,
      entityId: row.entity_id,
      message: row.message,
      cause: row.cause,
      impact: row.impact,
      suggestedAction: row.suggested_action,
    }));

    const summary: ValidationSummaryEntry[] = summaryResult.rows.map((row) => ({
      ruleCode: row.code,
      ruleName: row.name,
      severity: row.severity,
      count: Number(row.count),
    }));

    return { summary, results, truncated };
  }

  private async checkSpaceStructure(
    client: PoolClient,
    versionId: string,
    rules: Map<string, RuleRow>,
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const spaces = await client.query<SpaceCheckRow>(
      `SELECT id, code, name, level_number, start_term, end_term, format_type
       FROM curricular_spaces WHERE pci_version_id = $1;`,
      [versionId],
    );

    for (const space of spaces.rows) {
      if (
        rules.has('PCI-STR-001') &&
        !areConsecutiveTerms(space.start_term as Term, space.end_term as Term)
      ) {
        findings.push({
          ruleCode: 'PCI-STR-001',
          entityType: 'curricular_space',
          entityId: space.id,
          message: `El espacio "${space.code}" (${space.name}) ocupa C${space.start_term}-C${space.end_term}, que no son dos cuatrimestres consecutivos.`,
        });
      }

      if (rules.has('PCI-STR-002')) {
        const [expectedStart, expectedEnd] = getTermsForLevel(space.level_number as Level);
        if (space.start_term !== expectedStart || space.end_term !== expectedEnd) {
          findings.push({
            ruleCode: 'PCI-STR-002',
            entityType: 'curricular_space',
            entityId: space.id,
            message: `El espacio "${space.code}" (Nivel ${space.level_number}) debería ocupar C${expectedStart}-C${expectedEnd}, pero ocupa C${space.start_term}-C${space.end_term}.`,
          });
        }
      }

      if (
        rules.has('PCI-ORI-002') &&
        space.format_type === 'PROYECTO_VINCULACION_FUTURO' &&
        space.level_number !== 5
      ) {
        findings.push({
          ruleCode: 'PCI-ORI-002',
          entityType: 'curricular_space',
          entityId: space.id,
          message: `El espacio "${space.code}" es un Proyecto de Vinculación con el Futuro pero está en Nivel ${space.level_number}; ese formato es exclusivo de Nivel 5.`,
        });
      }
    }

    return findings;
  }

  private async checkContentCoverage(
    client: PoolClient,
    versionId: string,
    rules: Map<string, RuleRow>,
  ): Promise<Finding[]> {
    if (!rules.has('PCI-COV-001')) return [];

    const result = await client.query<UncoveredContentRow>(
      `SELECT cc.id, cc.code, cc.content_text, a.name AS area_name
       FROM curricular_contents cc
       JOIN areas a ON a.id = cc.area_id
       WHERE cc.status = 'ACTIVE'
         AND NOT EXISTS (
           SELECT 1 FROM content_assignments ca
           JOIN curricular_spaces cs ON cs.id = ca.curricular_space_id
           WHERE ca.curricular_content_id = cc.id AND cs.pci_version_id = $1
         );`,
      [versionId],
    );

    return result.rows.map((row) => ({
      ruleCode: 'PCI-COV-001',
      entityType: 'curricular_content',
      entityId: row.id,
      message: `El contenido "${row.code}" (${row.area_name}: ${row.content_text}) no está asignado a ningún espacio curricular de esta versión.`,
    }));
  }

  private async insertFindings(
    client: PoolClient,
    versionId: string,
    findings: Finding[],
    rules: Map<string, RuleRow>,
  ): Promise<void> {
    const params: unknown[] = [];
    const values: string[] = [];

    for (const finding of findings) {
      const rule = rules.get(finding.ruleCode);
      if (!rule) continue;
      const base = params.length;
      params.push(versionId, rule.id, finding.entityType, finding.entityId, finding.message);
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    }

    if (values.length === 0) return;

    await client.query(
      `INSERT INTO validation_results (pci_version_id, validation_rule_id, entity_type, entity_id, message)
       VALUES ${values.join(', ')};`,
      params,
    );
  }

  private async loadActiveRules(client: PoolClient): Promise<Map<string, RuleRow>> {
    const result = await client.query<RuleRow>(
      `SELECT id, code, name, severity FROM validation_rules WHERE active = TRUE;`,
    );
    return new Map(result.rows.map((row) => [row.code, row]));
  }

  private async requireVersionForSchool(
    db: Pool | PoolClient,
    schoolId: string,
    versionId: string,
  ): Promise<void> {
    const result = await db.query<{ id: string; school_id: string }>(
      `SELECT pv.id, pp.school_id
       FROM pci_versions pv
       JOIN pci_projects pp ON pp.id = pv.pci_project_id
       WHERE pv.id = $1;`,
      [versionId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: 'PCI_VERSION_NOT_FOUND',
        message: `No existe una versión PCI con id "${versionId}".`,
      });
    }
    if (row.school_id !== schoolId) {
      throw new ForbiddenException({
        code: 'PCI_VERSION_ACCESS_DENIED',
        message: 'La versión PCI no pertenece a la escuela activa.',
      });
    }
  }
}
