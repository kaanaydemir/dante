import { describe, expect, it } from 'vitest';
import readme from '../../docs/script/README.md?raw';
import { extractBibleRegistry } from '../../src/story/bible';
import { parseCitation } from '../../src/story/cite';
import {
  RHYME_FAMILIES,
  WORDS,
  WORD_NAMES,
  familyOf,
  findWordInLine,
  getWord,
  isRhyme,
  isWordName,
  rhymePartners,
  wordsByCategory,
  wordsInFamily,
  wordsOfCanto,
} from '../../src/story/words';
import { ID_PATTERNS, WORD_CATEGORIES } from '../../src/story/types';
import { inferno } from './helpers';

describe('the Chapter 1 word table (bible §3.4.6)', () => {
  it('has 14 unique words: one burden, one closer, one conditional', () => {
    expect(WORDS).toHaveLength(14);
    expect(new Set(WORD_NAMES).size).toBe(14);
    for (const w of WORDS) expect(ID_PATTERNS.word.test(w.name), w.name).toBe(true);
    expect(WORDS.filter((w) => w.role === 'burden').map((w) => w.name)).toEqual(['Fear']);
    expect(WORDS.filter((w) => w.role === 'closer').map((w) => w.name)).toEqual(['Judgment']);
    expect(WORDS.filter((w) => w.acquisition === 'conditional').map((w) => w.name)).toEqual(['Judgment']);
    expect(getWord('Judgment')?.condition).toBe('choice:inf05.c4=b');
    expect(getWord('Pity')?.acquisition).toBe('colophon');
    expect(getWord('Fear')?.acquisition).toBe('auto');
  });

  it('takes every word from the last word of its origin line, verbatim from the source', () => {
    for (const w of WORDS) {
      const cite = parseCitation(w.origin.citation);
      expect(cite, w.name).not.toBeNull();
      expect(cite).toMatchObject({ canticle: w.origin.canticle, canto: w.origin.canto, first: w.origin.line, last: w.origin.line });
      expect(inferno(w.origin.canto).lines[w.origin.line - 1], w.name).toBe(w.origin.text);
      const last = (w.origin.text.match(/[A-Za-z']+/g) ?? []).pop()?.toLowerCase();
      expect([w.name.toLowerCase(), `${w.name.toLowerCase()}s`], w.name).toContain(last);
      expect(w.canto).toBe(`inf0${w.origin.canto}`);
      expect(w.scene.startsWith(`${w.canto}.s`)).toBe(true);
      expect(w.description.split(/\s+/).length, w.name).toBeLessThanOrEqual(12);
    }
  });

  it('finds the word inside its origin line', () => {
    for (const w of WORDS) {
      const at = findWordInLine(w.name, w.origin.text);
      expect(at, w.name).not.toBeNull();
      const token = w.origin.text.slice(at?.start, at?.end).toLowerCase();
      expect(token.startsWith(w.name.toLowerCase()), w.name).toBe(true);
    }
    expect(findWordInLine('Wall', 'Seven times encompassed with lofty walls,')).toEqual({ start: 35, end: 40 });
    expect(findWordInLine('Love', 'Nothing here')).toBeNull();
  });

  it('groups words into rhyme families and categories (§3.4.3, §3.4.4)', () => {
    expect(RHYME_FAMILIES).toEqual(['-ay', '-ope', '-ove', '-ow', '-ire', '-ight', '-all', '-eace', '-ity']);
    expect(wordsInFamily('-ay').map((w) => w.name)).toEqual(['Way', 'Away', 'Stay']);
    expect(wordsInFamily('-ire').map((w) => w.name)).toEqual(['Desire', 'Fire']);
    expect(rhymePartners('Way').map((w) => w.name)).toEqual(['Away', 'Stay']);
    expect(rhymePartners('Judgment')).toEqual([]);
    expect(familyOf('Fear')).toBeNull();
    expect(familyOf('love')).toBe('-ove');
    expect(isRhyme('Way', 'Away')).toBe(true);
    expect(isRhyme('Fire', 'Desire')).toBe(true);
    expect(isRhyme('Way', 'Way')).toBe(false);
    expect(isRhyme('Love', 'Hope')).toBe(false);
    expect(isRhyme('Judgment', 'Judgment')).toBe(false);
    expect(isWordName('stay')).toBe(true);
    expect(isWordName('Banana')).toBe(false);
    const byCategory = Object.fromEntries(WORD_CATEGORIES.map((c) => [c, wordsByCategory(c).map((w) => w.name)]));
    expect(byCategory).toEqual({
      Force: ['Love', 'Fire', 'Judgment'],
      Ward: ['Away', 'Wall'],
      Mend: ['Hope', 'Pity'],
      Reveal: ['Way', 'Light'],
      Still: ['Stay', 'Peace'],
      Swift: ['Go', 'Desire'],
      Burden: ['Fear'],
    });
    expect(wordsOfCanto('inf01').map((w) => w.name)).toEqual(['Fear', 'Way', 'Hope', 'Love']);
    expect(wordsOfCanto('inf05').map((w) => w.name)).toEqual(['Peace', 'Judgment', 'Pity']);
  });

  it('matches the table in the bible exactly', () => {
    const bible = extractBibleRegistry(readme).words;
    expect(bible.map((w) => w.name)).toEqual(WORD_NAMES);
    for (const b of bible) {
      const w = getWord(b.name);
      expect(w, b.name).not.toBeNull();
      expect({
        family: w?.family,
        category: w?.category,
        canto: w?.canto,
        scene: w?.scene,
        origin: w?.origin.text,
        citation: w?.origin.citation,
        description: w?.description,
      }).toEqual({
        family: b.family,
        category: b.category,
        canto: b.canto,
        scene: b.scene,
        origin: b.origin,
        citation: b.citation,
        description: b.description,
      });
      if (w?.acquisition === 'conditional') expect(`choice:${b.condition}`).toBe(w.condition);
    }
  });
});
