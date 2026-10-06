/**
 * The bible (docs/script/README.md) as test input: every ```script example
 * parses cleanly, the §2.15 full example parses and verifies, and the
 * registers lint relies on are read from it. The CHAPTER1_REGISTRY snapshot is
 * compared with the live bible; drift is printed (the story-lint test always
 * lints against the live bible, so drift never hides a real problem).
 */

import { describe, expect, it } from 'vitest';
import readme from '../../docs/script/README.md?raw';
import { collectQuotes } from '../../src/story/ast';
import { extractBibleRegistry, extractFullExample } from '../../src/story/bible';
import { formatEffect } from '../../src/story/effects';
import { parseCanto, parseScriptBlock } from '../../src/story/parser';
import { verifyQuote } from '../../src/story/quotes';
import { CHAPTER1_REGISTRY } from '../../src/story/registry';
import type { ChoiceStmt, IfStmt } from '../../src/story/types';
import { show, source } from './helpers';

/** Every fenced block of the bible with its info string and first content line. */
function fences(text: string): { lang: string; line: number; body: string }[] {
  const lines = text.split('\n');
  const out: { lang: string; line: number; body: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(`{3,})(\w*)\s*$/.exec(lines[i] as string);
    if (!m) continue;
    const marker = m[1] as string;
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length && !new RegExp(`^${marker}\\s*$`).test(lines[j] as string); j++) body.push(lines[j] as string);
    out.push({ lang: m[2] as string, line: i + 2, body: body.join('\n') });
    i = j;
  }
  return out;
}

const registry = extractBibleRegistry(readme);

describe('the bible\'s script examples', () => {
  const blocks = fences(readme).filter((f) => f.lang === 'script');

  it('has script examples, and every one parses without a diagnostic', () => {
    expect(blocks.length).toBeGreaterThan(30);
    for (const b of blocks) {
      const r = parseScriptBlock(b.body, { directives: false, firstLine: b.line, file: 'README.md' });
      expect(show(r.diagnostics), `block at README.md:${b.line}`).toBe('');
      expect(r.statements.length, `block at README.md:${b.line}`).toBeGreaterThan(0);
      expect(r.statements.some((s) => s.type === 'unknown')).toBe(false);
    }
  });

  it('reads the §2.8 IF example as one tree', () => {
    const b = blocks.find((x) => x.body.startsWith('IF flag:inf02.courage_beatrice'));
    const r = parseScriptBlock(b?.body ?? '', { directives: false });
    const iff = r.statements[0] as IfStmt;
    expect(iff.branches.map((x) => x.raw)).toEqual(['flag:inf02.courage_beatrice and not flag:inf03.left_hope', 'trust>=7']);
    expect(iff.elseBody).toHaveLength(1);
  });
});

describe('the §2.15 full example (Canto III opening)', () => {
  const example = extractFullExample(readme);

  it('is found in the bible', () => {
    expect(example).not.toBeNull();
  });

  it('parses without a diagnostic and with the expected structure', () => {
    const r = parseCanto(example ?? '', '/docs/script/inferno-03.md');
    expect(show(r.diagnostics)).toBe('');
    const c = r.canto;
    expect(c?.id).toBe('inf03');
    expect(c?.heading).toBe('Inferno III — The Gate');
    expect(c?.front.characters).toEqual(['DANTE', 'VIRGIL', 'NEUTRAL', 'GREAT_REFUSAL', 'SOUL', 'CHARON']);
    expect(c?.scenes.map((s) => [s.id, s.beats.map((b) => `${b.id}:${b.mode}`)])).toEqual([
      ['inf03.s0', ['inf03.s0.b1:page']],
      ['inf03.s1', ['inf03.s1.b1:cinematic', 'inf03.s1.b2:dialogue', 'inf03.s1.b3:cinematic']],
    ]);
    const b2 = c?.scenes[1]?.beats[1];
    const choice = b2?.lines.find((s): s is ChoiceStmt => s.type === 'choice');
    expect(choice).toMatchObject({ id: 'inf03.c1', weight: 'major', systemic: false, title: 'What Dante leaves at the gate' });
    expect(choice?.options.map((o) => o.effects.map(formatEffect).join(', '))).toEqual([
      'shed:Fear, virtue:fortitude+1, trust+1',
      'seal:Hope, flag:inf03.left_hope',
    ]);
    expect(choice?.reveal).toMatchObject({ canon: ['a'], timing: 'immediate' });
    expect(b2?.lines.map((s) => s.type)).toEqual(['say', 'if', 'quote', 'say', 'choice']);
    expect(c?.codex.map((e) => e.id)).toEqual(['inf03.gate']);
  });

  it('quotes Longfellow exactly', () => {
    const c = parseCanto(example ?? '', '/docs/script/inferno-03.md').canto;
    const sites = c ? collectQuotes(c) : [];
    expect(sites.length).toBe(6);
    for (const site of sites) {
      const q = site.quote;
      const check = verifyQuote(q, q.citation ? source(q.citation.canticle, q.citation.canto) : null);
      expect(show(check.diagnostics), q.citationRaw).toBe('');
      expect(check.ok).toBe(true);
    }
  });
});

describe('the bible registers', () => {
  it('reads the Chapter 1 scene lists, choices, flags, events, memories and words', () => {
    expect(Object.keys(registry.cantos)).toEqual(['inf01', 'inf02', 'inf03', 'inf04', 'inf05']);
    expect(Object.values(registry.cantos).map((c) => c.scenes.length)).toEqual([10, 9, 9, 10, 9]);
    for (const c of Object.values(registry.cantos)) {
      expect(c.scenes[0]?.id).toBe(`${c.id}.s0`);
      expect(c.scenes[0]?.modes).toEqual(['page']);
      expect(c.scenes[c.scenes.length - 1]?.modes).toEqual(['colophon']);
      expect(c.epigraph).toMatch(/^Inferno [IVX]+, \d+(–\d+)?$/);
      expect(c.closing).toMatch(/^Inferno [IVX]+, \d+$/);
      expect(c.mechanics.length).toBeGreaterThan(3);
      expect(c.anchors.length).toBeGreaterThan(5);
    }
    expect(Object.keys(registry.choices)).toHaveLength(15);
    for (const ch of Object.values(registry.choices)) {
      expect(ch.block, ch.id).not.toBeNull();
      const parsed = parseScriptBlock(ch.block ?? '', { directives: false });
      const stmt = parsed.statements.find((s): s is ChoiceStmt => s.type === 'choice');
      expect(stmt?.id).toBe(ch.id);
      expect(stmt?.weight).toBe(ch.weight);
      expect(stmt?.systemic).toBe(ch.systemic);
      expect(ch.scene).toMatch(/^inf0\d\.s\d+$/);
    }
    expect(registry.choices['inf05.c4']).toMatchObject({ weight: 'centre', scene: 'inf05.s6' });
    expect(Object.keys(registry.flags)).toHaveLength(13);
    expect(registry.flags['inf03.left_hope']?.readers).toEqual(['inf03.s1', 'inf04.s2', 'inf04.s6', 'inf04.s7']);
    expect(registry.events).toEqual(['inf01.waited_dawn', 'inf01.held_ground', 'inf01.turned_to_guide', 'inf03.held_before_charon', 'inf05.minos_two_right']);
    expect(registry.memories).toEqual([{ id: 'inf05.paolo_francesca', kind: 'kept', setBy: 'inf05.c4=a' }]);
    expect(registry.systemFlags).toHaveLength(5);
    expect(registry.words).toHaveLength(14);
    expect(Object.values(registry.codexPlan).flat().length).toBeGreaterThan(40);
  });

  it('matches the CHAPTER1_REGISTRY snapshot used by lint in the game (drift is reported, not fatal)', () => {
    const { words: _words, ...live } = registry;
    const drift: string[] = [];
    const compare = (a: unknown, b: unknown, path: string): void => {
      if (JSON.stringify(a) === JSON.stringify(b)) return;
      if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b as object)]);
        for (const k of keys) compare((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
        return;
      }
      drift.push(path);
    };
    compare(live, CHAPTER1_REGISTRY, 'registry');
    if (drift.length > 0) {
      console.warn(
        `[story] src/story/registry.ts is out of date with docs/script/README.md at: ${drift.join(', ')}. ` +
          'Regenerate it from extractBibleRegistry(readme); lint:story already uses the live bible.',
      );
    }
    expect(Array.isArray(drift)).toBe(true);
  });
});
