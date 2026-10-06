import { describe, expect, it } from 'vitest';
import { parseScriptBlock } from '../../src/story/parser';
import { findVerse, matchVerse, parseSourceText, sourceRange, verifyQuote, verseCore } from '../../src/story/quotes';
import type { QuoteStmt } from '../../src/story/types';
import { RAW_INFERNO, SOURCES, inferno } from './helpers';

function quote(text: string): QuoteStmt {
  const r = parseScriptBlock(text, { directives: false });
  const q = r.statements[0];
  if (!q || q.type !== 'quote') throw new Error(`not a quote: ${text}`);
  return q;
}

function check(text: string, canto?: number) {
  const q = quote(text);
  const n = canto ?? q.citation?.canto ?? 1;
  return verifyQuote(q, inferno(n));
}

describe('Longfellow sources', () => {
  it('parses all 34 Inferno cantos with continuous line numbers (4720 lines)', () => {
    expect(Object.keys(RAW_INFERNO)).toHaveLength(34);
    expect(SOURCES.size).toBe(34);
    let total = 0;
    for (let n = 1; n <= 34; n++) {
      const s = inferno(n);
      expect(s.canticle).toBe('Inferno');
      expect(s.canto).toBe(n);
      expect(s.lines.length).toBe(s.count);
      expect(s.lines.every((l) => l.trim().length > 0), `Inferno ${n} has a hole`).toBe(true);
      total += s.count;
    }
    expect(total).toBe(4720);
    expect([1, 2, 3, 4, 5].map((n) => inferno(n).count)).toEqual([136, 142, 136, 151, 142]);
  });

  it('keeps the source exactly (§6.6 oddities included)', () => {
    expect(inferno(2).lines[120]).toBe('What is it, then?  Why, why dost thou delay?');
    expect(inferno(2).lines[54]).toBe('Her eyes where shining brighter than the Star;');
    expect(inferno(5).lines[29]).toBe("If by opposing winds 't is combated.");
    expect(sourceRange(inferno(3), 1, 3)).toEqual([
      '"Through me the way is to the city dolent;',
      'Through me the way is to eternal dole;',
      'Through me the way among the people lost.',
    ]);
  });

  it('rejects paths and texts that are not numbered cantos', () => {
    expect(parseSourceText('1 | x', '/docs/source/longfellow-inferno.txt')).toBeNull();
    expect(parseSourceText('no numbers here', '/docs/source/inferno/canto-01.txt')).toBeNull();
    expect(parseSourceText('  1 | a\n  3 | c', '/docs/source/purgatorio/canto-07.txt')).toMatchObject({
      canticle: 'Purgatorio',
      canto: 7,
      lines: ['a', '', 'c'],
      count: 3,
    });
  });
});

describe('matchVerse: the §2.6 cutting rules', () => {
  const line = 'And unto him my Guide: "Why criest thou too?';
  it('matches whole lines exactly', () => {
    expect(matchVerse(line, line)).toBe(true);
    expect(matchVerse(line.toLowerCase(), line)).toBe(false);
    expect(matchVerse(`${line} `, line)).toBe(true);
  });
  it('matches a line cut at the end, at the start, or at both ends', () => {
    expect(matchVerse('And unto him my Guide:…', line)).toBe(true);
    expect(matchVerse('…"Why criest thou too?', line)).toBe(true);
    expect(matchVerse('…him my Guide…', line)).toBe(true);
    expect(matchVerse('And unto him my Guide…', line)).toBe(true);
    expect(matchVerse('…"Why criest thou?', line)).toBe(false);
    expect(matchVerse('unto him my Guide:…', line)).toBe(false);
  });
  it('reads "..." as a cut mark (lint L22 reports the spelling)', () => {
    expect(matchVerse('And unto him my Guide:...', line)).toBe(true);
    expect(verseCore('...x...')).toEqual({ core: 'x', cutStart: true, cutEnd: true });
  });
  it('finds every line a verse matches', () => {
    expect(findVerse('Through me the way…', inferno(3))).toEqual([2, 3]);
    expect(findVerse('…the people lost.', inferno(3))).toEqual([3]);
  });
});

describe('verifyQuote', () => {
  it('accepts the bible §2.6 examples', () => {
    expect(check('QUOTE VIRGIL (Inferno III, 49–51)\n> No fame of them the world permits to be;\n> Misericord and Justice both disdain them.\n> Let us not speak of them, but look, and pass."')).toMatchObject({ ok: true, lineNumbers: [49, 50, 51] });
    expect(check('QUOTE DANTE (Inferno III, 12)\n> …"Their sense is, Master, hard to me!"')).toMatchObject({ ok: true, lineNumbers: [12] });
    const francesca = check(
      'QUOTE FRANCESCA (Inferno V, 100–106)\n> Love, that on gentle heart doth swiftly seize,\n> …\n> Love, that exempts no one beloved from loving,\n> …\n> Love has conducted us unto one death;',
    );
    expect(francesca).toMatchObject({ ok: true, lineNumbers: [100, null, 103, null, 106] });
    expect(check('QUOTE POET (Inferno V, 21)\n> And unto him my Guide:…')).toMatchObject({ ok: true });
    expect(
      check(
        'QUOTE VIRGIL (Inferno V, 21–24)\n> …"Why criest thou too?\n> Do not impede his journey fate-ordained;\n> It is so willed there where is power to do\n> That which is willed; and ask no further question."',
      ),
    ).toMatchObject({ ok: true, lineNumbers: [21, 22, 23, 24] });
  });

  it('accepts the source oddities copied as they are (§6.6)', () => {
    expect(check('QUOTE POET (Inferno II, 121)\n> What is it, then?  Why, why dost thou delay?').ok).toBe(true);
    expect(check('QUOTE POET (Inferno V, 30)\n> If by opposing winds \'t is combated.').ok).toBe(true);
  });

  it('reports a wrong citation range and says what it should be (Q07)', () => {
    const r = check('QUOTE VIRGIL (Inferno III, 49–52)\n> No fame of them the world permits to be;\n> Misericord and Justice both disdain them.\n> Let us not speak of them, but look, and pass."');
    expect(r.ok).toBe(false);
    expect(r.lineNumbers).toEqual([49, 50, 51]);
    expect(r.diagnostics[0]).toMatchObject({ severity: 'error', code: 'Q07' });
    expect(r.diagnostics[0]?.message).toContain('Inferno III, 49–51');
    const shifted = check('QUOTE VIRGIL (Inferno III, 48–50)\n> No fame of them the world permits to be;\n> Misericord and Justice both disdain them.\n> Let us not speak of them, but look, and pass."');
    expect(shifted.diagnostics[0]?.code).toBe('Q07');
  });

  it('explains text mismatches (Q05)', () => {
    const caps = check('QUOTE VIRGIL (Inferno III, 49–51)\n> No fame of them the world permits to be;\n> Misericord and justice both disdain them.\n> Let us not speak of them, but look, and pass."');
    expect(caps.ok).toBe(false);
    expect(caps.diagnostics[0]).toMatchObject({ code: 'Q05' });
    expect(caps.diagnostics[0]?.message).toMatch(/capital letters/);
    expect(caps.lineNumbers).toEqual([49, null, 51]);
    const smart = check('QUOTE VIRGIL (Inferno III, 51)\n> Let us not speak of them, but look, and pass.”');
    expect(smart.diagnostics[0]?.message).toMatch(/quotation marks/);
    const spacing = check('QUOTE POET (Inferno II, 121)\n> What is it, then? Why, why dost thou delay?');
    expect(spacing.diagnostics[0]?.message).toMatch(/spacing/);
    const invented = check('QUOTE POET (Inferno I, 1)\n> Abandon all hope, ye who enter here');
    expect(invented.diagnostics[0]).toMatchObject({ code: 'Q05' });
  });

  it('needs a skip line between non-consecutive lines (Q06)', () => {
    const r = check('QUOTE VIRGIL (Inferno III, 49–51)\n> No fame of them the world permits to be;\n> Let us not speak of them, but look, and pass."');
    expect(r.diagnostics[0]?.code).toBe('Q06');
    const reversed = check('QUOTE VIRGIL (Inferno III, 49–51)\n> Let us not speak of them, but look, and pass."\n> …\n> No fame of them the world permits to be;');
    expect(reversed.ok).toBe(false);
  });

  it('rejects skip lines at the edges (Q08) but still locates the lines', () => {
    const r = check('QUOTE POET (Inferno I, 1–3)\n> …\n> I found myself within a forest dark,\n> For the straightforward pathway had been lost.');
    expect(r.ok).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toContain('Q08');
    expect(r.lineNumbers).toEqual([null, 2, 3]);
  });

  it('warns when a cut mark cuts nothing (Q09) and still passes', () => {
    const r = check('QUOTE POET (Inferno I, 1)\n> …Midway upon the journey of our life');
    expect(r.ok).toBe(true);
    expect(r.diagnostics[0]).toMatchObject({ severity: 'warning', code: 'Q09' });
  });

  it('stays fast on pathological quotes', () => {
    const t0 = Date.now();
    const r = check(`QUOTE POET (Inferno IV, 1–151)\n${Array.from({ length: 6 }, () => '> …e…\n> …').join('\n')}\n> zzz`);
    expect(r.ok).toBe(false);
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it('handles missing citations, sources and ranges', () => {
    const q = quote('QUOTE POET (Inferno III, 49–51)\n> No fame of them the world permits to be;');
    expect(verifyQuote(q, null).diagnostics[0]).toMatchObject({ severity: 'warning', code: 'Q02' });
    expect(verifyQuote(q, inferno(4)).diagnostics[0]?.code).toBe('Q03');
    const noCite = quote('QUOTE POET (somewhere)\n> No fame of them the world permits to be;');
    expect(verifyQuote(noCite, inferno(3)).diagnostics[0]?.code).toBe('Q01');
    const outside = check('QUOTE POET (Inferno III, 200)\n> No fame of them the world permits to be;');
    expect(outside.diagnostics.map((d) => d.code)).toContain('Q04');
    expect(outside.lineNumbers).toEqual([49]);
  });
});
