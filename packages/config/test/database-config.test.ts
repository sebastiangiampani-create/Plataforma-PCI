import { describe, expect, it } from 'vitest';
import { ConfigValidationError } from '../src/env.js';
import { loadDatabaseConfig } from '../src/database-config.js';

describe('loadDatabaseConfig', () => {
  it('carga una URL válida y aplica valores por defecto', () => {
    const config = loadDatabaseConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/pci_dev',
    });
    expect(config.DATABASE_SSL).toBe(false);
    expect(config.DATABASE_POOL_MAX).toBe(10);
  });

  it('rechaza una URL inválida', () => {
    expect(() => loadDatabaseConfig({ DATABASE_URL: 'not-a-url' })).toThrow(ConfigValidationError);
  });

  it('interpreta DATABASE_SSL como booleano', () => {
    const config = loadDatabaseConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/pci_dev',
      DATABASE_SSL: 'true',
    });
    expect(config.DATABASE_SSL).toBe(true);
  });
});
