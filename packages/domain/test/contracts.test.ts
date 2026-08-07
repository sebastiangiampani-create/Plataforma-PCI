import { describe, expect, it } from 'vitest';
import { devLoginRequestSchema } from '../src/contracts/auth.js';
import { selectSchoolRequestSchema } from '../src/contracts/schools.js';

describe('devLoginRequestSchema', () => {
  it('acepta y normaliza un email válido', () => {
    const result = devLoginRequestSchema.parse({ email: 'Persona@Example.com' });
    expect(result.email).toBe('persona@example.com');
  });

  it('rechaza un email inválido', () => {
    expect(() => devLoginRequestSchema.parse({ email: 'no-es-un-email' })).toThrow();
  });
});

describe('selectSchoolRequestSchema', () => {
  it('exige un UUID válido', () => {
    expect(() => selectSchoolRequestSchema.parse({ schoolId: 'abc' })).toThrow();
  });

  it('acepta un UUID válido', () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    expect(selectSchoolRequestSchema.parse({ schoolId }).schoolId).toBe(schoolId);
  });
});
