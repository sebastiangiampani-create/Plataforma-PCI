/**
 * Estructura temporal institucional (docs/01-prd.md, docs/06-rule-engine.md PCI-STR-001/002).
 * Diez cuatrimestres agrupados en cinco niveles anuales de dos cuatrimestres
 * consecutivos cada uno. Estos valores están tomados literalmente de la
 * documentación aprobada: no se infieren ni se inventan cargas ni reglas nuevas.
 */
export const LEVEL_COUNT = 5;
export const TERM_COUNT = 10;

export type Level = 1 | 2 | 3 | 4 | 5;
export type Term = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const LEVEL_TERMS: Readonly<Record<Level, readonly [Term, Term]>> = Object.freeze({
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
  5: [9, 10],
});

export function isLevel(value: number): value is Level {
  return Number.isInteger(value) && value >= 1 && value <= LEVEL_COUNT;
}

export function isTerm(value: number): value is Term {
  return Number.isInteger(value) && value >= 1 && value <= TERM_COUNT;
}

/** PCI-STR-002: devuelve los dos cuatrimestres consecutivos de un nivel anual. */
export function getTermsForLevel(level: Level): readonly [Term, Term] {
  if (!isLevel(level)) {
    throw new RangeError(`Nivel inválido: ${level}. Debe estar entre 1 y ${LEVEL_COUNT}.`);
  }
  return LEVEL_TERMS[level];
}

/** Inverso de getTermsForLevel: dado un cuatrimestre, determina su nivel anual. */
export function getLevelForTerm(term: Term): Level {
  if (!isTerm(term)) {
    throw new RangeError(`Cuatrimestre inválido: ${term}. Debe estar entre 1 y ${TERM_COUNT}.`);
  }
  const level = (Object.entries(LEVEL_TERMS) as Array<[string, readonly [Term, Term]]>).find(
    ([, terms]) => terms.includes(term),
  )?.[0];
  if (!level) {
    throw new RangeError(`No se encontró nivel para el cuatrimestre ${term}.`);
  }
  return Number(level) as Level;
}

/** PCI-STR-001: un nivel ocupa exactamente dos cuatrimestres consecutivos. */
export function areConsecutiveTerms(start: Term, end: Term): boolean {
  return end === start + 1;
}
