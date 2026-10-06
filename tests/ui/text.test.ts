import { describe, expect, it } from 'vitest';
import { parseCitation } from '../../src/story/cite';
import {
  typeset,
  balancedWrap,
  charDelayMs,
  ellipsize,
  monoMeasure,
  numeralOf,
  sentenceCount,
  sliceCitation,
  splitAround,
  typedLength,
  typingDurationMs,
  unquote,
  verseChunks,
  wrapText,
  wrapVerseLine,
} from '../../src/ui/text';

const m = monoMeasure(10);

describe('wrapText', () => {
  it('wraps greedily at the width', () => {
    expect(wrapText('one two three four', 90, m)).toEqual(['one two', 'three', 'four']);
    expect(wrapText('one two three four', 200, m)).toEqual(['one two three four']);
  });

  it('keeps explicit newlines and empty paragraphs', () => {
    expect(wrapText('a b\n\nc', 100, m)).toEqual(['a b', '', 'c']);
  });

  it('breaks a word longer than the width', () => {
    expect(wrapText('abcdefghij', 40, m)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapText('xy abcdefghij', 40, m)).toEqual(['xy', 'abcd', 'efgh', 'ij']);
  });

  it('never returns an empty array', () => {
    expect(wrapText('', 100, m)).toEqual(['']);
  });
});

describe('balancedWrap', () => {
  it('keeps the line count but evens the lines', () => {
    const text = 'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jj';
    const greedy = wrapText(text, 400, m);
    const even = balancedWrap(text, 400, m);
    expect(even.length).toBe(greedy.length);
    expect(Math.min(...even.map((l) => l.length))).toBeGreaterThan(Math.min(...greedy.map((l) => l.length)));
    expect(balancedWrap('short', 400, m)).toEqual(['short']);
  });
});

describe('wrapVerseLine', () => {
  it('keeps a line that fits', () => {
    expect(wrapVerseLine('Midway upon the journey', 400, m, 30)).toEqual([{ text: 'Midway upon the journey', continuation: false }]);
  });

  it('hangs the rest of a long line as continuation', () => {
    const out = wrapVerseLine('Midway upon the journey of our life', 200, m, 30);
    expect(out[0]).toEqual({ text: 'Midway upon the', continuation: false });
    expect(out.slice(1).every((s) => s.continuation)).toBe(true);
    expect(out.map((s) => s.text).join(' ')).toBe('Midway upon the journey of our life');
  });
});

describe('verseChunks', () => {
  it('keeps up to three lines together', () => {
    expect(verseChunks([1, 2, 3])).toEqual([[0, 3]]);
    expect(verseChunks([14, 15])).toEqual([[0, 2]]);
    expect(verseChunks([])).toEqual([]);
  });

  it('splits six lines on the tercet head', () => {
    expect(verseChunks([4, 5, 6, 7, 8, 9])).toEqual([
      [0, 3],
      [3, 6],
    ]);
    expect(verseChunks([130, 131, 132, 133, 134, 135])).toEqual([
      [0, 3],
      [3, 6],
    ]);
  });

  it('splits on tercet heads even for short leading groups', () => {
    // Inferno I, 65–69 (with a cut): 65, 66 | 67, 68, 69
    expect(verseChunks([65, 66, 67, 68, 69])).toEqual([
      [0, 2],
      [2, 5],
    ]);
  });

  it('falls back to threes without line numbers', () => {
    expect(verseChunks([null, null, null, null, null, null])).toEqual([
      [0, 3],
      [3, 6],
    ]);
    expect(verseChunks([82, 83, 84, null, 86, 87])).toEqual([
      [0, 3],
      [3, 6],
    ]);
  });
});

describe('sliceCitation', () => {
  const c = parseCitation('Inferno III, 4–9');
  it('names the slice', () => {
    expect(sliceCitation(c, 'Inferno III, 4–9', [4, 5, 6, 7, 8, 9], 3, 6)).toBe('Inferno III, 7–9');
    expect(sliceCitation(c, 'Inferno III, 4–9', [4, 5, 6, 7, 8, 9], 0, 6)).toBe('Inferno III, 4–9');
  });
  it('falls back to the full text', () => {
    expect(sliceCitation(null, 'whatever', [1], 0, 1)).toBe('whatever');
    expect(sliceCitation(c, 'Inferno III, 4–9', [null, null], 0, 2)).toBe('Inferno III, 4–9');
  });
});

describe('typewriter', () => {
  it('reveals by characters per second', () => {
    expect(typedLength(0, 50, 100)).toBe(0);
    expect(typedLength(1000, 50, 100)).toBe(50);
    expect(typedLength(5000, 50, 100)).toBe(100);
    expect(typedLength(10, Number.POSITIVE_INFINITY, 42)).toBe(42);
    expect(typingDurationMs('x'.repeat(55), 55)).toBe(1000);
    expect(typingDurationMs('abc', Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('pauses after punctuation', () => {
    const text = 'No, he said. Then';
    const base = charDelayMs(text, 1, 50);
    expect(charDelayMs(text, 3, 50)).toBeGreaterThan(base);
    expect(charDelayMs(text, 12, 50)).toBeGreaterThan(charDelayMs(text, 3, 50));
  });
});

describe('typeset', () => {
  it('curls quotes one character for one', () => {
    expect(typeset('"Lead me out of this misery."')).toBe('\u201CLead me out of this misery.\u201D');
    expect(typeset('And I to him: "Poet, I thee entreat,')).toBe('And I to him: \u201CPoet, I thee entreat,');
    expect(typeset('…"Not man; man once I was,')).toBe('…\u201CNot man; man once I was,');
    expect(typeset("'O spirit courteous of Mantua,")).toBe('\u2018O spirit courteous of Mantua,');
    expect(typeset("If by opposing winds 't is combated.")).toBe('If by opposing winds \u2019t is combated.');
    expect(typeset("So that the sixth was I, 'mid so much wit.")).toBe('So that the sixth was I, \u2019mid so much wit.');
    expect(typeset("ne'er seen")).toBe('ne\u2019er seen');
    const line = 'Then said he: "Go."';
    expect(typeset(line)).toHaveLength(line.length);
  });
});

describe('small helpers', () => {
  it('unquote, ellipsize, splitAround, numeralOf, sentenceCount', () => {
    expect(unquote('"Lead me out of this misery."')).toBe('Lead me out of this misery.');
    expect(unquote('Grieve with him.')).toBe('Grieve with him.');
    expect(ellipsize('abcdefghij', 5)).toBe('abcd…');
    expect(ellipsize('abc', 5)).toBe('abc');
    expect(splitAround('In which I had abandoned the true way.', 34, 37)).toEqual(['In which I had abandoned the true ', 'way', '.']);
    expect(splitAround('abc', 5, 9)).toEqual(['abc', '', '']);
    expect(numeralOf('CANTO III')).toBe('III');
    expect(sentenceCount('The gate stood open. No one had ever closed it.')).toBe(2);
    expect(sentenceCount('—not this way—')).toBe(1);
  });
});
