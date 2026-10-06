import { describe, expect, it } from 'vitest';
import { cantoLabel, formatCitation, fromRoman, parseCitation, toRoman } from '../../src/story/cite';

describe('Roman numerals', () => {
  it('converts both ways for every canto number', () => {
    for (let n = 1; n <= 100; n++) expect(fromRoman(toRoman(n))).toBe(n);
    expect(toRoman(34)).toBe('XXXIV');
    expect(toRoman(99)).toBe('XCIX');
    expect(toRoman(0)).toBe('');
    expect(toRoman(2.5)).toBe('');
    expect(fromRoman('IIII')).toBeNull();
    expect(fromRoman('IC')).toBeNull();
    expect(fromRoman('abc')).toBeNull();
    expect(fromRoman('iv')).toBe(4);
    expect(cantoLabel(3)).toBe('CANTO III');
  });
});

describe('citations', () => {
  it('parses ranges and single lines', () => {
    expect(parseCitation('Inferno III, 49–51')).toEqual({ canticle: 'Inferno', canto: 3, roman: 'III', first: 49, last: 51, text: 'Inferno III, 49–51' });
    expect(parseCitation('Inferno V, 142')).toMatchObject({ first: 142, last: 142, text: 'Inferno V, 142' });
    expect(parseCitation('Purgatorio XXVII, 35–36')).toMatchObject({ canticle: 'Purgatorio', canto: 27 });
    expect(parseCitation('Paradiso I, 1')).toMatchObject({ canticle: 'Paradiso', canto: 1 });
  });

  it('accepts a hyphen (lint L22 reports it) and normalises the text to an en dash', () => {
    expect(parseCitation('Inferno III, 49-51')?.text).toBe('Inferno III, 49–51');
  });

  it('rejects malformed citations', () => {
    for (const bad of ['Inferno 3, 49–51', 'Inferno III 49', 'Hell III, 4', 'Inferno III, 51–49', 'Inferno IIII, 4', 'Inferno III, 0', '']) {
      expect(parseCitation(bad), bad).toBeNull();
    }
  });

  it('formats canonical citation text', () => {
    expect(formatCitation('Inferno', 1, 1, 3)).toBe('Inferno I, 1–3');
    expect(formatCitation('Inferno', 1, 136)).toBe('Inferno I, 136');
    expect(formatCitation('Inferno', 1, 5, 5)).toBe('Inferno I, 5');
  });
});
