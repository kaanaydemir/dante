import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/test-canto.md?raw';
import { beatsOf, choicesOf, collectQuotes, listStatements, mapQuotes, verseLines } from '../../src/story/ast';
import { parseCanto } from '../../src/story/parser';
import type { CantoScript, QuoteStmt } from '../../src/story/types';

const canto = parseCanto(fixture, '/tests/fixtures/test-canto.md').canto as CantoScript;

describe('AST helpers', () => {
  it('walks every statement with its scene, beat, choice, option and IF depth', () => {
    const all = listStatements(canto);
    const nested = all.find((x) => x.stmt.type === 'say' && x.stmt.pos.line === 196);
    expect(nested?.ctx).toMatchObject({ scene: { id: 'inf99.s3' }, beat: { id: 'inf99.s3.b1' }, choice: null, option: null, ifDepth: 2 });
    const inOption = all.find((x) => x.stmt.type === 'goto');
    expect(inOption?.ctx.choice?.id).toBe('inf99.c2');
    expect(inOption?.ctx.option?.letter).toBe('a');
    expect(inOption?.ctx.ifDepth).toBe(0);
    expect(all.filter((x) => x.stmt.type === 'choice')).toHaveLength(4);
  });

  it('lists choices, beats and quotes', () => {
    expect(choicesOf(canto).map((c) => c.id)).toEqual(['inf99.c1', 'inf99.c2', 'inf99.c3', 'inf99.c4']);
    expect(beatsOf(canto)).toHaveLength(15);
    const kinds = collectQuotes(canto).map((s) => s.kind);
    expect(kinds.filter((k) => k === 'beat')).toHaveLength(13);
    expect(kinds.filter((k) => k === 'reveal')).toHaveLength(4);
    expect(kinds.filter((k) => k === 'codex')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'memory')).toHaveLength(1);
  });

  it('rebuilds a script with transformed quotes without touching the original', () => {
    const marked = mapQuotes(canto, (q: QuoteStmt) => ({ ...q, gloss: 'marked' }));
    expect(collectQuotes(marked).every((s) => s.quote.gloss === 'marked')).toBe(true);
    expect(collectQuotes(canto).some((s) => s.quote.gloss === 'marked')).toBe(false);
    expect(marked.scenes[3]?.beats[0]?.lines.map((s) => s.type)).toEqual(canto.scenes[3]?.beats[0]?.lines.map((s) => s.type));
  });

  it('reads the verse of a quote without its skip lines', () => {
    const q = collectQuotes(canto).find((s) => s.quote.citationRaw === 'Inferno I, 82–87')?.quote as QuoteStmt;
    expect(verseLines(q)).toHaveLength(4);
  });
});
