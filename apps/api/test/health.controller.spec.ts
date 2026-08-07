import { jest } from '@jest/globals';
import type { Pool } from 'pg';
import type { Response } from 'express';
import { HealthController } from '../src/modules/health/health.controller.js';

function createMockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('HealthController', () => {
  it('responde 200 con db: ok cuando la base responde', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    } as unknown as Pool;
    const controller = new HealthController(pool);
    const res = createMockResponse();

    await controller.check(res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok', db: 'ok' }));
  });

  it('responde 503 con db: error cuando la base falla', async () => {
    const pool = {
      query: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as Pool;
    const controller = new HealthController(pool);
    const res = createMockResponse();

    await controller.check(res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', db: 'error' }),
    );
  });
});
