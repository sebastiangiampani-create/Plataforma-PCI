import { describe, expect, it } from 'vitest';
import { FORMACION_GENERAL_PLAN } from '../src/reference-data/formacion-general-plan.js';

describe('FORMACION_GENERAL_PLAN (docs/08-plan-de-estudios-formacion-general.md)', () => {
  it('el total declarado coincide con la suma real de horas por nivel', () => {
    for (const entry of FORMACION_GENERAL_PLAN) {
      const sum = entry.weeklyHoursByLevel.reduce((acc: number, hours) => acc + (hours ?? 0), 0);
      expect(sum, `${entry.unidadCurricular}: total declarado no coincide con la suma`).toBe(
        entry.totalHoursPlan,
      );
    }
  });

  it('tiene exactamente las 16 unidades curriculares documentadas', () => {
    expect(FORMACION_GENERAL_PLAN).toHaveLength(16);
  });

  it('toda fila sin areaCode/subjectCode declara explícitamente por qué (note)', () => {
    for (const entry of FORMACION_GENERAL_PLAN) {
      if (entry.areaCode === null || entry.subjectCode === null) {
        expect(entry.note, `${entry.unidadCurricular} debería tener una nota`).toBeTruthy();
      }
    }
  });

  it('los códigos de área/materia enlazados son únicos por fila enlazada', () => {
    const subjectCodes = FORMACION_GENERAL_PLAN.map((e) => e.subjectCode).filter(
      (code): code is string => code !== null,
    );
    expect(new Set(subjectCodes).size).toBe(subjectCodes.length);
  });
});
