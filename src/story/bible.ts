/**
 * Reads the binding registers of the story bible (docs/script/README.md) into
 * data: the §7 scene lists and per-canto front-matter values, the §3.2 choice
 * inventory with the §7 / §2.15 choice blocks, the §4.3 cross-canto flags,
 * §4.5 Codex plan, §4.6 memories, §4.7 system flags, §4.9 events, the §7
 * anchor lines and the §3.4.6 word table.
 *
 * Owner: team A (story-core). Pure. Used by tests (the bible is imported with
 * `?raw` there) to keep `registry.ts` and `words.ts` in sync with the bible,
 * and to lint scripts against the live bible. Never throws: a table it cannot
 * read is simply missing from the result.
 */

import { fromRoman } from './cite';
import {
  BEAT_MODES,
  CHOICE_WEIGHTS,
  type BeatMode,
  type CantoId,
  type ChoiceId,
  type ChoiceWeight,
  type SceneId,
} from './types';

export interface BibleScene {
  readonly id: SceneId;
  readonly title: string;
  /** Line range as written in the table (`4–12`, `—`). */
  readonly lines: string;
  /** Modes named in the table, in order (`dialogue, sonra play` -> dialogue, play). */
  readonly modes: readonly BeatMode[];
  /** Backticked tokens of the "Verilenler" column: effects (`word:Fear`, `codex:…`, `unlock:…`, `gracemax+1`) and choice ids. */
  readonly gives: readonly string[];
}

export interface BibleCanto {
  readonly id: CantoId;
  readonly title: string;
  readonly location: string;
  readonly lines: string;
  readonly epigraph: string;
  readonly closing: string;
  readonly playtime: string;
  readonly mechanics: readonly string[];
  readonly scenes: readonly BibleScene[];
  /** Anchor lines (§7 "Çapa dizeleri"): always shown verbatim. */
  readonly anchors: readonly { readonly first: number; readonly last: number }[];
}

export interface BibleChoice {
  readonly id: ChoiceId;
  readonly canto: CantoId;
  /** Scene from the §3.2 inventory (`I · s3` -> inf01.s3), or null. */
  readonly scene: SceneId | null;
  readonly systemic: boolean;
  readonly weight: ChoiceWeight;
  /** The binding CHOICE … END CHOICE block (§7, §2.15), or null if the bible has none. */
  readonly block: string | null;
}

export interface BibleFlag {
  readonly id: string;
  /** Who raises it (`inf01.c4=a`, `IV s2 (koşullu)`). */
  readonly setBy: string;
  /** Chapter 1 scenes that read it. */
  readonly readers: readonly SceneId[];
}

export interface BibleWord {
  readonly name: string;
  readonly family: string | null;
  readonly category: string;
  readonly canto: CantoId;
  readonly scene: SceneId;
  readonly origin: string;
  readonly citation: string;
  /** Condition column as written (`Her zaman`, `inf05.c4=b`, …). */
  readonly condition: string;
  readonly description: string;
}

export interface BibleRegistry {
  readonly cantos: Readonly<Record<CantoId, BibleCanto>>;
  readonly choices: Readonly<Record<ChoiceId, BibleChoice>>;
  readonly flags: Readonly<Record<string, BibleFlag>>;
  readonly events: readonly string[];
  readonly memories: readonly { readonly id: string; readonly kind: string; readonly setBy: string }[];
  readonly codexPlan: Readonly<Record<CantoId, readonly string[]>>;
  readonly systemFlags: readonly string[];
  readonly words: readonly BibleWord[];
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

/** Lines of the section whose heading starts with `prefix` (up to the next heading of the same or a higher level). */
function section(lines: readonly string[], prefix: string): string[] {
  const start = lines.findIndex((l) => /^#{2,4} /.test(l) && l.replace(/^#+ /, '').startsWith(prefix));
  if (start < 0) return [];
  const level = /^(#+)/.exec(lines[start] as string)?.[1]?.length ?? 2;
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i] as string;
    const h = /^(#+) /.exec(l);
    if (h && (h[1] as string).length <= level && !insideFence(lines, i)) break;
    out.push(l);
  }
  return out;
}

/** True when line i sits inside a fenced block (``` or ````). */
function insideFence(lines: readonly string[], i: number): boolean {
  let open: string | null = null;
  for (let k = 0; k < i; k++) {
    const m = /^(`{3,})/.exec(lines[k] as string);
    if (!m) continue;
    const marker = m[1] as string;
    if (open === null) open = marker;
    else if (marker.length >= open.length && /^`{3,}\s*$/.test(lines[k] as string)) open = null;
  }
  return open !== null;
}

/** Cells of a markdown table row (`| a | b |` -> [a, b]); null for non-rows and separator rows. */
function cells(row: string): string[] | null {
  const t = row.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return null;
  const parts = t
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
  if (parts.every((c) => /^:?-{2,}:?$/.test(c))) return null;
  return parts;
}

function backticked(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1] as string);
}

const ROMAN_CANTO = (roman: string): number | null => fromRoman(roman);

function cantoIdOf(n: number): CantoId {
  return `inf${String(n).padStart(2, '0')}`;
}

/** `IV s6–s7` -> [inf04.s6, inf04.s7]; `III s1` -> [inf03.s1]. */
function sceneRefs(text: string): SceneId[] {
  const out: SceneId[] = [];
  const clean = text.replace(/\([^)]*\)/g, '');
  for (const part of clean.split(',')) {
    const m = /([IVXL]+)\s*·?\s*s(\d+)(?:\s*[–-]\s*s?(\d+))?/.exec(part.trim());
    if (!m) continue;
    const canto = ROMAN_CANTO(m[1] as string);
    if (canto === null) continue;
    const from = Number(m[2]);
    const to = m[3] !== undefined ? Number(m[3]) : from;
    for (let s = from; s <= to; s++) out.push(`${cantoIdOf(canto)}.s${s}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

function extractCantos(lines: readonly string[]): Record<CantoId, BibleCanto> {
  const out: Record<CantoId, BibleCanto> = {};
  for (let i = 0; i < lines.length; i++) {
    const h = /^### 7\.\d+ Kanto ([IVXL]+) — (.+?)(?: \(.*\))?\s*$/.exec(lines[i] as string);
    if (!h) continue;
    const num = ROMAN_CANTO(h[1] as string);
    if (num === null) continue;
    const id = cantoIdOf(num);
    const body = section(lines, (lines[i] as string).replace(/^### /, ''));
    const meta = body.join('\n');
    const val = (key: string): string => new RegExp(`\`${key}: "?([^"\`]*)"?\``).exec(meta)?.[1] ?? '';
    const mech = /`mechanics: \[([^\]]*)\]`/.exec(meta)?.[1] ?? '';
    const scenes: BibleScene[] = [];
    for (const row of body) {
      const c = cells(row);
      if (!c || c.length < 6) continue;
      const sid = /^`((?:inf|pur|par)\d{2}\.s\d+)`$/.exec(c[0] as string)?.[1];
      if (!sid) continue;
      const modes = [...(c[3] as string).matchAll(/[a-z]+/g)]
        .map((m) => m[0])
        .filter((w): w is BeatMode => (BEAT_MODES as readonly string[]).includes(w));
      scenes.push({ id: sid, title: c[1] as string, lines: c[2] as string, modes, gives: backticked(c[5] as string) });
    }
    const anchorLine = body.find((l) => l.startsWith('**Çapa dizeleri:**')) ?? '';
    const anchorText = /\*\*Çapa dizeleri:\*\*\s*[IVXL]+\s+([^(]*)/.exec(anchorLine)?.[1] ?? '';
    const anchors = anchorText
      .replace(/\.\s*$/, '')
      .split(',')
      .map((s) => s.trim())
      .flatMap((s) => {
        const m = /^(\d+)(?:\s*[–-]\s*(\d+))?$/.exec(s);
        return m ? [{ first: Number(m[1]), last: Number(m[2] ?? m[1]) }] : [];
      });
    out[id] = {
      id,
      title: h[2] as string,
      location: val('location'),
      lines: val('lines'),
      epigraph: val('epigraph'),
      closing: val('closing'),
      playtime: val('playtime'),
      mechanics: mech
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      scenes,
      anchors,
    };
  }
  return out;
}

/** Every `CHOICE <id> …` … `END CHOICE` block in the bible, by id (first occurrence wins). */
function extractChoiceBlocks(lines: readonly string[]): Map<ChoiceId, string> {
  const blocks = new Map<ChoiceId, string>();
  for (let i = 0; i < lines.length; i++) {
    const m = /^CHOICE ((?:inf|pur|par)\d{2}\.c\d+) /.exec(lines[i] as string);
    if (!m) continue;
    const body: string[] = [];
    let j = i;
    for (; j < lines.length; j++) {
      body.push(lines[j] as string);
      if (/^END CHOICE\s*$/.test(lines[j] as string)) break;
    }
    if (!blocks.has(m[1] as string)) blocks.set(m[1] as string, body.join('\n'));
    i = j;
  }
  return blocks;
}

function extractChoices(lines: readonly string[]): Record<ChoiceId, BibleChoice> {
  const blocks = extractChoiceBlocks(lines);
  const out: Record<ChoiceId, BibleChoice> = {};
  for (const row of section(lines, '3.2 ')) {
    const c = cells(row);
    if (!c || c.length < 4) continue;
    const id = /^`((?:inf|pur|par)\d{2}\.c\d+)`$/.exec(c[0] as string)?.[1];
    if (!id) continue;
    const weight = (c[3] as string).trim();
    if (!(CHOICE_WEIGHTS as readonly string[]).includes(weight)) continue;
    const scene = sceneRefs(c[1] as string)[0] ?? null;
    out[id] = {
      id,
      canto: id.slice(0, 5),
      scene,
      systemic: /sistemik|systemic/.test(c[2] as string),
      weight: weight as ChoiceWeight,
      block: blocks.get(id) ?? null,
    };
  }
  // Blocks the inventory does not list (should not happen) are still recorded.
  for (const [id, block] of blocks) {
    if (out[id]) continue;
    const head = /^CHOICE \S+ (\S+)( systemic)?/.exec(block);
    const weight = (head?.[1] ?? 'minor') as ChoiceWeight;
    out[id] = { id, canto: id.slice(0, 5), scene: null, systemic: Boolean(head?.[2]), weight, block };
  }
  return out;
}

function extractFlags(lines: readonly string[]): Record<string, BibleFlag> {
  const out: Record<string, BibleFlag> = {};
  for (const row of section(lines, '4.3 ')) {
    const c = cells(row);
    if (!c || c.length < 3) continue;
    const id = /^`([a-z]{3}\d{2}\.[a-z0-9_]+)`$/.exec(c[0] as string)?.[1];
    if (!id) continue;
    out[id] = { id, setBy: (c[1] as string).replace(/`/g, ''), readers: sceneRefs(c[2] as string) };
  }
  return out;
}

function extractIdColumn(lines: readonly string[], prefix: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const row of section(lines, prefix)) {
    const c = cells(row);
    if (!c) continue;
    const id = re.exec(c[0] as string)?.[1];
    if (id) out.push(id);
  }
  return out;
}

function extractCodexPlan(lines: readonly string[]): Record<CantoId, string[]> {
  const out: Record<CantoId, string[]> = {};
  for (const row of section(lines, '4.5 ')) {
    const c = cells(row);
    if (!c || c.length < 2) continue;
    const num = ROMAN_CANTO((c[0] as string).trim());
    if (num === null) continue;
    out[cantoIdOf(num)] = backticked(c[1] as string).filter((t) => /^[a-z]{3}\d{2}\.[a-z0-9_]+$/.test(t));
  }
  return out;
}

function extractMemories(lines: readonly string[]): { id: string; kind: string; setBy: string }[] {
  const out: { id: string; kind: string; setBy: string }[] = [];
  for (const row of section(lines, '4.6 ')) {
    const c = cells(row);
    if (!c || c.length < 3) continue;
    const id = /^`([a-z]{3}\d{2}\.[a-z0-9_]+)`$/.exec(c[0] as string)?.[1];
    if (!id) continue;
    out.push({ id, kind: (c[1] as string).trim(), setBy: (c[2] as string).replace(/`/g, '') });
  }
  return out;
}

function extractWords(lines: readonly string[]): BibleWord[] {
  const out: BibleWord[] = [];
  for (const row of section(lines, '3.4.6 ')) {
    const c = cells(row);
    if (!c || c.length < 8) continue;
    const name = (c[0] as string).trim();
    if (!/^[A-Z][a-z]+$/.test(name)) continue;
    const where = /^([IVXL]+)\s*·\s*s(\d+)$/.exec((c[3] as string).trim());
    const num = where ? ROMAN_CANTO(where[1] as string) : null;
    if (num === null || !where) continue;
    const family = (c[1] as string).trim();
    out.push({
      name,
      family: /^-[a-z]+$/.test(family) ? family : null,
      category: (c[2] as string).trim(),
      canto: cantoIdOf(num),
      scene: `${cantoIdOf(num)}.s${where[2]}`,
      origin: (c[4] as string).trim(),
      citation: (c[5] as string).trim(),
      condition: (c[6] as string).replace(/`/g, '').trim(),
      description: (c[7] as string).trim(),
    });
  }
  return out;
}

/** The registers lint needs (the word table lives in words.ts). */
export type ChapterRegistry = Omit<BibleRegistry, 'words'>;

/** Reads every register the lint and the tests need from the bible text. Never throws. */
export function extractBibleRegistry(readme: string): BibleRegistry {
  const lines = readme.replace(/\r\n?/g, '\n').split('\n');
  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  return {
    cantos: safe(() => extractCantos(lines), {}),
    choices: safe(() => extractChoices(lines), {}),
    flags: safe(() => extractFlags(lines), {}),
    events: safe(() => extractIdColumn(lines, '4.9 ', /^`([a-z]{3}\d{2}\.[a-z0-9_]+)`$/), []),
    memories: safe(() => extractMemories(lines), []),
    codexPlan: safe(() => extractCodexPlan(lines), {}),
    systemFlags: safe(() => extractIdColumn(lines, '4.7 ', /^`((?:ch\d+|sys)\.[a-z0-9_]+)`$/), []),
    words: safe(() => extractWords(lines), []),
  };
}

/** The bible's §2.15 full example (the ````markdown block), or null. */
export function extractFullExample(readme: string): string | null {
  const lines = readme.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.startsWith('### 2.15'));
  if (start < 0) return null;
  const open = lines.findIndex((l, i) => i > start && /^````markdown\s*$/.test(l));
  if (open < 0) return null;
  const close = lines.findIndex((l, i) => i > open && /^````\s*$/.test(l));
  if (close < 0) return null;
  return lines.slice(open + 1, close).join('\n');
}
