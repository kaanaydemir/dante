/**
 * Citations (`Inferno III, 49–51`) and Roman numerals.
 *
 * Owner: team A (story-core). Pure functions. Exports are frozen (other teams
 * import them): parseCitation, formatCitation, toRoman, fromRoman, cantoLabel.
 */

import { CANTICLES, type Canticle, type Citation } from './types';

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** 3 -> `III`. Non-positive or non-integer input returns ''. */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n <= 0) return '';
  let rest = n;
  let out = '';
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

/** `III` -> 3. Returns null for anything that is not a canonical Roman numeral. */
export function fromRoman(text: string): number | null {
  const s = text.trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(s)) return null;
  const values: Record<string, number> = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = values[s[i] as string] ?? 0;
    const next = values[s[i + 1] as string] ?? 0;
    total += v < next ? -v : v;
  }
  return toRoman(total) === s ? total : null;
}

/**
 * Parses `Inferno III, 49–51` or `Inferno III, 9`. The range separator must be
 * an en dash (bible §2.1); a hyphen is accepted here but lint L22 flags it.
 */
export function parseCitation(text: string): Citation | null {
  const m = /^\s*(Inferno|Purgatorio|Paradiso)\s+([MDCLXVI]+),\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*$/.exec(text);
  if (!m) return null;
  const canticle = m[1] as Canticle;
  if (!CANTICLES.includes(canticle)) return null;
  const roman = m[2] as string;
  const canto = fromRoman(roman);
  if (canto === null) return null;
  const first = Number(m[3]);
  const last = m[4] !== undefined ? Number(m[4]) : first;
  if (!(first >= 1) || last < first) return null;
  return { canticle, canto, roman, first, last, text: formatCitation(canticle, canto, first, last) };
}

/** Canonical citation text with an en dash. */
export function formatCitation(canticle: Canticle, canto: number, first: number, last: number = first): string {
  const range = last > first ? `${first}–${last}` : `${first}`;
  return `${canticle} ${toRoman(canto)}, ${range}`;
}

/** `CANTO III` */
export function cantoLabel(canto: number): string {
  return `CANTO ${toRoman(canto)}`;
}
