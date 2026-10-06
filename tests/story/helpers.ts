/**
 * Shared helpers for the story-core tests (team A). Not a test file itself.
 * Texts load through Vite (`?raw` / import.meta.glob), exactly like the game.
 */

import { buildSourceMap, sourceKey } from '../../src/story/quotes';
import type { Canticle, CantoScript, Diagnostic, LintContext, SourceCanto } from '../../src/story/types';
import { parseCanto } from '../../src/story/parser';

export const RAW_INFERNO: Readonly<Record<string, string>> = import.meta.glob<string>('/docs/source/inferno/canto-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const SOURCES = buildSourceMap(RAW_INFERNO);

export function source(canticle: Canticle, canto: number): SourceCanto | null {
  return SOURCES.get(sourceKey(canticle, canto)) ?? null;
}

export function inferno(canto: number): SourceCanto {
  const s = source('Inferno', canto);
  if (!s) throw new Error(`missing Inferno ${canto}`);
  return s;
}

export const FRONT_FIXTURE = `---
id: inf99
canticle: Inferno
canto: 99
title: "The Test Wood"
title_tr: "Deneme"
location: "The Test Wood"
source: docs/source/inferno/canto-01.txt
lines: "1–136"
epigraph: "Inferno I, 1–3"
closing: "Inferno I, 136"
characters: [DANTE, VIRGIL]
mechanics: [move]
choices: []
words: []
memories: []
codex: []
flags_set: []
flags_read: []
unlocks: []
playtime: "1–2"
writer: "test"
status: draft
version: "0.1"
---
`;

const OPENING = `## [inf99.s0] Opening page

### [inf99.s0.b1] Title

\`\`\`script
@mode: page
QUOTE POET (Inferno I, 1–3)
> Midway upon the journey of our life
> I found myself within a forest dark,
> For the straightforward pathway had been lost.
\`\`\`
`;

const COLOPHON = `## [inf99.s9] Colophon

### [inf99.s9.b1] End

\`\`\`script
@mode: colophon
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
\`\`\`
`;

/**
 * A complete fixture-canto document whose scene inf99.s1 / beat inf99.s1.b1
 * holds `body` (the lines of one ```script block, @mode first unless `raw`).
 */
export function docWithBeat(body: string, opts: { front?: string; mode?: string | null; extra?: string } = {}): string {
  const mode = opts.mode === undefined ? '@mode: dialogue\n' : opts.mode === null ? '' : `@mode: ${opts.mode}\n`;
  return `${opts.front ?? FRONT_FIXTURE}
# Inferno XCIX — Test

${OPENING}
## [inf99.s1] Scene

### [inf99.s1.b1] Beat

\`\`\`script
${mode}${body}
\`\`\`
${opts.extra ?? ''}
${COLOPHON}`;
}

export function parse(text: string, file = '/tests/fixtures/snippet.md'): { canto: CantoScript; diagnostics: readonly Diagnostic[] } {
  const r = parseCanto(text, file);
  if (!r.canto) throw new Error(`no canto: ${r.diagnostics.map((d) => d.message).join('; ')}`);
  return { canto: r.canto, diagnostics: r.diagnostics };
}

/** The statements of inf99.s1.b1 in a docWithBeat document. */
export function beatLines(text: string): { lines: CantoScript['scenes'][number]['beats'][number]['lines']; diagnostics: readonly Diagnostic[] } {
  const { canto, diagnostics } = parse(text);
  const beat = canto.scenes.find((s) => s.id === 'inf99.s1')?.beats[0];
  if (!beat) throw new Error('beat inf99.s1.b1 not found');
  return { lines: beat.lines, diagnostics };
}

export const fixtureLint: LintContext = { profile: 'fixture', source };

export function codes(ds: readonly Diagnostic[], severity?: Diagnostic['severity']): string[] {
  return ds.filter((d) => !severity || d.severity === severity).map((d) => d.code);
}

export function errors(ds: readonly Diagnostic[]): Diagnostic[] {
  return ds.filter((d) => d.severity === 'error');
}

export function show(ds: readonly Diagnostic[]): string {
  return ds.map((d) => `${d.severity} ${d.code} ${d.pos?.file ?? ''}:${d.pos?.line ?? ''} ${d.message}`).join('\n');
}
