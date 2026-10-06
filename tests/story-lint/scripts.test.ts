/**
 * `npm run lint:story`: parses and lints every canto script that exists
 * (docs/script/inferno-*.md, profile 'canto', against the LIVE bible
 * registers) and the engine fixture (profile 'fixture'). Every finding is
 * printed as `file:line severity code message`.
 *
 * The test fails only on what breaks the game or the poem: a script that does
 * not parse, any parse error (front matter, structure, unknown lines,
 * unbalanced IF / CHOICE, malformed conditions or effects), and quotes that do
 * not match Longfellow (L06). Other lint findings are reported for the writers.
 * Missing scripts are skipped: the game shows "This canto is still being written."
 *
 * Owner: team A (story-core).
 */

import { describe, expect, it } from 'vitest';
import readme from '../../docs/script/README.md?raw';
import { extractBibleRegistry } from '../../src/story/bible';
import { lintCanto } from '../../src/story/lint';
import { RAW_FIXTURES, RAW_SCRIPTS } from '../../src/story/load';
import { parseCanto } from '../../src/story/parser';
import { buildSourceMap, sourceKey } from '../../src/story/quotes';
import type { Canticle, CantoScript, Diagnostic, ParseResult } from '../../src/story/types';

// Every canticle, so a Codex note quoting Purgatorio or Paradiso is verified too (the game bundles Inferno only).
const RAW_ALL_SOURCES: Readonly<Record<string, string>> = import.meta.glob<string>('/docs/source/*/canto-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const sources = buildSourceMap(RAW_ALL_SOURCES);
const source = (canticle: Canticle, canto: number) => sources.get(sourceKey(canticle, canto)) ?? null;
const registry = extractBibleRegistry(readme);

const files = Object.keys(RAW_SCRIPTS).sort();
const parsed = new Map<string, ParseResult>(files.map((f) => [f, parseCanto(RAW_SCRIPTS[f] ?? '', f)]));
const cantos: CantoScript[] = [...parsed.values()].flatMap((r) => (r.canto ? [r.canto] : []));

function format(file: string, ds: readonly Diagnostic[]): string {
  const order = { error: 0, warning: 1, info: 2 } as const;
  return [...ds]
    .sort((a, b) => order[a.severity] - order[b.severity] || (a.pos?.line ?? 0) - (b.pos?.line ?? 0))
    .map((d) => `${d.pos?.file ?? file}:${d.pos?.line ?? 1} ${d.severity} ${d.code} ${d.message}`)
    .join('\n');
}

function summary(ds: readonly Diagnostic[]): string {
  const count = (s: Diagnostic['severity']): number => ds.filter((d) => d.severity === s).length;
  return `${count('error')} errors, ${count('warning')} warnings, ${count('info')} notes`;
}

describe('story lint: docs/script/inferno-*.md', () => {
  if (files.length === 0) {
    it('has no canto scripts yet (every canto shows "This canto is still being written.")', () => {
      expect(files).toEqual([]);
    });
  }

  for (const file of files) {
    it(`${file} parses, quotes Longfellow exactly, and lints`, () => {
      const result = parsed.get(file) as ParseResult;
      const lint = result.canto ? lintCanto(result.canto, { profile: 'canto', source, cantos, registry } as Parameters<typeof lintCanto>[1]) : [];
      const all = [...result.diagnostics, ...lint];
      console.log(`\n[lint:story] ${file}: ${summary(all)}${all.length ? `\n${format(file, all)}` : ''}`);

      expect(result.canto, `${file} could not be parsed:\n${format(file, result.diagnostics)}`).not.toBeNull();
      const parseErrors = result.diagnostics.filter((d) => d.severity === 'error');
      expect(parseErrors, `parse errors in ${file}:\n${format(file, parseErrors)}`).toEqual([]);
      const quoteErrors = lint.filter((d) => d.code === 'L06' && d.severity === 'error');
      expect(quoteErrors, `quotes that do not match Longfellow in ${file}:\n${format(file, quoteErrors)}`).toEqual([]);
      const playable = result.canto?.scenes.some((s) => s.beats.length > 0) ?? false;
      expect(playable, `${file} has no playable beat`).toBe(true);
    });
  }
});

describe('story lint: the engine fixture', () => {
  for (const [file, text] of Object.entries(RAW_FIXTURES)) {
    it(`${file} lints clean in the fixture profile`, () => {
      const result = parseCanto(text, file);
      expect(result.canto).not.toBeNull();
      const lint = lintCanto(result.canto as CantoScript, { profile: 'fixture', source });
      const all = [...result.diagnostics, ...lint];
      console.log(`\n[lint:story] ${file} (fixture): ${summary(all)}${all.length ? `\n${format(file, all)}` : ''}`);
      expect(all.filter((d) => d.severity === 'error'), format(file, all)).toEqual([]);
    });
  }
});
