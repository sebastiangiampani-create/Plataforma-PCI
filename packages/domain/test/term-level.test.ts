import { describe, expect, it } from 'vitest';
import {
  areConsecutiveTerms,
  getLevelForTerm,
  getTermsForLevel,
  isLevel,
  isTerm,
} from '../src/rules/term-level.js';

describe('term-level rules (PCI-STR-001 / PCI-STR-002)', () => {
  it('mapea cada nivel a sus dos cuatrimestres consecutivos', () => {
    expect(getTermsForLevel(1)).toEqual([1, 2]);
    expect(getTermsForLevel(2)).toEqual([3, 4]);
    expect(getTermsForLevel(3)).toEqual([5, 6]);
    expect(getTermsForLevel(4)).toEqual([7, 8]);
    expect(getTermsForLevel(5)).toEqual([9, 10]);
  });

  it('rechaza niveles fuera de rango', () => {
    // @ts-expect-error nivel inválido a propósito
    expect(() => getTermsForLevel(6)).toThrow(RangeError);
    // @ts-expect-error nivel inválido a propósito
    expect(() => getTermsForLevel(0)).toThrow(RangeError);
  });

  it('resuelve el nivel a partir de cualquier cuatrimestre', () => {
    expect(getLevelForTerm(1)).toBe(1);
    expect(getLevelForTerm(2)).toBe(1);
    expect(getLevelForTerm(9)).toBe(5);
    expect(getLevelForTerm(10)).toBe(5);
  });

  it('valida rangos con isLevel e isTerm', () => {
    expect(isLevel(5)).toBe(true);
    expect(isLevel(6)).toBe(false);
    expect(isTerm(10)).toBe(true);
    expect(isTerm(11)).toBe(false);
  });

  it('PCI-STR-001: exige cuatrimestres consecutivos dentro de un nivel', () => {
    expect(areConsecutiveTerms(1, 2)).toBe(true);
    expect(areConsecutiveTerms(1, 3)).toBe(false);
  });
});
