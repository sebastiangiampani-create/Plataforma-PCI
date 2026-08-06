import { Controller, Get, Inject, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      await this.pool.query('SELECT 1;');
      res.status(HttpStatus.OK).json({ status: 'ok', db: 'ok', timestamp });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'error', db: 'error', timestamp });
    }
  }
}
