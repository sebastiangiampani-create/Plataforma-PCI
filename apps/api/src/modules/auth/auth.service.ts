import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module.js';
import { SessionService } from '../session/session.service.js';
import type { RequestSession } from '../../common/types/authenticated-request.js';

interface UserRow {
  id: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly sessionService: SessionService,
  ) {}

  async devLogin(email: string, displayName?: string): Promise<RequestSession> {
    const fallbackDisplayName = displayName ?? email.split('@')[0] ?? email;

    const userResult = await this.pool.query<UserRow>(
      `INSERT INTO users (email, display_name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET
         display_name = COALESCE($3, users.display_name),
         updated_at = now()
       RETURNING id;`,
      [email, fallbackDisplayName, displayName ?? null],
    );
    const userRow = userResult.rows[0];
    if (!userRow) {
      throw new Error('No se pudo crear ni recuperar el usuario de desarrollo.');
    }
    const userId = userRow.id;

    // Conveniencia exclusiva de desarrollo: otorga acceso administrador a
    // todas las escuelas activas para que el selector de escuela tenga datos
    // reales sin requerir un seed manual por email. No aplica fuera de
    // DEV_AUTH_ENABLED=true (ver dev-auth-enabled.guard.ts).
    await this.pool.query(
      `INSERT INTO school_users (school_id, user_id, role_id)
       SELECT s.id, $1, r.id
       FROM schools s
       CROSS JOIN roles r
       WHERE s.status = 'ACTIVE' AND r.code = 'ADMIN_CURRICULAR'
       ON CONFLICT DO NOTHING;`,
      [userId],
    );

    return this.sessionService.createSession(userId);
  }
}
