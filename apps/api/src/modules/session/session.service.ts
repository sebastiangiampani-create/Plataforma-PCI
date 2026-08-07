import { randomBytes } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module.js';
import { API_CONFIG } from '../../config/config.module.js';
import type { ApiConfig } from '@pci/config';
import type { RequestSession } from '../../common/types/authenticated-request.js';

interface SessionRow {
  id: string;
  token: string;
  user_id: string;
  email: string;
  display_name: string;
  active_school_id: string | null;
  expires_at: string;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  async createSession(userId: string): Promise<RequestSession> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.DEV_SESSION_TTL_HOURS * 60 * 60 * 1000);

    const result = await this.pool.query<SessionRow>(
      `WITH inserted AS (
         INSERT INTO dev_sessions (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, token, user_id, active_school_id, expires_at
       )
       SELECT inserted.id, inserted.token, inserted.user_id, inserted.active_school_id, inserted.expires_at,
              users.email, users.display_name
       FROM inserted
       JOIN users ON users.id = inserted.user_id;`,
      [userId, token, expiresAt.toISOString()],
    );

    return this.toRequestSession(this.requireRow(result.rows));
  }

  async getSessionByToken(token: string): Promise<RequestSession | null> {
    const result = await this.pool.query<SessionRow>(
      `SELECT ds.id, ds.token, ds.user_id, ds.active_school_id, ds.expires_at,
              u.email, u.display_name
       FROM dev_sessions ds
       JOIN users u ON u.id = ds.user_id
       WHERE ds.token = $1
         AND ds.revoked_at IS NULL
         AND ds.expires_at > now();`,
      [token],
    );
    const row = result.rows[0];
    return row ? this.toRequestSession(row) : null;
  }

  async setActiveSchool(session: RequestSession, schoolId: string): Promise<RequestSession> {
    const access = await this.pool.query(
      `SELECT 1 FROM school_users WHERE school_id = $1 AND user_id = $2 LIMIT 1;`,
      [schoolId, session.userId],
    );
    if (access.rowCount === 0) {
      throw new ForbiddenException({
        code: 'SCHOOL_ACCESS_DENIED',
        message: 'El usuario no tiene acceso a la escuela solicitada.',
      });
    }

    const result = await this.pool.query<SessionRow>(
      `UPDATE dev_sessions SET active_school_id = $1
       WHERE id = $2
       RETURNING id, token, user_id, active_school_id, expires_at,
         (SELECT email FROM users WHERE users.id = dev_sessions.user_id) AS email,
         (SELECT display_name FROM users WHERE users.id = dev_sessions.user_id) AS display_name;`,
      [schoolId, session.sessionId],
    );

    return this.toRequestSession(this.requireRow(result.rows));
  }

  private requireRow(rows: SessionRow[]): SessionRow {
    const row = rows[0];
    if (!row) {
      throw new Error('No se pudo crear o actualizar la sesión de desarrollo.');
    }
    return row;
  }

  private toRequestSession(row: SessionRow): RequestSession {
    return {
      sessionId: row.id,
      token: row.token,
      userId: row.user_id,
      userEmail: row.email,
      userDisplayName: row.display_name,
      activeSchoolId: row.active_school_id,
      expiresAt: row.expires_at,
    };
  }
}
