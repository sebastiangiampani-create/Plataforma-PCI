import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { SchoolSummary } from '@pci/domain';
import { PG_POOL } from '../../database/database.module.js';

interface SchoolRow {
  id: string;
  code: string;
  name: string;
  role_code: string;
}

@Injectable()
export class SchoolsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listAccessibleSchools(userId: string): Promise<SchoolSummary[]> {
    const result = await this.pool.query<SchoolRow>(
      `SELECT s.id, s.code, s.name, r.code AS role_code
       FROM schools s
       JOIN school_users su ON su.school_id = s.id
       JOIN roles r ON r.id = su.role_id
       WHERE su.user_id = $1 AND s.status = 'ACTIVE'
       ORDER BY s.code ASC;`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      roleCode: row.role_code,
    }));
  }
}
