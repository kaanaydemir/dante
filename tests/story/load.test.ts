import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/test-canto.md?raw';
import { collectQuotes } from '../../src/story/ast';
import { RAW_FIXTURES, RAW_SCRIPTS, RAW_SOURCES, buildStoryLibrary, cantoIdFromPath, loadStoryLibrary, resolveQuoteLines } from '../../src/story/load';
import { parseCanto } from '../../src/story/parser';
import type { CantoScript, QuoteStmt } from '../../src/story/types';
import { RAW_INFERNO, docWithBeat, show, source } from './helpers';

const FIXTURE_PATH = '/tests/fixtures/test-canto.md';

describe('buildStoryLibrary', () => {
  const lib = buildStoryLibrary({ [FIXTURE_PATH]: fixture }, RAW_INFERNO);

  it('loads a playable canto with its diagnostics (parse + lint)', () => {
    expect(lib.cantoIds).toEqual(['inf99']);
    const loaded = lib.canto('inf99');
    expect(loaded).toMatchObject({ id: 'inf99', file: FIXTURE_PATH, status: 'ok' });
    expect(loaded.script?.scenes).toHaveLength(6);
    expect(show(loaded.diagnostics.filter((d) => d.severity !== 'info'))).toBe('');
    expect(lib.diagnostics()).toEqual(loaded.diagnostics);
  });

  it('resolves the line number of every verse, also behind skip lines', () => {
    const script = lib.script('inf99') as CantoScript;
    for (const site of collectQuotes(script)) {
      for (const l of site.quote.lines) if (l.kind === 'verse') expect(l.lineNo, `${site.quote.citationRaw}: ${l.text}`).not.toBeNull();
    }
    const study = lib.findBeat('inf99.s3.b4')?.beat.lines[0] as QuoteStmt;
    expect(study.lines.map((l) => (l.kind === 'verse' ? l.lineNo : 'skip'))).toEqual([82, 83, 84, 'skip', 87]);
  });

  it('indexes scenes, beats, Codex, memories and sources', () => {
    expect(lib.findScene('inf99.s2')?.scene.title).toBe('The Panther');
    expect(lib.findBeat('inf99.s3.b2')).toMatchObject({ canto: { id: 'inf99' }, scene: { id: 'inf99.s3' }, beat: { title: 'Another road' } });
    expect(lib.findBeat('inf99.s9.b9')).toBeNull();
    expect(lib.codex('inf99.virgil')?.title).toBe('Virgil');
    expect(lib.allCodex()).toHaveLength(3);
    expect(lib.memory('inf99.virgil_mantua')?.kind).toBe('kept');
    expect(lib.allMemories()).toHaveLength(1);
    expect(lib.source('Inferno', 3)?.count).toBe(136);
    expect(lib.source('Paradiso', 3)).toBeNull();
  });

  it('reports unknown cantos as missing and unusable files as invalid, without throwing', () => {
    expect(lib.canto('inf02')).toEqual({ id: 'inf02', file: null, status: 'missing', script: null, diagnostics: [] });
    expect(lib.script('inf02')).toBeNull();
    const broken = buildStoryLibrary(
      {
        '/docs/script/inferno-02.md': '---\nid: inf02\n---\n# Inferno II\n\nNothing written yet.\n',
        '/docs/script/inferno-03.md': '',
        '/docs/script/inferno-04.md': '\u0000garbage```script',
      },
      RAW_INFERNO,
    );
    expect(broken.canto('inf02').status).toBe('invalid');
    expect(broken.canto('inf03').status).toBe('invalid');
    expect(broken.canto('inf04').status).toBe('invalid');
    expect(broken.diagnostics().length).toBeGreaterThan(0);
    expect(() => buildStoryLibrary({}, {})).not.toThrow();
    expect(buildStoryLibrary({}, {}).cantoIds).toEqual([]);
  });

  it('keeps the first of two files that claim the same canto id', () => {
    const twice = buildStoryLibrary({ '/a/one.md': fixture, '/b/two.md': fixture }, RAW_INFERNO, { lint: false });
    expect(twice.cantoIds).toEqual(['inf99']);
    expect(twice.canto('inf99').file).toBe('/a/one.md');
    expect(twice.diagnostics().some((d) => d.message.includes('already used'))).toBe(true);
  });

  it('can skip lint', () => {
    const quiet = buildStoryLibrary({ [FIXTURE_PATH]: fixture }, RAW_INFERNO, { lint: false });
    expect(quiet.canto('inf99').diagnostics).toEqual([]);
  });
});

describe('resolveQuoteLines', () => {
  it('fills line numbers the parser could not know (between two skip lines)', () => {
    const text = docWithBeat(
      'QUOTE POET (Inferno I, 1–5)\n> Midway upon the journey of our life\n> …\n> For the straightforward pathway had been lost.\n> …\n> What was this forest savage, rough, and stern,',
    );
    const parsed = parseCanto(text, '/tests/fixtures/snippet.md').canto as CantoScript;
    const numbers = (c: CantoScript): (number | null | 'skip')[] =>
      (c.scenes[1]?.beats[0]?.lines[0] as QuoteStmt).lines.map((l) => (l.kind === 'verse' ? l.lineNo : 'skip'));
    expect(numbers(parsed)).toEqual([1, 'skip', null, 'skip', 5]);
    const after = resolveQuoteLines(parsed, source);
    expect(numbers(after)).toEqual([1, 'skip', 3, 'skip', 5]);
    // The input is not mutated.
    expect(numbers(parsed)).toEqual([1, 'skip', null, 'skip', 5]);
  });
});

describe('loadStoryLibrary (import.meta.glob, as in the game)', () => {
  it('sees the Longfellow sources, the fixture and the canto scripts', () => {
    expect(Object.keys(RAW_SOURCES)).toHaveLength(34);
    expect(Object.keys(RAW_FIXTURES)).toContain(FIXTURE_PATH);
    for (const path of Object.keys(RAW_SCRIPTS)) expect(path).toMatch(/^\/docs\/script\/inferno-\d{2}\.md$/);
  });

  it('includes the fixture only on request', () => {
    expect(loadStoryLibrary().cantoIds).not.toContain('inf99');
    const debug = loadStoryLibrary({ includeFixtures: true });
    expect(debug.cantoIds).toContain('inf99');
    expect(debug.canto('inf99').status).toBe('ok');
  });

  it('maps script paths to canto ids', () => {
    expect(cantoIdFromPath('/docs/script/inferno-03.md')).toBe('inf03');
    expect(cantoIdFromPath('/docs/script/purgatorio-01.md')).toBe('pur01');
    expect(cantoIdFromPath('/tests/fixtures/test-canto.md')).toBeNull();
  });
});
