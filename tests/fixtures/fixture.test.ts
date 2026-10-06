/**
 * Guards the engine fixture (tests/fixtures/test-canto.md) independently of
 * the story-core parser: every verse is verbatim Longfellow (bible §2.6 cut
 * rules), the citation covers exactly the first and last line, typography
 * follows §2.1 / L22, and every line type of §2.5 appears at least once.
 * Architect-owned.
 */

import { describe, expect, it } from 'vitest';
import canto01 from '../../docs/source/inferno/canto-01.txt?raw';
import fixture from './test-canto.md?raw';

const source = new Map<number, string>();
for (const raw of canto01.split('\n')) {
  const m = /^\s*(\d+) \| (.*)$/.exec(raw);
  if (m) source.set(Number(m[1]), m[2] as string);
}

interface QuoteBlock {
  line: number;
  cite: string;
  verses: { line: number; text: string }[];
}

function fencedBlocks(md: string): { type: string; lines: { n: number; t: string }[] }[] {
  const out: { type: string; lines: { n: number; t: string }[] }[] = [];
  let cur: { type: string; lines: { n: number; t: string }[] } | null = null;
  md.split('\n').forEach((t, i) => {
    const open = /^```(\w*)\s*$/.exec(t);
    if (!cur && open) {
      cur = { type: open[1] ?? '', lines: [] };
      return;
    }
    if (cur && /^```\s*$/.test(t)) {
      out.push(cur);
      cur = null;
      return;
    }
    if (cur) cur.lines.push({ n: i + 1, t });
  });
  return out;
}

const blocks = fencedBlocks(fixture).filter((b) => ['script', 'codex', 'memory'].includes(b.type));

function quotes(): QuoteBlock[] {
  const out: QuoteBlock[] = [];
  for (const b of blocks) {
    let q: QuoteBlock | null = null;
    for (const { n, t } of b.lines) {
      const head = /^QUOTE [A-Z_]+ \((.+)\)$/.exec(t);
      if (head) {
        q = { line: n, cite: head[1] as string, verses: [] };
        out.push(q);
      } else if (t.startsWith('> ') && q) {
        q.verses.push({ line: n, text: t.slice(2) });
      } else {
        q = null;
      }
    }
  }
  return out;
}

function matches(written: string, original: string): boolean {
  const cutStart = written.startsWith('…');
  const cutEnd = written.endsWith('…') && written.length > 1;
  const core = written.replace(/^…/, '').replace(/…$/, '');
  if (cutStart && cutEnd) return original.includes(core);
  if (cutStart) return original.endsWith(core);
  if (cutEnd) return original.startsWith(core);
  return original === core;
}

describe('engine fixture: tests/fixtures/test-canto.md', () => {
  it('uses the reserved fixture canto id inf99', () => {
    expect(fixture).toMatch(/^---\nid: inf99\n/);
    const ids = [...fixture.matchAll(/\[(inf\d\d)\.s\d+(?:\.b\d+)?\]/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids)).toEqual(new Set(['inf99']));
  });

  it('quotes Inferno I verbatim and cites exactly the first and last line', () => {
    const qs = quotes();
    expect(qs.length).toBeGreaterThanOrEqual(20);
    for (const q of qs) {
      const m = /^Inferno I, (\d+)(?:–(\d+))?$/.exec(q.cite);
      expect(m, `bad citation at line ${q.line}: ${q.cite}`).not.toBeNull();
      const first = Number(m?.[1]);
      const last = m?.[2] ? Number(m[2]) : first;
      expect(q.verses.length).toBeGreaterThan(0);
      expect(q.verses.length).toBeLessThanOrEqual(6);
      let next = first;
      const matched: number[] = [];
      for (const v of q.verses) {
        if (v.text === '…') {
          next += 1;
          continue;
        }
        let found: number | null = null;
        for (let k = next; k <= last; k++) {
          if (matches(v.text, source.get(k) ?? '')) {
            found = k;
            break;
          }
        }
        expect(found, `line ${v.line} does not match Inferno I ${first}–${last}: ${v.text}`).not.toBeNull();
        matched.push(found as number);
        next = (found as number) + 1;
      }
      expect(matched[0], `citation start at line ${q.line}`).toBe(first);
      expect(matched[matched.length - 1], `citation end at line ${q.line}`).toBe(last);
    }
  });

  it('follows the typography rules (straight quotes, … and en dashes)', () => {
    expect(fixture).not.toMatch(/[“”‘’]/);
    expect(fixture).not.toContain('...');
    expect(fixture).not.toMatch(/\((Inferno|Purgatorio|Paradiso) [IVXLC]+, \d+-\d+\)/);
  });

  it('exercises every line type, directive, trigger kind and choice form', () => {
    const script = blocks
      .filter((b) => b.type === 'script')
      .flatMap((b) => b.lines.map((l) => l.t))
      .join('\n');
    const required: RegExp[] = [
      /^@mode: page$/m,
      /^@mode: cinematic$/m,
      /^@mode: dialogue$/m,
      /^@mode: play$/m,
      /^@mode: colophon$/m,
      /^@place: /m,
      /^@music: /m,
      /^@ambience: /m,
      /^@chapter_end: ch1$/m,
      /^@trigger: auto$/m,
      /^@trigger: enter:/m,
      /^@trigger: talk:/m,
      /^@trigger: event:/m,
      /^@trigger: after:/m,
      /^NARRATION: /m,
      /^PAGE: /m,
      /^[A-Z][A-Z_]* \([a-z-]+\): /m,
      /^VIRGIL: /m,
      /^QUOTE POET /m,
      /^QUOTE VIRGIL /m,
      /^QUOTE DANTE /m,
      /^> …$/m,
      /^> …\S/m,
      /^> .*…$/m,
      /^GLOSS: /m,
      /^BARK [A-Z_]+: /m,
      /^HINT: /m,
      /^HINT-SHORT: /m,
      /^DO: .*\{event:[a-z0-9_.]+\}/m,
      /^DO: .*\{checkpoint\}/m,
      /^DO: .*\{tutorial:[a-z]+\}/m,
      /^CAM: [a-z-]+ — /m,
      /^CAM: [a-z-]+$/m,
      /^SFX: /m,
      /^EFFECTS: /m,
      /^IF /m,
      /^ELSE IF /m,
      /^ELSE$/m,
      /^END IF$/m,
      /^CHOICE \S+ minor systemic "/m,
      /^CHOICE \S+ major "/m,
      /^CHOICE \S+ minor "/m,
      /^PROMPT: /m,
      /^OPTION [abc] \[".*"\]/m,
      /^OPTION [abc] \[[^"].*\]/m,
      / requires: /m,
      / when: event:/m,
      / when: else$/m,
      /^REVEAL canon=a timing=immediate$/m,
      /^REVEAL canon=all timing=immediate$/m,
      /^REVEAL canon=none timing=deferred$/m,
      /^REVEAL canon=a,b timing=deferred$/m,
      /^NOTE: /m,
      /^END CHOICE$/m,
      /^GOTO inf99\.s\d+\.b\d+$/m,
      /^SAPMA: /m,
      /^EKLEME: /m,
      /^\/\/ /m,
    ];
    for (const re of required) expect(script, `missing ${re}`).toMatch(re);
    // Two-level IF nesting: an IF directly inside another IF.
    expect(script).toMatch(/^IF [^\n]+\nIF /m);
  });

  it('uses every EFFECTS token kind of bible §2.10', () => {
    const tokens = [...fixture.matchAll(/^EFFECTS: (.*)$/gm)].flatMap((m) =>
      (m[1] as string).split(',').map((s) => s.trim()),
    );
    const kinds = [
      /^pity\+\d@[a-z]+$/,
      /^justice\+\d@[a-z]+$/,
      /^trust\+\d$/,
      /^trust-\d$/,
      /^virtue:prudence\+1$/,
      /^virtue:justice\+1$/,
      /^virtue:fortitude\+1$/,
      /^virtue:temperance\+1$/,
      /^word:[A-Z][a-z]+$/,
      /^seal:[A-Z][a-z]+$/,
      /^shed:[A-Z][a-z]+$/,
      /^memory:inf99\.[a-z_]+$/,
      /^codex:inf99\.[a-z_]+$/,
      /^flag:inf99\.[a-z_]+$/,
      /^resolve\+\d$/,
      /^resolve-\d$/,
      /^grace\+\d$/,
      /^grace-\d$/,
      /^gracemax\+1$/,
      /^unlock:(book|words|verse|compose|heart|codex|remembrance|chain)$/,
    ];
    for (const re of kinds) expect(tokens.some((t) => re.test(t)), `no token like ${re}`).toBe(true);
    const unlocks = new Set(tokens.filter((t) => t.startsWith('unlock:')).map((t) => t.slice(7)));
    expect(unlocks).toEqual(new Set(['book', 'words', 'verse', 'compose', 'heart', 'codex', 'remembrance', 'chain']));
  });
});
