import { describe, expect, it } from 'vitest';
import { ConfigValidationError } from '../src/env.js';
import { loadApiConfig } from '../src/api-config.js';

const baseEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/pci_dev',
};

describe('loadApiConfig', () => {
  it('aplica valores por defecto razonables', () => {
    const config = loadApiConfig(baseEnv);
    expect(config.PORT).toBe(3000);
    expect(config.DEV_AUTH_ENABLED).toBe(false);
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('habilita DEV_AUTH_ENABLED solo en development', () => {
    const config = loadApiConfig({ ...baseEnv, DEV_AUTH_ENABLED: 'true' });
    expect(config.DEV_AUTH_ENABLED).toBe(true);
  });

  it('fuerza DEV_AUTH_ENABLED a false fuera de development aunque se solicite true', () => {
    const config = loadApiConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      DEV_AUTH_ENABLED: 'true',
    });
    expect(config.DEV_AUTH_ENABLED).toBe(false);
  });

  it('rechaza configuración sin DATABASE_URL', () => {
    const { DATABASE_URL: _omit, ...rest } = baseEnv;
    expect(() => loadApiConfig(rest)).toThrow(ConfigValidationError);
  });

  it('rechaza un PORT fuera de rango', () => {
    expect(() => loadApiConfig({ ...baseEnv, PORT: '999999' })).toThrow(ConfigValidationError);
  });
});
