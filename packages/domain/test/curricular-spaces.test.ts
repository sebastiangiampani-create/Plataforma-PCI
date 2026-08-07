import { describe, expect, it } from 'vitest';
import { createCurricularSpaceRequestSchema } from '../src/contracts/curricular-spaces.js';

const base = {
  code: 'LAB-1',
  name: 'Laboratorio 1',
  componentCode: 'FORMACION_GENERAL',
  spaceType: 'AUTONOMO' as const,
  characterType: 'OBLIGATORIO' as const,
  areaCodes: ['CIENCIAS_NATURALES'],
};

describe('createCurricularSpaceRequestSchema', () => {
  it('acepta un espacio cuyo rango de cuatrimestres coincide con el nivel (PCI-STR-002)', () => {
    const result = createCurricularSpaceRequestSchema.safeParse({
      ...base,
      formatType: 'LABORATORIO',
      levelNumber: 3,
      startTerm: 5,
      endTerm: 6,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza un rango de cuatrimestres que no corresponde al nivel (PCI-STR-002)', () => {
    const result = createCurricularSpaceRequestSchema.safeParse({
      ...base,
      formatType: 'LABORATORIO',
      levelNumber: 3,
      startTerm: 1,
      endTerm: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('PCI-STR-002');
    }
  });

  it('rechaza un Proyecto de Vinculación con el Futuro fuera de Nivel 5 (PCI-ORI-002)', () => {
    const result = createCurricularSpaceRequestSchema.safeParse({
      ...base,
      formatType: 'PROYECTO_VINCULACION_FUTURO',
      levelNumber: 4,
      startTerm: 7,
      endTerm: 8,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('PCI-ORI-002'))).toBe(true);
    }
  });

  it('acepta un Proyecto de Vinculación con el Futuro en Nivel 5 / C9-C10', () => {
    const result = createCurricularSpaceRequestSchema.safeParse({
      ...base,
      formatType: 'PROYECTO_VINCULACION_FUTURO',
      levelNumber: 5,
      startTerm: 9,
      endTerm: 10,
    });
    expect(result.success).toBe(true);
  });

  it('exige al menos un área aportante', () => {
    const result = createCurricularSpaceRequestSchema.safeParse({
      ...base,
      formatType: 'LABORATORIO',
      levelNumber: 3,
      startTerm: 5,
      endTerm: 6,
      areaCodes: [],
    });
    expect(result.success).toBe(false);
  });
});
