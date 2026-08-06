import { jest } from '@jest/globals';
import type { Pool } from 'pg';
import { SchoolsService } from '../src/modules/schools/schools.service.js';

describe('SchoolsService', () => {
  it('mapea las filas de la base al contrato SchoolSummary', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 'id-1', code: 'PCI-101', name: 'Escuela 1', role_code: 'ADMIN_CURRICULAR' }],
        rowCount: 1,
      }),
    } as unknown as Pool;

    const service = new SchoolsService(pool);
    const schools = await service.listAccessibleSchools('user-1');

    expect(schools).toEqual([
      { id: 'id-1', code: 'PCI-101', name: 'Escuela 1', roleCode: 'ADMIN_CURRICULAR' },
    ]);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['user-1']);
  });
});
