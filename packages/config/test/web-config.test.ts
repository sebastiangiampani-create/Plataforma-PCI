import { describe, expect, it } from 'vitest';
import { loadWebConfig } from '../src/web-config.js';

describe('loadWebConfig', () => {
  it('usa el valor por defecto de VITE_API_URL cuando no está definido', () => {
    const config = loadWebConfig({});
    expect(config.VITE_API_URL).toBe('http://localhost:3000');
  });

  it('respeta VITE_API_URL cuando está definido', () => {
    const config = loadWebConfig({ VITE_API_URL: 'https://api.example.org' });
    expect(config.VITE_API_URL).toBe('https://api.example.org');
  });
});
