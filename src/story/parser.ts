/**
 * Script parser: markdown canto script -> CantoScript AST (bible §2).
 *
 * Owner: team A (story-core). Pure TypeScript (no Phaser, no DOM).
 * Frozen export (docs/ENGINE.md): `parseCanto(text, file): ParseResult`.
 * Extra exports: `parseScriptBlock` (one ```script block, for tools and tests),
 * `parseFrontMatter`, `splitLines`, `PARSE_CODES`.
 *
 * What it reads (the bible is the spec):
 * - YAML front matter subset: `key: value` scalars (plain, "double" or 'single'
 *   quoted, integers), inline lists `[a, b]` (also spread over lines) and block
 *   lists (`- item`), `# comments`.
 * - One H1; `## [id] Title` scenes; `### [id] Title` beats, each with one
 *   ```script block; `## Codex` with ```codex blocks; `## Memories` with
 *   ```memory blocks. Free prose (Turkish design notes), HTML comments and other
 *   fences (```text, ```cento, …) are ignored, headings inside them too.
 * - Every §2.5 line type, IF trees, CHOICE / OPTION / REVEAL, GOTO, SAPMA / EKLEME.
 *
 * Robustness: never throws; never loses a line silently. Malformed lines
 * become `UnknownStmt` plus an L04 diagnostic; structural slips are repaired
 * (a missing END IF / END CHOICE closes at the next sensible point) and
 * reported. Every node carries its 1-based markdown line.
 *
 * Who reports what: the parser reports everything only the raw text shows
 * (front-matter presence and types, block structure, unknown lines, unbalanced
 * IF / CHOICE, malformed conditions and effects); `lintCanto` checks the rules
 * that the AST shows. Together they cover bible §2.14.
 */

import { parseCitation, toRoman } from './cite';
import { parseCondition } from './conditions';
import { parseEffects } from './effects';
import {
  BEAT_MODES,
  CAM_VERBS,
  CANTICLE_PREFIX,
  CANTICLES,
  CHOICE_WEIGHTS,
  CODEX_TABS,
  DIRECTIVE_KEYS,
  ID_PATTERNS,
  MEMORY_KINDS,
  OPTION_LETTERS,
  RESERVED_WORDS,
  REVEAL_TIMINGS,
  SCRIPT_STATUSES,
  SPEAKER_TAGS,
  TUTORIAL_NAMES,
  type Beat,
  type BeatMode,
  type CamVerb,
  type Canticle,
  type CantoId,
  type CantoScript,
  type ChoiceOption,
  type ChoiceStmt,
  type ChoiceWeight,
  type CodexEntry,
  type CodexTab,
  type Condition,
  type Diagnostic,
  type DirectiveKey,
  type DoStmt,
  type DoTag,
  type FrontMatter,
  type FrontMatterKey,
  type MemoryEntry,
  type MemoryKind,
  type OptionLetter,
  type ParseResult,
  type QuoteLine,
  type QuoteStmt,
  type Reveal,
  type RevealTiming,
  type Scene,
  type ScriptStatus,
  type Severity,
  type SpeakerTag,
  type Statement,
  type Trigger,
  type TutorialName,
} from './types';

/**
 * Parse diagnostic codes. Lint codes the parser also emits, because only the
 * raw text shows them: L01 (front-matter presence and types), L02 (malformed
 * heading ids), L03 (@mode placement, extra script blocks), L04 (unknown
 * lines), L21 (unbalanced IF / CHOICE).
 */
export const PARSE_CODES = {
  P00: 'nothing usable in the file',
  P01: 'front matter missing',
  P02: 'front matter not closed',
  P03: 'front matter line not understood',
  P10: 'condition syntax (conditions.ts)',
  P11: 'unknown predicate or variable (conditions.ts)',
  P12: 'malformed id or value in a condition (conditions.ts)',
  P13: 'condition style normalised (conditions.ts)',
  P20: 'invalid EFFECTS token (effects.ts)',
  P21: 'EFFECTS separators normalised (effects.ts)',
  P22: 'EFFECTS capitalisation normalised (effects.ts)',
  P30: 'H1 heading missing or repeated',
  P31: 'heading id not in brackets',
  P32: 'beat heading outside a scene',
  P40: 'code fence not closed',
  P41: 'script block outside a beat',
  P42: 'codex / memory block outside its section',
  P50: 'trigger not understood',
  P51: 'dialogue line format normalised',
  P52: 'CAM line format normalised',
  P53: 'DO tag not understood',
  P60: 'QUOTE header or verse lines malformed',
  P61: 'GLOSS / HINT-SHORT without its anchor',
  P70: 'CHOICE header malformed',
  P71: 'OPTION header malformed',
  P72: 'REVEAL header malformed',
  P80: 'Codex / memory entry malformed',
  P99: 'parser crashed',
} as const;

// ---------------------------------------------------------------------------
// Lines and diagnostics
// ---------------------------------------------------------------------------

/** One markdown line: 1-based number and text without the line break. */
export interface SourceLine {
  readonly n: number;
  readonly text: string;
}

/** Splits text into numbered lines (LF, CRLF or CR; a leading BOM is dropped). */
export function splitLines(text: string): SourceLine[] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return clean.split(/\r\n|\n|\r/).map((t, i) => ({ n: i + 1, text: t }));
}

class Diags {
  readonly list: Diagnostic[] = [];
  constructor(readonly file: string) {}

  add(severity: Severity, code: string, message: string, line: number): void {
    this.list.push({ severity, code, message, pos: { line, file: this.file } });
  }

  error(code: string, message: string, line: number): void {
    this.add('error', code, message, line);
  }

  warn(code: string, message: string, line: number): void {
    this.add('warning', code, message, line);
  }

  /** Diagnostics from conditions.ts / effects.ts (already positioned, maybe without file). */
  merge(ds: readonly Diagnostic[]): void {
    for (const d of ds) {
      this.list.push(d.pos ? { ...d, pos: { line: d.pos.line, file: d.pos.file ?? this.file } } : d);
    }
  }
}

const quoteText = (s: string): string => (s.length > 60 ? `${s.slice(0, 57)}…` : s);

// ---------------------------------------------------------------------------
// Front matter (YAML subset)
// ---------------------------------------------------------------------------

type FieldType = 'string' | 'int' | 'list' | 'status';

const FRONT_SCHEMA: Readonly<Record<FrontMatterKey, FieldType>> = {
  id: 'string',
  canticle: 'string',
  canto: 'int',
  title: 'string',
  title_tr: 'string',
  location: 'string',
  source: 'string',
  lines: 'string',
  epigraph: 'string',
  closing: 'string',
  characters: 'list',
  mechanics: 'list',
  choices: 'list',
  words: 'list',
  memories: 'list',
  codex: 'list',
  flags_set: 'list',
  flags_read: 'list',
  unlocks: 'list',
  playtime: 'string',
  writer: 'string',
  status: 'status',
  version: 'string',
};

/** Front-matter keys in the bible's order (§2.2). */
export const FRONT_MATTER_KEYS: readonly FrontMatterKey[] = Object.keys(FRONT_SCHEMA) as FrontMatterKey[];

type YamlValue = string | number | null | YamlValue[];

interface Scalar {
  readonly value: string | number | null;
  readonly error: string | null;
}

/** One YAML scalar: "double" / 'single' quoted, plain (with `# comment`), integer, null. */
function parseScalar(raw: string): Scalar {
  const s = raw.trim();
  if (s.length === 0) return { value: null, error: null };
  const first = s[0] as string;
  if (first === '"') {
    let out = '';
    let i = 1;
    for (; i < s.length; i++) {
      const ch = s[i] as string;
      if (ch === '\\' && i + 1 < s.length) {
        const nx = s[i + 1] as string;
        out += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx;
        i += 1;
        continue;
      }
      if (ch === '"') break;
      out += ch;
    }
    if (i >= s.length) return { value: out, error: 'unterminated "double quoted" string' };
    const rest = s.slice(i + 1).trim();
    if (rest.length > 0 && !rest.startsWith('#')) return { value: out, error: `unexpected text after the closing quote: ${rest}` };
    return { value: out, error: null };
  }
  if (first === "'") {
    let out = '';
    let i = 1;
    for (; i < s.length; i++) {
      const ch = s[i] as string;
      if (ch === "'") {
        if (s[i + 1] === "'") {
          out += "'";
          i += 1;
          continue;
        }
        break;
      }
      out += ch;
    }
    if (i >= s.length) return { value: out, error: "unterminated 'single quoted' string" };
    const rest = s.slice(i + 1).trim();
    if (rest.length > 0 && !rest.startsWith('#')) return { value: out, error: `unexpected text after the closing quote: ${rest}` };
    return { value: out, error: null };
  }
  const hash = s.search(/\s#/);
  const plain = (hash >= 0 ? s.slice(0, hash) : s).trim();
  if (plain === '~' || plain === 'null') return { value: null, error: null };
  if (/^-?\d+$/.test(plain)) return { value: Number(plain), error: null };
  return { value: plain, error: null };
}

/** Splits `a, "b, c", d` at top-level commas. */
function splitFlowItems(inner: string): string[] {
  const items: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of inner) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === ',') {
      items.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  items.push(cur);
  return items;
}

/** Index of the `]` closing a flow list that starts with `[`, ignoring quoted text; -1 if none. */
function flowListEnd(s: string): number {
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string;
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ']') return i;
  }
  return -1;
}

interface FrontEntry {
  readonly key: string;
  readonly value: YamlValue;
  readonly line: number;
}

export interface FrontMatterParse {
  readonly front: FrontMatter;
  /** Keys as written (in order), with their raw values and lines. */
  readonly entries: readonly FrontEntry[];
  /** Whether a front matter block was found at all. */
  readonly present: boolean;
  /** Index into the line array of the first body line. */
  readonly bodyStart: number;
}

function emptyFront(): { -readonly [K in keyof FrontMatter]: FrontMatter[K] } {
  return {
    id: '',
    canticle: '',
    canto: 0,
    title: '',
    title_tr: '',
    location: '',
    source: '',
    lines: '',
    epigraph: '',
    closing: '',
    characters: [],
    mechanics: [],
    choices: [],
    words: [],
    memories: [],
    codex: [],
    flags_set: [],
    flags_read: [],
    unlocks: [],
    playtime: '',
    writer: '',
    status: 'draft',
    version: '',
  };
}

function readYamlEntries(lines: readonly SourceLine[], start: number, end: number, d: Diags): FrontEntry[] {
  const entries: FrontEntry[] = [];
  let k = start;
  while (k < end) {
    const line = lines[k] as SourceLine;
    const t = line.text;
    const trimmed = t.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      k += 1;
      continue;
    }
    const m = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:(?:\s+(.*)|\s*)$/.exec(t);
    if (!m) {
      d.error('P03', `Front matter line not understood: "${quoteText(trimmed)}" (expected "key: value")`, line.n);
      k += 1;
      continue;
    }
    const key = m[1] as string;
    let raw = (m[2] ?? '').trim();
    const keyLine = line.n;
    k += 1;

    if (raw.startsWith('[')) {
      // Flow list, possibly spread over several lines.
      while (flowListEnd(raw) < 0 && k < end) {
        raw += ` ${(lines[k] as SourceLine).text.trim()}`;
        k += 1;
      }
      const close = flowListEnd(raw);
      if (close < 0) {
        d.error('P03', `List for "${key}" is not closed with "]"`, keyLine);
      }
      const inner = raw.slice(1, close < 0 ? raw.length : close);
      const after = close < 0 ? '' : raw.slice(close + 1).trim();
      if (after.length > 0 && !after.startsWith('#')) {
        d.error('P03', `Unexpected text after the list for "${key}": ${after}`, keyLine);
      }
      const items: YamlValue[] = [];
      if (inner.trim().length > 0) {
        for (const piece of splitFlowItems(inner)) {
          if (piece.trim().length === 0) {
            d.warn('L01', `Empty item in the list for "${key}"`, keyLine);
            continue;
          }
          if (piece.trim().startsWith('[')) {
            d.error('P03', `Nested lists are not supported ("${key}")`, keyLine);
            continue;
          }
          const sc = parseScalar(piece);
          if (sc.error) d.error('P03', `"${key}": ${sc.error}`, keyLine);
          items.push(sc.value);
        }
      }
      entries.push({ key, value: items, line: keyLine });
      continue;
    }

    if (raw === '|' || raw === '>' || raw.startsWith('|-') || raw.startsWith('>-')) {
      d.error('P03', `Block scalars are not supported ("${key}: ${raw}"); write the value on one line`, keyLine);
      while (k < end && /^\s+\S/.test((lines[k] as SourceLine).text)) k += 1;
      entries.push({ key, value: null, line: keyLine });
      continue;
    }

    if (raw.length === 0 || raw.startsWith('#')) {
      // Block list (`- item` lines) or an empty value.
      const items: YamlValue[] = [];
      while (k < end) {
        const next = (lines[k] as SourceLine).text;
        if (next.trim() === '') {
          k += 1;
          continue;
        }
        const item = /^\s*-\s+(.*)$/.exec(next) ?? /^\s*-$/.exec(next);
        if (!item) break;
        const sc = parseScalar(item[1] ?? '');
        if (sc.error) d.error('P03', `"${key}": ${sc.error}`, (lines[k] as SourceLine).n);
        items.push(sc.value);
        k += 1;
      }
      entries.push({ key, value: items.length > 0 ? items : null, line: keyLine });
      continue;
    }

    const sc = parseScalar(raw);
    if (sc.error) d.error('P03', `"${key}": ${sc.error}`, keyLine);
    entries.push({ key, value: sc.value, line: keyLine });
  }
  return entries;
}

function coerceFront(entries: readonly FrontEntry[], d: Diags, fmLine: number): FrontMatter {
  const front = emptyFront();
  const seen = new Map<string, FrontEntry>();
  for (const entry of entries) {
    if (!Object.prototype.hasOwnProperty.call(FRONT_SCHEMA, entry.key)) {
      d.warn('L01', `Unknown front matter field "${entry.key}"`, entry.line);
      continue;
    }
    if (seen.has(entry.key)) {
      d.error('L01', `Front matter field "${entry.key}" appears twice; the first one is used`, entry.line);
      continue;
    }
    seen.set(entry.key, entry);
  }
  const target = front as unknown as Record<string, unknown>;
  for (const key of FRONT_MATTER_KEYS) {
    const entry = seen.get(key);
    if (!entry) {
      d.error('L01', `Front matter field "${key}" is missing (every field is required; write [] for an empty list)`, fmLine);
      continue;
    }
    const type = FRONT_SCHEMA[key];
    const v = entry.value;
    switch (type) {
      case 'string': {
        if (typeof v === 'string') target[key] = v;
        else if (typeof v === 'number') {
          target[key] = String(v);
          d.warn('L01', `Front matter "${key}" should be text; write "${v}" in quotes`, entry.line);
        } else if (v === null) {
          target[key] = '';
          d.warn('L01', `Front matter "${key}" is empty; write "" for an empty text`, entry.line);
        } else {
          d.error('L01', `Front matter "${key}" must be text, not a list`, entry.line);
        }
        break;
      }
      case 'int': {
        if (typeof v === 'number') target[key] = v;
        else if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
          target[key] = Number(v.trim());
          d.warn('L01', `Front matter "${key}" should be a plain integer, not text`, entry.line);
        } else {
          d.error('L01', `Front matter "${key}" must be an integer`, entry.line);
        }
        break;
      }
      case 'list': {
        if (Array.isArray(v)) {
          const items: string[] = [];
          for (const item of v) {
            if (typeof item === 'string' && item.length > 0) items.push(item);
            else if (typeof item === 'number') items.push(String(item));
            else d.error('L01', `Front matter "${key}" has an empty or nested item`, entry.line);
          }
          target[key] = items;
        } else if (v === null) {
          target[key] = [];
          d.warn('L01', `Front matter "${key}" is empty; write [] for an empty list`, entry.line);
        } else {
          target[key] = [String(v)];
          d.warn('L01', `Front matter "${key}" should be a list: [${String(v)}]`, entry.line);
        }
        break;
      }
      case 'status': {
        if (typeof v === 'string' && (SCRIPT_STATUSES as readonly string[]).includes(v)) {
          target[key] = v as ScriptStatus;
        } else {
          d.error('L01', `Front matter "status" must be one of ${SCRIPT_STATUSES.join(', ')}; using draft`, entry.line);
        }
        break;
      }
    }
  }
  return front;
}

/**
 * Reads the front matter at the top of the file (leading blank lines allowed).
 * Never throws; a missing block yields empty values and a P01 error.
 */
export function parseFrontMatter(lines: readonly SourceLine[], file: string, diags?: Diagnostic[]): FrontMatterParse {
  const d = new Diags(file);
  let start = 0;
  while (start < lines.length && (lines[start] as SourceLine).text.trim() === '') start += 1;
  const first = lines[start];
  if (!first || first.text.trim() !== '---') {
    d.error('P01', 'The file does not start with a YAML front matter block (--- … ---)', first?.n ?? 1);
    diags?.push(...d.list);
    return { front: emptyFront(), entries: [], present: false, bodyStart: 0 };
  }
  if (start > 0) d.warn('P03', 'The front matter should start on the first line', first.n);
  let end = -1;
  for (let k = start + 1; k < lines.length; k++) {
    const t = (lines[k] as SourceLine).text.trim();
    if (t === '---' || t === '...') {
      end = k;
      break;
    }
  }
  let bodyStart: number;
  if (end < 0) {
    // Recover: the front matter ends before the first heading.
    let k = start + 1;
    while (k < lines.length && !/^#\s/.test((lines[k] as SourceLine).text)) k += 1;
    end = k;
    bodyStart = k;
    d.error('P02', 'The front matter is not closed with "---"', first.n);
  } else {
    bodyStart = end + 1;
  }
  const entries = readYamlEntries(lines, start + 1, end, d);
  const front = coerceFront(entries, d, first.n);
  diags?.push(...d.list);
  return { front, entries, present: true, bodyStart };
}

// ---------------------------------------------------------------------------
// Line classification (§2.5)
// ---------------------------------------------------------------------------

/** Reserved words written `WORD: text`. */
const COLON_WORDS = [
  'NARRATION',
  'PAGE',
  'GLOSS',
  'HINT',
  'HINT-SHORT',
  'DO',
  'CAM',
  'SFX',
  'EFFECTS',
  'PROMPT',
  'NOTE',
  'SAPMA',
  'EKLEME',
  'ID',
  'TAB',
  'TITLE',
  'RELATED',
  'NAME',
  'KIND',
] as const;
type ColonWord = (typeof COLON_WORDS)[number];

const RESERVED: ReadonlySet<string> = new Set<string>(RESERVED_WORDS);
const COLON_SET: ReadonlySet<string> = new Set<string>(COLON_WORDS);
const ENTRY_FIELDS: ReadonlySet<string> = new Set(['ID', 'TAB', 'TITLE', 'RELATED', 'NAME', 'KIND']);

type Cls =
  | { readonly k: 'blank' }
  | { readonly k: 'comment' }
  | { readonly k: 'directive'; readonly key: string; readonly value: string }
  | { readonly k: 'kw'; readonly word: ColonWord; readonly text: string; readonly strict: boolean }
  | { readonly k: 'bark'; readonly speaker: string; readonly text: string; readonly strict: boolean }
  | { readonly k: 'quote'; readonly voice: string; readonly citation: string | null; readonly trailing: string }
  | { readonly k: 'if'; readonly cond: string }
  | { readonly k: 'elseif'; readonly cond: string }
  | { readonly k: 'else' }
  | { readonly k: 'endif' }
  | { readonly k: 'choice'; readonly rest: string }
  | { readonly k: 'option'; readonly rest: string }
  | { readonly k: 'reveal'; readonly rest: string }
  | { readonly k: 'endchoice' }
  | { readonly k: 'goto'; readonly target: string }
  | { readonly k: 'verse'; readonly text: string; readonly strict: boolean }
  | {
      readonly k: 'say';
      readonly speaker: string;
      readonly tag: string | null;
      readonly text: string;
      readonly strict: boolean;
    }
  | { readonly k: 'unknown'; readonly reason: string };

const BIBLE_SPEAKER_LINE = /^([A-Z][A-Z_]*)(?: \(([a-z-]+)\))?: (.+)$/;

function classify(raw: string): Cls {
  const t = raw.replace(/\s+$/, '').replace(/^\s+/, '');
  if (t.length === 0) return { k: 'blank' };
  if (t.startsWith('//')) return { k: 'comment' };
  if (t.startsWith('>')) {
    if (t.startsWith('> ')) return { k: 'verse', text: t.slice(2), strict: true };
    return { k: 'verse', text: t.slice(1), strict: t.length === 1 };
  }
  if (t.startsWith('@')) {
    const m = /^@([A-Za-z_]+)\s*:\s*(.*)$/.exec(t);
    if (m) return { k: 'directive', key: (m[1] as string).toLowerCase(), value: (m[2] as string).trim() };
    return { k: 'unknown', reason: 'malformed directive (expected "@key: value")' };
  }

  const lead = /^([A-Z][A-Z_-]*)(.*)$/.exec(t);
  if (lead) {
    const word = lead[1] as string;
    const after = lead[2] as string;
    if (RESERVED.has(word)) {
      if (COLON_SET.has(word)) {
        const m = /^(\s*):(\s?)(.*)$/.exec(after);
        if (!m) return { k: 'unknown', reason: `${word} needs a colon: "${word}: …"` };
        const strict = (m[1] as string) === '' && ((m[2] as string) === ' ' || (m[3] as string) === '');
        return { k: 'kw', word: word as ColonWord, text: (m[3] as string).trim(), strict };
      }
      switch (word) {
        case 'BARK': {
          const m = /^\s+([A-Z][A-Z_]*)\s*:\s*(.*)$/.exec(after);
          if (!m) return { k: 'unknown', reason: 'BARK lines look like "BARK SPEAKER: text"' };
          const strict = /^ [A-Z][A-Z_]*: \S/.test(after);
          return { k: 'bark', speaker: m[1] as string, text: (m[2] as string).trim(), strict };
        }
        case 'QUOTE': {
          const m = /^\s+([A-Za-z_]+)\s*(?:\((.*)\))?\s*(.*)$/.exec(after);
          if (!m) return { k: 'unknown', reason: 'QUOTE headers look like "QUOTE VOICE (Inferno III, 49–51)"' };
          return { k: 'quote', voice: m[1] as string, citation: m[2] ?? null, trailing: (m[3] as string).trim() };
        }
        case 'IF':
          return { k: 'if', cond: after.trim() };
        case 'ELSE': {
          if (after.trim() === '') return { k: 'else' };
          const m = /^\s+IF\b(.*)$/.exec(after);
          if (m) return { k: 'elseif', cond: (m[1] as string).trim() };
          return { k: 'unknown', reason: 'expected "ELSE" or "ELSE IF <condition>"' };
        }
        case 'END': {
          if (/^\s+IF$/.test(after)) return { k: 'endif' };
          if (/^\s+CHOICE$/.test(after)) return { k: 'endchoice' };
          return { k: 'unknown', reason: 'expected "END IF" or "END CHOICE"' };
        }
        case 'CHOICE':
          return { k: 'choice', rest: after.trim() };
        case 'OPTION':
          return { k: 'option', rest: after.trim() };
        case 'REVEAL':
          return { k: 'reveal', rest: after.trim() };
        case 'GOTO': {
          const m = /^\s+(\S+)$/.exec(after);
          if (!m) return { k: 'unknown', reason: 'GOTO needs exactly one beat id: "GOTO inf05.s6.b5"' };
          return { k: 'goto', target: m[1] as string };
        }
        default:
          return { k: 'unknown', reason: `"${word}" is reserved and cannot start a line here` };
      }
    }
    const strictMatch = BIBLE_SPEAKER_LINE.exec(t);
    if (strictMatch) {
      return {
        k: 'say',
        speaker: strictMatch[1] as string,
        tag: strictMatch[2] ?? null,
        text: (strictMatch[3] as string).trim(),
        strict: true,
      };
    }
    const loose = /^([A-Z][A-Z_]*)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/.exec(t);
    if (loose) {
      const text = (loose[3] as string).trim();
      if (text.length === 0) return { k: 'unknown', reason: `dialogue line for ${loose[1]} has no text` };
      return { k: 'say', speaker: loose[1] as string, tag: loose[2]?.trim() ?? null, text, strict: false };
    }
  }

  const lower = /^([A-Za-z][A-Za-z_-]*)\s*:/.exec(t);
  if (lower && RESERVED.has((lower[1] as string).toUpperCase())) {
    return { k: 'unknown', reason: `reserved words are upper case: "${(lower[1] as string).toUpperCase()}:"` };
  }
  if (lower) {
    return { k: 'unknown', reason: `speaker ids are upper case (§4.8): "${(lower[1] as string).toUpperCase()}:"` };
  }
  return { k: 'unknown', reason: 'the line matches no line type of bible §2.5' };
}

// ---------------------------------------------------------------------------
// Statement parser (one ```script block, or a codex / memory block)
// ---------------------------------------------------------------------------

interface Stop {
  /** Stop at ELSE IF / ELSE / END IF. */
  readonly ifEnd: boolean;
  /** Stop at OPTION / REVEAL / END CHOICE / CHOICE (inside an option body). */
  readonly choiceEnd: boolean;
}

const NO_STOP: Stop = { ifEnd: false, choiceEnd: false };

interface DirectiveFields {
  mode: BeatMode | null;
  place: string | null;
  trigger: Trigger | null;
  music: string | null;
  ambience: string | null;
  chapterEnd: string | null;
}

function isCamVerb(v: string): v is CamVerb {
  return (CAM_VERBS as readonly string[]).includes(v);
}

function parseTrigger(value: string, line: number, d: Diags): Trigger | null {
  const v = value.trim();
  if (v === 'auto') return { kind: 'auto' };
  const m = /^([A-Za-z]+)\s*:\s*(\S+)\s*$/.exec(v);
  if (!m) {
    d.error('P50', `Trigger "${v}" not understood (auto, enter:<place>, talk:<SPEAKER>, event:<id>, after:<beat>); using auto`, line);
    return null;
  }
  const kind = (m[1] as string).toLowerCase();
  const arg = m[2] as string;
  if (!/^[a-z]+:\S+$/.test(v)) d.warn('P50', `Write the trigger without spaces: "${kind}:${arg}"`, line);
  switch (kind) {
    case 'enter':
      if (!ID_PATTERNS.place.test(arg)) d.error('L02', `"${arg}" is not a map area id (<canto>_<name>, e.g. inf03_gate)`, line);
      return { kind: 'enter', place: arg };
    case 'talk': {
      const speaker = arg.toUpperCase();
      if (speaker !== arg) d.warn('P50', `Speaker ids are upper case: talk:${speaker}`, line);
      return { kind: 'talk', speaker };
    }
    case 'event':
      if (!ID_PATTERNS.named.test(arg)) d.error('L02', `"${arg}" is not an event id (<canto>.<name>)`, line);
      return { kind: 'event', id: arg };
    case 'after':
      if (!ID_PATTERNS.beat.test(arg)) d.error('L02', `"${arg}" is not a beat id (<canto>.s<n>.b<n>)`, line);
      return { kind: 'after', beat: arg };
    default:
      d.error('P50', `Unknown trigger kind "${kind}" (auto, enter, talk, event, after); using auto`, line);
      return null;
  }
}

function parseDoTags(text: string, line: number, d: Diags): { prose: string; tags: DoTag[] } {
  const tags: DoTag[] = [];
  const prose = text
    .replace(/\{([^{}]*)\}/g, (_all, inner: string) => {
      const raw = inner.trim();
      const norm = raw.replace(/\s*:\s*/, ':');
      if (norm !== raw || raw !== inner) d.warn('P53', `DO tags contain no spaces: {${norm}}`, line);
      if (norm === 'checkpoint') {
        tags.push({ kind: 'checkpoint' });
      } else if (norm.startsWith('event:')) {
        const id = norm.slice('event:'.length);
        if (ID_PATTERNS.named.test(id)) tags.push({ kind: 'event', id });
        else {
          d.error('P53', `{event:${id}}: "${id}" is not an event id (<canto>.<name>)`, line);
          tags.push({ kind: 'unknown', raw: inner });
        }
      } else if (norm.startsWith('tutorial:')) {
        const name = norm.slice('tutorial:'.length);
        if ((TUTORIAL_NAMES as readonly string[]).includes(name)) tags.push({ kind: 'tutorial', name: name as TutorialName });
        else {
          d.warn('P53', `{tutorial:${name}}: unknown tutorial (${TUTORIAL_NAMES.join(', ')})`, line);
          tags.push({ kind: 'unknown', raw: inner });
        }
      } else {
        d.warn('P53', `Unknown DO tag {${inner}} (event:<id>, checkpoint, tutorial:<name>)`, line);
        tags.push({ kind: 'unknown', raw: inner });
      }
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
  return { prose, tags };
}

function parseChoiceHeader(
  rest: string,
  line: number,
  d: Diags,
): { id: string; weight: ChoiceWeight; systemic: boolean; title: string } {
  let title = '';
  let before = rest;
  const q = /^(.*?)\s*(["“])(.*)(["”])\s*(.*)$/.exec(rest);
  if (q) {
    before = q[1] as string;
    title = (q[3] as string).trim();
    if (q[2] !== '"' || q[4] !== '"') d.warn('P70', 'Write the CHOICE record title in straight double quotes', line);
    if ((q[5] as string).length > 0) d.error('P70', `Unexpected text after the CHOICE title: ${q[5]}`, line);
    if (title.includes('"')) d.warn('P70', 'The CHOICE record title must not contain double quotes', line);
  } else {
    d.error('P70', 'CHOICE needs a record title in double quotes: CHOICE <id> <weight> [systemic] "<title>"', line);
  }
  const words = before.split(/\s+/).filter((w) => w.length > 0);
  const id = words.shift() ?? '';
  if (id.length === 0) d.error('P70', 'CHOICE needs an id: CHOICE <id> <weight> [systemic] "<title>"', line);
  let weight: ChoiceWeight | null = null;
  let systemic = false;
  let order = 0;
  for (const w of words) {
    if ((CHOICE_WEIGHTS as readonly string[]).includes(w)) {
      if (weight) d.error('P70', `CHOICE has two weights (${weight}, ${w})`, line);
      else weight = w as ChoiceWeight;
      if (order !== 0) d.warn('P70', 'Write the weight before "systemic"', line);
      order = 1;
    } else if (w === 'systemic') {
      systemic = true;
      order = order === 0 ? 2 : order;
    } else {
      d.error('P70', `Unknown word "${w}" in the CHOICE header (weights: ${CHOICE_WEIGHTS.join(', ')}; or "systemic")`, line);
    }
  }
  if (!weight) {
    d.error('P70', `CHOICE ${id} has no weight (${CHOICE_WEIGHTS.join(', ')}); using minor`, line);
    weight = 'minor';
  }
  return { id, weight, systemic, title: title || id };
}

interface OptionHeader {
  readonly letter: OptionLetter | null;
  readonly text: string;
  readonly spoken: boolean;
  readonly speech: string | null;
  readonly requires: Condition | null;
  readonly requiresRaw: string | null;
  readonly when: Condition | 'else' | null;
  readonly whenRaw: string | null;
}

function parseOptionHeader(rest: string, line: number, d: Diags): OptionHeader {
  const m = /^(\S+)\s*(.*)$/.exec(rest);
  const letterRaw = m?.[1] ?? '';
  let tail = m?.[2] ?? '';
  const letterNorm = letterRaw.replace(/[.):]+$/, '').toLowerCase();
  let letter: OptionLetter | null = null;
  if ((OPTION_LETTERS as readonly string[]).includes(letterNorm)) {
    letter = letterNorm as OptionLetter;
    if (letterNorm !== letterRaw) d.warn('P71', `Option letters are written plain and lower case: OPTION ${letterNorm}`, line);
  } else {
    d.error('L15', `OPTION letter must be a, b or c (found "${letterRaw}")`, line);
  }

  let text = '';
  if (tail.startsWith('[')) {
    const close = tail.indexOf(']');
    if (close < 0) {
      d.error('P71', 'Option text is not closed with "]"', line);
      const cut = /\s(requires|when)\s*:/.exec(tail);
      text = tail.slice(1, cut ? cut.index : tail.length).trim();
      tail = cut ? tail.slice(cut.index) : '';
    } else {
      text = tail.slice(1, close).trim();
      tail = tail.slice(close + 1);
    }
  } else {
    d.error('P71', 'Option text goes in brackets: OPTION a [Grieve with him.]', line);
    const cut = /(^|\s)(requires|when)\s*:/.exec(tail);
    text = tail.slice(0, cut ? cut.index : tail.length).trim();
    tail = cut ? tail.slice(cut.index) : '';
  }
  if (text.length === 0) d.error('P71', 'Option text is empty', line);

  // Clauses: requires: <cond> / when: <cond | else>
  let requires: Condition | null = null;
  let requiresRaw: string | null = null;
  let when: Condition | 'else' | null = null;
  let whenRaw: string | null = null;
  const re = /(^|\s)(requires|when)\s*:/g;
  const hits: { kw: string; start: number; end: number }[] = [];
  for (let h = re.exec(tail); h !== null; h = re.exec(tail)) {
    hits.push({ kw: h[2] as string, start: h.index, end: h.index + h[0].length });
  }
  const junk = (hits.length > 0 ? tail.slice(0, (hits[0] as { start: number }).start) : tail).trim();
  if (junk.length > 0) d.error('P71', `Unexpected text after the option text: "${quoteText(junk)}"`, line);
  hits.forEach((hit, idx) => {
    const next = hits[idx + 1];
    const value = tail.slice(hit.end, next ? next.start : tail.length).trim();
    if (hit.kw === 'requires') {
      if (requiresRaw !== null) {
        d.error('P71', 'Option has two requires: clauses', line);
        return;
      }
      requiresRaw = value;
      const parsed = parseCondition(value, { line, file: d.file });
      d.merge(parsed.diagnostics);
      requires = parsed.condition;
    } else {
      if (whenRaw !== null) {
        d.error('P71', 'Option has two when: clauses', line);
        return;
      }
      whenRaw = value;
      if (value.toLowerCase() === 'else') {
        if (value !== 'else') d.warn('P13', 'Write "when: else" in lower case', line);
        when = 'else';
      } else {
        const parsed = parseCondition(value, { line, file: d.file });
        d.merge(parsed.diagnostics);
        when = parsed.condition;
      }
    }
  });

  const spokenMatch = /^["“](.*)["”]$/.exec(text);
  const spoken = spokenMatch !== null && (spokenMatch[1] as string).trim().length > 0;
  const speech = spoken ? (spokenMatch?.[1] as string).trim() : null;
  return { letter, text, spoken, speech, requires, requiresRaw, when, whenRaw };
}

function parseRevealHeader(rest: string, line: number, d: Diags): { canon: Reveal['canon']; timing: RevealTiming } {
  const norm = rest.replace(/\s*=\s*/g, '=').replace(/,\s+/g, ',').trim();
  let canon: Reveal['canon'] | null = null;
  let timing: RevealTiming | null = null;
  let sawCanon = false;
  let sawTiming = false;
  for (const part of norm.split(/\s+/).filter((p) => p.length > 0)) {
    const m = /^([a-z_]+)=(.*)$/.exec(part);
    if (!m) {
      d.error('P72', `REVEAL expects key=value pairs (canon=… timing=…), found "${part}"`, line);
      continue;
    }
    const key = m[1] as string;
    const value = m[2] as string;
    if (key === 'canon') {
      if (sawCanon) d.error('P72', 'REVEAL has two canon= values', line);
      sawCanon = true;
      if (value === 'all' || value === 'none') canon = value;
      else {
        const letters: OptionLetter[] = [];
        for (const l of value.split(',')) {
          if ((OPTION_LETTERS as readonly string[]).includes(l)) {
            if (!letters.includes(l as OptionLetter)) letters.push(l as OptionLetter);
          } else d.error('P72', `canon= takes all, none or option letters like a,b (found "${l}")`, line);
        }
        canon = letters.length > 0 ? letters : 'none';
      }
    } else if (key === 'timing') {
      if (sawTiming) d.error('P72', 'REVEAL has two timing= values', line);
      sawTiming = true;
      if ((REVEAL_TIMINGS as readonly string[]).includes(value)) timing = value as RevealTiming;
      else d.error('P72', `timing= must be immediate or deferred (found "${value}")`, line);
    } else {
      d.error('P72', `Unknown REVEAL field "${key}" (canon, timing)`, line);
    }
  }
  if (!sawCanon) d.error('P72', 'REVEAL needs canon=<letters | all | none>; using none', line);
  if (!sawTiming) d.error('P72', 'REVEAL needs timing=<immediate | deferred>; using immediate', line);
  return { canon: canon ?? 'none', timing: timing ?? 'immediate' };
}

/**
 * Line numbers the citation alone makes certain (§2.6: without a `…` line the
 * lines are consecutive): a quote without skip lines that fills its range
 * exactly; with skip lines, the run before the first skip (counting from the
 * first cited line) and the run after the last skip (counting back from the
 * last). Lines between two skips stay null; load.ts resolves them against the
 * source. An inconsistent citation leaves every line null.
 */
function numberVerses(qlines: readonly QuoteLine[], first: number, last: number): QuoteLine[] {
  const verses = qlines.filter((l) => l.kind === 'verse').length;
  const firstSkip = qlines.findIndex((l) => l.kind === 'skip');
  if (firstSkip < 0) {
    if (last - first + 1 !== verses) return [...qlines];
    return qlines.map((l, idx) => (l.kind === 'verse' ? { ...l, lineNo: first + idx } : l));
  }
  let lastSkip = -1;
  qlines.forEach((l, idx) => {
    if (l.kind === 'skip') lastSkip = idx;
  });
  const head = firstSkip; // verses before the first skip
  const tail = qlines.length - 1 - lastSkip; // verses after the last skip
  if (head === 0 || tail === 0 || first + head - 1 >= last - tail) return [...qlines];
  return qlines.map((l, idx) => {
    if (l.kind !== 'verse') return l;
    if (idx < firstSkip) return { ...l, lineNo: first + idx };
    if (idx > lastSkip) return { ...l, lineNo: last - (qlines.length - 1 - idx) };
    return l;
  });
}

class BlockParser {
  private i = 0;

  constructor(
    private readonly lines: readonly SourceLine[],
    private readonly d: Diags,
    private readonly beatId: string,
  ) {}

  private get cur(): SourceLine | undefined {
    return this.lines[this.i];
  }

  private unknown(line: SourceLine, reason: string, code = 'L04'): Statement {
    this.d.error(code, `${reason}: "${quoteText(line.text.trim())}"`, line.n);
    return { type: 'unknown', raw: line.text, reason, pos: { line: line.n } };
  }

  /** Parses every line of the block. */
  parseAll(): Statement[] {
    const out: Statement[] = [];
    while (this.i < this.lines.length) {
      out.push(...this.parseStatements(NO_STOP));
      // With NO_STOP nothing stops early; guard against an endless loop anyway.
      if (this.i < this.lines.length) this.i += 1;
    }
    return out;
  }

  parseStatements(stop: Stop): Statement[] {
    const out: Statement[] = [];
    while (this.i < this.lines.length) {
      const line = this.cur as SourceLine;
      const c = classify(line.text);
      switch (c.k) {
        case 'blank':
        case 'comment':
          this.i += 1;
          continue;
        case 'elseif':
        case 'else':
        case 'endif':
          if (stop.ifEnd) return out;
          this.i += 1;
          out.push(this.unknown(line, `${c.k === 'endif' ? 'END IF' : c.k === 'else' ? 'ELSE' : 'ELSE IF'} without an open IF`, 'L21'));
          continue;
        case 'option':
        case 'reveal':
        case 'endchoice':
          if (stop.choiceEnd) return out;
          this.i += 1;
          out.push(
            this.unknown(
              line,
              `${c.k === 'option' ? 'OPTION' : c.k === 'reveal' ? 'REVEAL' : 'END CHOICE'} without an open CHOICE`,
              'L21',
            ),
          );
          continue;
        case 'choice':
          if (stop.choiceEnd) return out;
          out.push(this.parseChoice(c, line));
          continue;
        case 'if':
          out.push(this.parseIf(c.cond, line, stop));
          continue;
        case 'quote': {
          const q = this.parseQuote(c, line);
          if (q) out.push(q);
          continue;
        }
        default:
          this.i += 1;
          out.push(...this.simple(c, line));
      }
    }
    return out;
  }

  /** One-line statements (and HINT with its HINT-SHORT). */
  private simple(c: Cls, line: SourceLine): Statement[] {
    const pos = { line: line.n };
    switch (c.k) {
      case 'directive': {
        if (!(DIRECTIVE_KEYS as readonly string[]).includes(c.key)) {
          return [this.unknown(line, `Unknown directive "@${c.key}" (${DIRECTIVE_KEYS.map((k) => `@${k}`).join(', ')})`)];
        }
        return [{ type: 'directive', key: c.key as DirectiveKey, value: c.value, pos }];
      }
      case 'kw':
        return this.keywordLine(c, line);
      case 'bark': {
        if (!c.strict) this.d.warn('P51', 'BARK lines look like "BARK SPEAKER: text"', line.n);
        if (c.text.length === 0) return [this.unknown(line, 'BARK line has no text')];
        return [{ type: 'bark', speaker: c.speaker, text: c.text, pos }];
      }
      case 'goto':
        if (!ID_PATTERNS.beat.test(c.target)) this.d.error('L21', `GOTO target "${c.target}" is not a beat id`, line.n);
        return [{ type: 'goto', target: c.target, pos }];
      case 'verse':
        return [this.unknown(line, 'Verse line without a QUOTE header above it')];
      case 'say': {
        let tag: SpeakerTag | null = null;
        if (c.tag !== null) {
          const lower = c.tag.toLowerCase();
          if ((SPEAKER_TAGS as readonly string[]).includes(lower)) {
            tag = lower as SpeakerTag;
            if (lower !== c.tag) this.d.warn('P51', `Speaker tags are lower case: (${lower})`, line.n);
          } else {
            this.d.warn('L04', `Unknown speaker tag "(${c.tag})"; the line plays without a tag (tags: ${SPEAKER_TAGS.join(', ')})`, line.n);
          }
        }
        const exact = `${c.speaker}${c.tag !== null ? ` (${c.tag})` : ''}: ${c.text}` === line.text.trim();
        if (!c.strict && !exact) {
          this.d.warn('P51', `Dialogue lines look like "${c.speaker}: text" or "${c.speaker} (tag): text"`, line.n);
        }
        return [{ type: 'say', speaker: c.speaker, tag, text: c.text, pos }];
      }
      case 'unknown':
        return [this.unknown(line, c.reason)];
      default:
        return [this.unknown(line, 'Unexpected line')];
    }
  }

  private keywordLine(c: Extract<Cls, { k: 'kw' }>, line: SourceLine): Statement[] {
    const pos = { line: line.n };
    if (!c.strict) this.d.warn('P51', `Write "${c.word}: " with the colon right after the word and one space`, line.n);
    if (ENTRY_FIELDS.has(c.word)) {
      return [this.unknown(line, `${c.word}: is a Codex / memory field and belongs in a \`\`\`codex or \`\`\`memory block`)];
    }
    const needsText = c.word !== 'CAM';
    if (needsText && c.text.length === 0) return [this.unknown(line, `${c.word}: line has no text`)];
    switch (c.word) {
      case 'NARRATION':
        return [{ type: 'narration', text: c.text, pos }];
      case 'PAGE':
        return [{ type: 'page', text: c.text, pos }];
      case 'SFX':
        return [{ type: 'sfx', text: c.text, pos }];
      case 'SAPMA':
      case 'EKLEME':
        return [{ type: 'note', kind: c.word, text: c.text, pos }];
      case 'DO': {
        const { prose, tags } = parseDoTags(c.text, line.n, this.d);
        const stmt: DoStmt = { type: 'do', text: prose, tags, pos };
        return [stmt];
      }
      case 'CAM':
        return [this.camLine(c.text, line)];
      case 'EFFECTS': {
        const parsed = parseEffects(c.text, { line: line.n, file: this.d.file });
        this.d.merge(parsed.diagnostics);
        return [{ type: 'effects', effects: parsed.effects, raw: c.text, invalid: parsed.invalid, pos }];
      }
      case 'HINT': {
        let short: string | null = null;
        let j = this.i;
        while (j < this.lines.length) {
          const k = classify((this.lines[j] as SourceLine).text);
          if (k.k === 'blank' || k.k === 'comment') {
            j += 1;
            continue;
          }
          if (k.k === 'kw' && k.word === 'HINT-SHORT') {
            if (k.text.length === 0) this.d.warn('P61', 'HINT-SHORT has no text', (this.lines[j] as SourceLine).n);
            else short = k.text;
            this.i = j + 1;
          }
          break;
        }
        return [{ type: 'hint', text: c.text, short, pos }];
      }
      case 'HINT-SHORT':
        this.d.warn('P61', 'HINT-SHORT without a HINT right above it; used as the hint itself', line.n);
        return [{ type: 'hint', text: c.text, short: null, pos }];
      case 'GLOSS':
        return [this.unknown(line, 'GLOSS must follow the QUOTE block it explains', 'P61')];
      case 'PROMPT':
        return [this.unknown(line, 'PROMPT belongs right under a CHOICE line')];
      case 'NOTE':
        return [this.unknown(line, 'NOTE belongs in a REVEAL group (or a Codex / memory block)')];
      default:
        return [this.unknown(line, `Unexpected ${c.word}: line`)];
    }
  }

  private camLine(rest: string, line: SourceLine): Statement {
    const m = /^([A-Za-z]+(?:-[A-Za-z]+)*)(.*)$/.exec(rest);
    if (!m) return this.unknown(line, `CAM needs a verb (${CAM_VERBS.join(', ')})`);
    const verbRaw = m[1] as string;
    const verb = verbRaw.toLowerCase();
    if (!isCamVerb(verb)) return this.unknown(line, `Unknown CAM verb "${verbRaw}" (${CAM_VERBS.join(', ')})`);
    if (verb !== verbRaw) this.d.warn('P52', `CAM verbs are lower case: ${verb}`, line.n);
    const after = m[2] as string;
    let text = '';
    if (after.trim().length > 0) {
      const sep = /^\s*(—|–|--|-|:)\s*(.*)$/.exec(after);
      if (sep) {
        text = (sep[2] as string).trim();
        if (!/^ — /.test(after) && text.length > 0) this.d.warn('P52', `Separate the CAM verb and its description with " — " (em dash)`, line.n);
      } else {
        text = after.trim();
        this.d.warn('P52', `Separate the CAM verb and its description with " — " (em dash)`, line.n);
      }
    }
    return { type: 'cam', verb, text, pos: { line: line.n } };
  }

  /** QUOTE header + `> ` lines + optional GLOSS. Returns null (with a diagnostic) when no verse follows. */
  parseQuote(c: Extract<Cls, { k: 'quote' }>, line: SourceLine): QuoteStmt | null {
    this.i += 1;
    let voice = c.voice;
    if (voice !== voice.toUpperCase()) {
      voice = voice.toUpperCase();
      this.d.warn('P60', `QUOTE voices are upper case: ${voice}`, line.n);
    }
    const citationRaw = (c.citation ?? '').trim();
    if (c.citation === null) this.d.error('P60', 'QUOTE needs a citation in parentheses: QUOTE POET (Inferno III, 1–3)', line.n);
    const citation = citationRaw.length > 0 ? parseCitation(citationRaw) : null;
    if (citationRaw.length > 0 && !citation) {
      this.d.error('P60', `Citation "${citationRaw}" not understood (e.g. Inferno III, 49–51 or Inferno III, 9)`, line.n);
    }
    if (c.trailing.length > 0) this.d.warn('P60', `Unexpected text after the QUOTE citation: "${c.trailing}"`, line.n);

    const qlines: QuoteLine[] = [];
    let gap = false;
    while (this.i < this.lines.length) {
      const l = this.cur as SourceLine;
      const k = classify(l.text);
      if (k.k === 'blank' || k.k === 'comment') {
        // A gap ends the block unless more verse follows (tolerated with a warning).
        let j = this.i + 1;
        while (j < this.lines.length) {
          const kk = classify((this.lines[j] as SourceLine).text);
          if (kk.k !== 'blank' && kk.k !== 'comment') break;
          j += 1;
        }
        const after = this.lines[j];
        if (after && classify(after.text).k === 'verse') {
          gap = true;
          this.i = j;
          continue;
        }
        break;
      }
      if (k.k !== 'verse') break;
      if (gap) {
        this.d.warn('P60', 'Blank line inside a QUOTE block (the block ends at the first line not starting with "> ")', l.n);
        gap = false;
      }
      if (!k.strict) this.d.warn('P60', 'Verse lines start with "> " (greater-than sign and one space)', l.n);
      const text = k.text.replace(/\s+$/, '');
      const core = text.trim();
      if (core.length === 0) {
        this.d.error('P60', 'Empty verse line', l.n);
      } else if (core === '…' || core === '...') {
        if (core === '...') this.d.error('L22', 'Write the skip line as "> …" (one ellipsis character, not three dots)', l.n);
        qlines.push({ kind: 'skip', pos: { line: l.n } });
      } else {
        qlines.push({
          kind: 'verse',
          text,
          lineNo: null,
          cutStart: /^(…|\.\.\.)/.test(core),
          cutEnd: /(…|\.\.\.)$/.test(core),
          pos: { line: l.n },
        });
      }
      this.i += 1;
    }

    // GLOSS right after the verse (blank lines and comments may sit between).
    let gloss: string | null = null;
    let j = this.i;
    while (j < this.lines.length) {
      const k = classify((this.lines[j] as SourceLine).text);
      if (k.k === 'blank' || k.k === 'comment') {
        j += 1;
        continue;
      }
      if (k.k === 'kw' && k.word === 'GLOSS') {
        if (k.text.length === 0) this.d.warn('P61', 'GLOSS has no text', (this.lines[j] as SourceLine).n);
        else gloss = k.text;
        this.i = j + 1;
      }
      break;
    }

    if (!qlines.some((l) => l.kind === 'verse')) {
      this.d.error('P60', 'QUOTE block has no verse lines ("> …")', line.n);
      return null;
    }

    const lines = citation ? numberVerses(qlines, citation.first, citation.last) : qlines;
    return { type: 'quote', voice, citation, citationRaw, lines, gloss, pos: { line: line.n } };
  }

  private parseIf(cond: string, line: SourceLine, outer: Stop): Statement {
    this.i += 1;
    const inner: Stop = { ifEnd: true, choiceEnd: outer.choiceEnd };
    const branches: { condition: Condition; raw: string; body: Statement[]; pos: { line: number } }[] = [];
    const first = this.condition(cond, line, 'IF');
    branches.push({ condition: first, raw: cond, body: this.parseStatements(inner), pos: { line: line.n } });
    let elseBody: Statement[] | null = null;
    let closed = false;
    while (this.i < this.lines.length) {
      const l = this.cur as SourceLine;
      const c = classify(l.text);
      if (c.k === 'elseif') {
        this.i += 1;
        if (elseBody) {
          this.d.error('L21', 'ELSE IF after ELSE; its lines join the ELSE branch', l.n);
          elseBody.push(...this.parseStatements(inner));
          continue;
        }
        const condition = this.condition(c.cond, l, 'ELSE IF');
        branches.push({ condition, raw: c.cond, body: this.parseStatements(inner), pos: { line: l.n } });
        continue;
      }
      if (c.k === 'else') {
        this.i += 1;
        if (elseBody) {
          this.d.error('L21', 'Second ELSE in one IF; its lines join the first ELSE branch', l.n);
          elseBody.push(...this.parseStatements(inner));
          continue;
        }
        elseBody = this.parseStatements(inner);
        continue;
      }
      if (c.k === 'endif') {
        this.i += 1;
        closed = true;
        break;
      }
      // An OPTION / REVEAL / END CHOICE / CHOICE line closes an IF opened inside an option.
      break;
    }
    if (!closed) {
      const where = this.cur ? `before line ${(this.cur as SourceLine).n}` : 'at the end of the block';
      this.d.error('L21', `IF without END IF (closed ${where})`, line.n);
    }
    return { type: 'if', branches, elseBody, pos: { line: line.n } };
  }

  private condition(text: string, line: SourceLine, what: string): Condition {
    if (text.trim().length === 0) {
      this.d.error('P10', `${what} needs a condition`, line.n);
      return { type: 'const', value: false };
    }
    const parsed = parseCondition(text, { line: line.n, file: this.d.file });
    this.d.merge(parsed.diagnostics);
    return parsed.condition;
  }

  private parseChoice(c: Extract<Cls, { k: 'choice' }>, line: SourceLine): Statement {
    this.i += 1;
    const header = parseChoiceHeader(c.rest, line.n, this.d);
    let prompt: string | null = null;
    const options: ChoiceOption[] = [];
    let reveal: Reveal | null = null;
    let closed = false;
    let implicit = false;
    while (this.i < this.lines.length) {
      const l = this.cur as SourceLine;
      const k = classify(l.text);
      if (k.k === 'blank' || k.k === 'comment') {
        this.i += 1;
        continue;
      }
      if (k.k === 'endchoice') {
        this.i += 1;
        closed = true;
        break;
      }
      if (k.k === 'kw' && k.word === 'PROMPT') {
        this.i += 1;
        if (prompt !== null) this.d.error('L04', 'CHOICE has two PROMPT lines', l.n);
        else {
          if (options.length > 0) this.d.warn('L04', 'PROMPT belongs right under the CHOICE line', l.n);
          if (k.text.length === 0) this.d.warn('L04', 'PROMPT has no text', l.n);
          else prompt = k.text;
        }
        continue;
      }
      if (k.k === 'option') {
        if (reveal) this.d.error('L04', 'OPTION after REVEAL: the REVEAL group comes after the last option', l.n);
        const option = this.parseOption(k, l);
        if (option) options.push(option);
        continue;
      }
      if (k.k === 'reveal') {
        const parsed = this.parseReveal(k, l);
        if (reveal) this.d.error('L14', 'CHOICE has two REVEAL groups; the first one is used', l.n);
        else reveal = parsed;
        continue;
      }
      if (k.k === 'choice') {
        this.d.error('L21', `CHOICE ${header.id} has no END CHOICE before the next CHOICE (choices are not nested)`, line.n);
        implicit = true;
        break;
      }
      if (reveal || options.length > 0) {
        // Anything else after the options: END CHOICE was forgotten. Close here so the line plays for everyone.
        this.d.error('L21', `CHOICE ${header.id} has no END CHOICE (closed before line ${l.n})`, line.n);
        implicit = true;
        break;
      }
      this.i += 1;
      this.d.error('L04', `Only PROMPT and OPTION lines may follow CHOICE: "${quoteText(l.text.trim())}"`, l.n);
    }
    if (!closed && !implicit) this.d.error('L21', `CHOICE ${header.id} has no END CHOICE`, line.n);
    if (options.length === 0) this.d.error('L15', `CHOICE ${header.id} has no OPTION lines`, line.n);
    const stmt: ChoiceStmt = {
      type: 'choice',
      id: header.id,
      weight: header.weight,
      systemic: header.systemic,
      title: header.title,
      prompt,
      options,
      reveal,
      beatId: this.beatId,
      pos: { line: line.n },
    };
    return stmt;
  }

  private parseOption(c: Extract<Cls, { k: 'option' }>, line: SourceLine): ChoiceOption | null {
    this.i += 1;
    const h = parseOptionHeader(c.rest, line.n, this.d);
    const body = this.parseStatements({ ifEnd: false, choiceEnd: true });
    if (!h.letter) return null;
    const effects = body.flatMap((s) => (s.type === 'effects' ? [...s.effects] : []));
    return {
      letter: h.letter,
      text: h.text,
      spoken: h.spoken,
      speech: h.speech,
      requires: h.requires,
      requiresRaw: h.requiresRaw,
      when: h.when,
      whenRaw: h.whenRaw,
      body,
      effects,
      pos: { line: line.n },
    };
  }

  private parseReveal(c: Extract<Cls, { k: 'reveal' }>, line: SourceLine): Reveal {
    this.i += 1;
    const { canon, timing } = parseRevealHeader(c.rest, line.n, this.d);
    const quotes: QuoteStmt[] = [];
    let note: string | null = null;
    while (this.i < this.lines.length) {
      const l = this.cur as SourceLine;
      const k = classify(l.text);
      if (k.k === 'blank' || k.k === 'comment') {
        this.i += 1;
        continue;
      }
      if (k.k === 'quote') {
        const q = this.parseQuote(k, l);
        if (q) quotes.push(q);
        continue;
      }
      if (k.k === 'kw' && k.word === 'NOTE') {
        this.i += 1;
        if (note !== null) this.d.error('L14', 'REVEAL has two NOTE lines; the first one is used', l.n);
        else note = k.text;
        continue;
      }
      if (k.k === 'kw' && k.word === 'GLOSS') {
        this.i += 1;
        this.d.error('P61', 'GLOSS must follow the QUOTE block it explains', l.n);
        continue;
      }
      break;
    }
    return { canon, timing, quotes, note: note ?? '', pos: { line: line.n } };
  }

  /** Reads a ```codex or ```memory block into its fields. */
  parseEntry(kind: 'codex' | 'memory'): {
    fields: Map<string, { value: string; line: number }>;
    quote: QuoteStmt | null;
  } {
    const allowed = kind === 'codex' ? ['ID', 'TAB', 'TITLE', 'NOTE', 'RELATED'] : ['ID', 'NAME', 'KIND', 'NOTE'];
    const fields = new Map<string, { value: string; line: number }>();
    let quote: QuoteStmt | null = null;
    let last: string | null = null;
    while (this.i < this.lines.length) {
      const l = this.cur as SourceLine;
      const k = classify(l.text);
      if (k.k === 'blank' || k.k === 'comment') {
        this.i += 1;
        continue;
      }
      if (k.k === 'quote') {
        const q = this.parseQuote(k, l);
        if (quote) this.d.error('P80', `A ${kind} entry has one QUOTE; this one is ignored`, l.n);
        else quote = q;
        last = 'QUOTE';
        continue;
      }
      this.i += 1;
      if (k.k === 'kw' && allowed.includes(k.word)) {
        if (fields.has(k.word)) this.d.error('P80', `${k.word}: appears twice in a ${kind} entry; the first one is used`, l.n);
        else fields.set(k.word, { value: k.text, line: l.n });
        last = k.word;
        continue;
      }
      if (k.k === 'kw' && (ENTRY_FIELDS.has(k.word) || k.word === 'NOTE')) {
        this.d.error('P80', `${k.word}: is not a field of a ${kind} entry (${allowed.join(', ')}, QUOTE)`, l.n);
        continue;
      }
      if (k.k === 'kw' && k.word === 'GLOSS') {
        this.d.error('P61', 'GLOSS must follow the QUOTE block it explains', l.n);
        continue;
      }
      if (last === 'NOTE' && k.k === 'unknown') {
        const note = fields.get('NOTE');
        if (note) {
          fields.set('NOTE', { value: `${note.value} ${l.text.trim()}`, line: note.line });
          this.d.warn('P80', 'NOTE continues on a new line; keep it on one line', l.n);
          continue;
        }
      }
      this.d.error('L04', `Line not understood in a ${kind} entry: "${quoteText(l.text.trim())}"`, l.n);
    }
    return { fields, quote };
  }
}

// ---------------------------------------------------------------------------
// Beat directives
// ---------------------------------------------------------------------------

function readDirectives(
  lines: readonly SourceLine[],
  blockLine: number,
  d: Diags,
): { fields: DirectiveFields; rest: SourceLine[] } {
  const fields: DirectiveFields = { mode: null, place: null, trigger: null, music: null, ambience: null, chapterEnd: null };
  const setKeys = new Set<string>();
  let k = 0;
  let first = true;
  let modeLine = -1;
  while (k < lines.length) {
    const line = lines[k] as SourceLine;
    const c = classify(line.text);
    if (c.k === 'blank' || c.k === 'comment') {
      k += 1;
      continue;
    }
    if (c.k !== 'directive') break;
    k += 1;
    const wasFirst = first;
    first = false;
    if (!(DIRECTIVE_KEYS as readonly string[]).includes(c.key)) {
      d.error('L04', `Unknown directive "@${c.key}" (${DIRECTIVE_KEYS.map((x) => `@${x}`).join(', ')})`, line.n);
      continue;
    }
    if (setKeys.has(c.key)) {
      d.error('L03', `@${c.key} appears twice at the top of the beat; the first one is used`, line.n);
      continue;
    }
    setKeys.add(c.key);
    switch (c.key as DirectiveKey) {
      case 'mode':
        modeLine = line.n;
        if (!wasFirst) d.error('L03', '@mode must be the first line of the script block', line.n);
        if ((BEAT_MODES as readonly string[]).includes(c.value)) fields.mode = c.value as BeatMode;
        else d.error('L03', `Unknown @mode "${c.value}" (${BEAT_MODES.join(', ')}); using cinematic`, line.n);
        break;
      case 'place':
        if (c.value.length === 0) d.error('L03', '@place has no value', line.n);
        else {
          if (!ID_PATTERNS.place.test(c.value)) d.error('L02', `"${c.value}" is not a map area id (<canto>_<name>, e.g. inf03_gate)`, line.n);
          fields.place = c.value;
        }
        break;
      case 'trigger':
        fields.trigger = parseTrigger(c.value, line.n, d);
        break;
      case 'music':
        fields.music = c.value || null;
        break;
      case 'ambience':
        fields.ambience = c.value || null;
        break;
      case 'chapter_end':
        if (!/^ch\d+$/.test(c.value)) d.error('L03', `@chapter_end takes a chapter id like ch1 (found "${c.value}")`, line.n);
        fields.chapterEnd = c.value || null;
        break;
    }
  }
  let rest = lines.slice(k);
  if (modeLine < 0) {
    // A @mode further down still decides the mode (reported once here).
    const idx = rest.findIndex((l) => {
      const c = classify(l.text);
      return c.k === 'directive' && c.key === 'mode';
    });
    const found = idx >= 0 ? (rest[idx] as SourceLine) : null;
    if (found) {
      const c = classify(found.text) as Extract<Cls, { k: 'directive' }>;
      d.error('L03', '@mode must be the first line of the script block', found.n);
      if ((BEAT_MODES as readonly string[]).includes(c.value)) fields.mode = c.value as BeatMode;
      rest = rest.filter((_, i) => i !== idx);
    } else {
      d.error('L03', 'The script block has no @mode line; using cinematic', blockLine);
    }
  }
  return { fields, rest };
}

// ---------------------------------------------------------------------------
// Document structure
// ---------------------------------------------------------------------------

interface Block {
  readonly lines: SourceLine[];
  /** Line of the opening fence. */
  readonly line: number;
}

interface SceneDraft {
  readonly id: string;
  readonly title: string;
  readonly line: number;
  readonly beats: BeatDraft[];
}

interface BeatDraft {
  readonly id: string;
  readonly title: string;
  readonly line: number;
  readonly scene: SceneDraft;
  readonly blocks: Block[];
}

const CANTICLE_BY_PREFIX: Readonly<Record<string, Canticle>> = Object.fromEntries(
  CANTICLES.map((c) => [CANTICLE_PREFIX[c], c]),
) as Record<string, Canticle>;

function prefixOf(id: string): string | null {
  const m = /^([a-z]{3}\d{2})(?:[._]|$)/.exec(id);
  return m ? (m[1] as string) : null;
}

/** `/docs/script/inferno-03.md` -> `inf03`; other names -> null. */
export function cantoIdFromScriptPath(file: string): CantoId | null {
  const m = /(inferno|purgatorio|paradiso)-(\d{2})\.md$/i.exec(file);
  if (!m) return null;
  const canticle = CANTICLES.find((c) => c.toLowerCase() === (m[1] as string).toLowerCase());
  return canticle ? `${CANTICLE_PREFIX[canticle]}${m[2]}` : null;
}

function buildBeat(draft: BeatDraft, index: number, cantoId: CantoId, d: Diags): Beat {
  const base = {
    id: draft.id,
    sceneId: draft.scene.id,
    cantoId: prefixOf(draft.id) ?? cantoId,
    title: draft.title,
    index,
    pos: { line: draft.line, file: d.file },
  };
  const firstBlock = draft.blocks[0];
  if (!firstBlock) {
    return {
      ...base,
      mode: 'cinematic',
      place: null,
      trigger: { kind: 'auto' },
      music: null,
      ambience: null,
      chapterEnd: null,
      lines: [],
      hasScript: false,
    };
  }
  const { fields, rest } = readDirectives(firstBlock.lines, firstBlock.line, d);
  const statements = new BlockParser(rest, d, draft.id).parseAll();
  for (const extra of draft.blocks.slice(1)) {
    d.error('L03', `Beat ${draft.id} has more than one \`\`\`script block; their lines are joined`, extra.line);
    statements.push(...new BlockParser(extra.lines, d, draft.id).parseAll());
  }
  return {
    ...base,
    mode: fields.mode ?? 'cinematic',
    place: fields.place,
    trigger: fields.trigger ?? { kind: 'auto' },
    music: fields.music,
    ambience: fields.ambience,
    chapterEnd: fields.chapterEnd,
    lines: statements,
    hasScript: true,
  };
}

function buildCodex(block: Block, cantoId: CantoId, d: Diags): CodexEntry | null {
  const { fields, quote } = new BlockParser(block.lines, d, '').parseEntry('codex');
  const id = fields.get('ID');
  if (!id || id.value.length === 0) {
    d.error('P80', 'Codex entry without an ID: line; the entry is skipped', block.line);
    return null;
  }
  if (!ID_PATTERNS.named.test(id.value)) d.error('L02', `"${id.value}" is not a codex id (<canto>.<name>)`, id.line);
  const tabField = fields.get('TAB');
  let tab: CodexTab = 'lore';
  if (!tabField) d.error('P80', `Codex entry ${id.value} has no TAB: (${CODEX_TABS.join(', ')}); using lore`, block.line);
  else if ((CODEX_TABS as readonly string[]).includes(tabField.value)) tab = tabField.value as CodexTab;
  else d.error('P80', `Unknown codex TAB "${tabField.value}" (${CODEX_TABS.join(', ')}); using lore`, tabField.line);
  const title = fields.get('TITLE');
  if (!title || title.value.length === 0) d.error('P80', `Codex entry ${id.value} has no TITLE:`, block.line);
  const note = fields.get('NOTE');
  if (!note) d.error('P80', `Codex entry ${id.value} has no NOTE:`, block.line);
  const related = (fields.get('RELATED')?.value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return {
    id: id.value,
    cantoId: prefixOf(id.value) ?? cantoId,
    tab,
    title: title?.value || id.value,
    quote,
    note: note?.value ?? '',
    related,
    pos: { line: block.line, file: d.file },
  };
}

function buildMemory(block: Block, cantoId: CantoId, d: Diags): MemoryEntry | null {
  const { fields, quote } = new BlockParser(block.lines, d, '').parseEntry('memory');
  const id = fields.get('ID');
  if (!id || id.value.length === 0) {
    d.error('P80', 'Memory entry without an ID: line; the entry is skipped', block.line);
    return null;
  }
  if (!ID_PATTERNS.named.test(id.value)) d.error('L02', `"${id.value}" is not a memory id (<canto>.<name>)`, id.line);
  const name = fields.get('NAME');
  if (!name || name.value.length === 0) d.error('P80', `Memory entry ${id.value} has no NAME:`, block.line);
  const kindField = fields.get('KIND');
  let kind: MemoryKind = 'kept';
  if (!kindField) d.error('P80', `Memory entry ${id.value} has no KIND: (${MEMORY_KINDS.join(', ')}); using kept`, block.line);
  else if ((MEMORY_KINDS as readonly string[]).includes(kindField.value)) kind = kindField.value as MemoryKind;
  else d.error('P80', `Unknown memory KIND "${kindField.value}" (${MEMORY_KINDS.join(', ')}); using kept`, kindField.line);
  const note = fields.get('NOTE');
  if (!note) d.error('P80', `Memory entry ${id.value} has no NOTE:`, block.line);
  return {
    id: id.value,
    cantoId: prefixOf(id.value) ?? cantoId,
    name: name?.value || id.value,
    kind,
    quote,
    note: note?.value ?? '',
    pos: { line: block.line, file: d.file },
  };
}

function parseCantoUnsafe(text: string, file: string): ParseResult {
  const d = new Diags(file);
  const lines = splitLines(text);
  if (lines.every((l) => l.text.trim() === '')) {
    d.error('P00', 'The script file is empty', 1);
    return { canto: null, diagnostics: d.list };
  }

  const fm = parseFrontMatter(lines, file, d.list);

  let h1: string | null = null;
  const scenes: SceneDraft[] = [];
  let scene: SceneDraft | null = null;
  let beat: BeatDraft | null = null;
  let section: 'scenes' | 'codex' | 'memories' | 'other' = 'scenes';
  const codexBlocks: Block[] = [];
  const memoryBlocks: Block[] = [];
  const beatIds = new Map<string, number>();

  let i = fm.bodyStart;
  while (i < lines.length) {
    const line = lines[i] as SourceLine;
    const t = line.text;

    // HTML comments are invisible to the parser.
    if (/^\s*<!--/.test(t)) {
      let j = i;
      while (j < lines.length && !(lines[j] as SourceLine).text.includes('-->')) j += 1;
      i = j + 1;
      continue;
    }

    const fence = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(t);
    if (fence) {
      const marker = fence[2] as string;
      const info = (fence[3] as string).trim();
      const langRaw = info.split(/\s+/)[0] ?? '';
      const lang = langRaw.toLowerCase();
      let j = i + 1;
      const closeRe = marker[0] === '`' ? /^ {0,3}(`{3,})\s*$/ : /^ {0,3}(~{3,})\s*$/;
      while (j < lines.length) {
        const cm = closeRe.exec((lines[j] as SourceLine).text);
        if (cm && (cm[1] as string).length >= marker.length) break;
        j += 1;
      }
      if (j >= lines.length) d.error('P40', `Code fence opened here is never closed (\`${marker}${langRaw}\`)`, line.n);
      const inner = lines.slice(i + 1, Math.min(j, lines.length));
      const block: Block = { lines: inner, line: line.n };
      if (lang === 'script' || lang === 'codex' || lang === 'memory') {
        if (langRaw !== lang) d.warn('P41', `Write the fence info in lower case: \`\`\`${lang}`, line.n);
      }
      if (lang === 'script') {
        if (beat) beat.blocks.push(block);
        else {
          d.error(
            'P41',
            section === 'scenes' && scene
              ? `\`\`\`script block under scene ${scene.id} but outside any beat (### [id] heading); it is ignored`
              : '```script block outside any beat (### [id] heading); it is ignored',
            line.n,
          );
        }
      } else if (lang === 'codex') {
        if (section !== 'codex') d.warn('P42', '```codex blocks belong under the "## Codex" heading', line.n);
        codexBlocks.push(block);
      } else if (lang === 'memory') {
        if (section !== 'memories') d.warn('P42', '```memory blocks belong under the "## Memories" heading', line.n);
        memoryBlocks.push(block);
      }
      i = j + 1;
      continue;
    }

    const heading = /^(#{1,6})(?:\s+(.*?))?\s*$/.exec(t);
    if (heading && !/^#{1,6}[^#\s]/.test(t)) {
      const level = (heading[1] as string).length;
      const htext = (heading[2] ?? '').replace(/\s+#+\s*$/, '').trim();
      const idm = /^\[([^\]]*)\]\s*(.*)$/.exec(htext);
      if (level === 1) {
        if (h1 === null) h1 = htext;
        else d.warn('P30', `More than one H1 heading; the first one ("${h1}") is used`, line.n);
      } else if (level === 2) {
        beat = null;
        if (idm) {
          const id = (idm[1] as string).trim();
          const title = (idm[2] as string).trim();
          if (!ID_PATTERNS.scene.test(id)) d.error('L02', `Scene id "${id}" does not match <canto>.s<n> (e.g. inf03.s2)`, line.n);
          if (title.length === 0) d.warn('L02', `Scene ${id} has no title after its id`, line.n);
          scene = { id, title, line: line.n, beats: [] };
          scenes.push(scene);
          section = 'scenes';
        } else {
          scene = null;
          const name = htext.toLowerCase();
          if (/^[a-z]{3}\d{2}\.s\d+/.test(htext)) {
            d.error('P31', `Write the scene id in brackets: ## [${htext.split(/\s+/)[0]}] …`, line.n);
          }
          if (name === 'codex') section = 'codex';
          else if (name === 'memories' || name === 'memory') {
            if (name === 'memory') d.warn('P42', 'The section is called "## Memories"', line.n);
            section = 'memories';
          } else section = 'other';
        }
      } else if (level === 3) {
        beat = null;
        if (idm) {
          const id = (idm[1] as string).trim();
          const title = (idm[2] as string).trim();
          if (!scene) {
            d.error('P32', `Beat ${id} is not under a scene heading (## [id] …); it is ignored`, line.n);
          } else {
            if (!ID_PATTERNS.beat.test(id)) d.error('L02', `Beat id "${id}" does not match <scene>.b<n> (e.g. inf03.s2.b4)`, line.n);
            else if (!id.startsWith(`${scene.id}.`)) d.error('L02', `Beat ${id} is under scene ${scene.id}`, line.n);
            if (title.length === 0) d.warn('L02', `Beat ${id} has no title after its id`, line.n);
            const prev = beatIds.get(id);
            if (prev !== undefined) d.error('L02', `Beat id ${id} is used twice (first at line ${prev})`, line.n);
            else beatIds.set(id, line.n);
            beat = { id, title, line: line.n, scene, blocks: [] };
            scene.beats.push(beat);
          }
        } else if (/^[a-z]{3}\d{2}\.s\d+\.b\d+/.test(htext)) {
          d.error('P31', `Write the beat id in brackets: ### [${htext.split(/\s+/)[0]}] …`, line.n);
        }
      }
      i += 1;
      continue;
    }
    i += 1;
  }

  // Canto identity: front matter, else the path, else the scene ids.
  const fromFront = fm.front.id.trim();
  const fromPath = cantoIdFromScriptPath(file);
  const fromScenes = scenes.length > 0 ? prefixOf((scenes[0] as SceneDraft).id) : null;
  let id: CantoId = fromFront;
  if (!ID_PATTERNS.canto.test(fromFront)) {
    if (fm.present && fromFront.length > 0) {
      d.error('L01', `Front matter id "${fromFront}" does not match <inf|pur|par><NN> (e.g. inf03)`, 1);
    }
    id = fromPath ?? fromScenes ?? (fromFront || 'unknown');
  }

  if (h1 === null) d.warn('P30', 'The file has no H1 heading (# Inferno III — The Gate)', fm.bodyStart + 1);

  const builtScenes: Scene[] = scenes.map((sd, index) => {
    const m = /\.s(\d+)$/.exec(sd.id);
    return {
      id: sd.id,
      cantoId: prefixOf(sd.id) ?? id,
      title: sd.title,
      index,
      number: m ? Number(m[1]) : -1,
      beats: sd.beats.map((bd, bi) => buildBeat(bd, bi, id, d)),
      pos: { line: sd.line, file },
    };
  });
  const codex = codexBlocks.map((b) => buildCodex(b, id, d)).filter((e): e is CodexEntry => e !== null);
  const memories = memoryBlocks.map((b) => buildMemory(b, id, d)).filter((e): e is MemoryEntry => e !== null);

  if (!fm.present && builtScenes.length === 0 && codex.length === 0 && memories.length === 0) {
    d.error('P00', 'Nothing usable: no front matter, no scenes, no Codex or memory entries', 1);
    return { canto: null, diagnostics: d.list };
  }
  if (builtScenes.length === 0) d.error('P00', 'The script has no scenes (## [id] Title headings)', fm.bodyStart + 1);

  const front = fm.front;
  const prefix = prefixOf(id);
  const canticle: Canticle =
    (CANTICLES as readonly string[]).includes(front.canticle)
      ? (front.canticle as Canticle)
      : (prefix ? CANTICLE_BY_PREFIX[prefix.slice(0, 3)] : undefined) ?? 'Inferno';
  if (fm.present && front.canticle.length > 0 && !(CANTICLES as readonly string[]).includes(front.canticle)) {
    d.error('L01', `canticle must be one of ${CANTICLES.join(', ')} (found "${front.canticle}")`, 1);
  }
  const numberFromId = prefix ? Number(prefix.slice(3)) : 0;
  const cantoNumber = front.canto > 0 ? front.canto : numberFromId;
  const range = /^\s*(\d+)\s*[–-]\s*(\d+)\s*$/.exec(front.lines);
  const lineRange = range ? { first: Number(range[1]), last: Number(range[2]) } : null;

  const canto: CantoScript = {
    file,
    id,
    front,
    heading: h1 ?? '',
    canticle,
    cantoNumber,
    roman: toRoman(cantoNumber),
    lineRange,
    epigraph: front.epigraph ? parseCitation(front.epigraph) : null,
    closing: front.closing ? parseCitation(front.closing) : null,
    scenes: builtScenes,
    codex,
    memories,
  };
  return { canto, diagnostics: sortDiagnostics(d.list) };
}

/** Stable sort by line so diagnostics read top to bottom. */
function sortDiagnostics(list: readonly Diagnostic[]): Diagnostic[] {
  return list
    .map((diag, idx) => ({ diag, idx }))
    .sort((a, b) => (a.diag.pos?.line ?? 0) - (b.diag.pos?.line ?? 0) || a.idx - b.idx)
    .map((x) => x.diag);
}

/**
 * Parses one canto script file. Never throws: an unexpected failure becomes a
 * P99 diagnostic and `canto: null`.
 */
export function parseCanto(text: string, file: string): ParseResult {
  try {
    return parseCantoUnsafe(typeof text === 'string' ? text : String(text ?? ''), file);
  } catch (err) {
    return {
      canto: null,
      diagnostics: [
        {
          severity: 'error',
          code: 'P99',
          message: `Parser crashed: ${err instanceof Error ? err.message : String(err)}`,
          pos: { line: 1, file },
        },
      ],
    };
  }
}

/** Result of parsing a lone ```script block (tools, tests, the bible's examples). */
export interface ScriptBlockParse {
  readonly mode: BeatMode | null;
  readonly place: string | null;
  readonly trigger: Trigger | null;
  readonly music: string | null;
  readonly ambience: string | null;
  readonly chapterEnd: string | null;
  readonly statements: readonly Statement[];
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Parses the inside of one ```script block. With `directives: false` (default
 * true) leading `@` lines are not read as beat fields but kept as statements,
 * and a missing @mode is not reported (snippets such as the bible's CHOICE
 * blocks have none). Never throws.
 */
export function parseScriptBlock(
  text: string,
  opts: { readonly beatId?: string; readonly file?: string; readonly firstLine?: number; readonly directives?: boolean } = {},
): ScriptBlockParse {
  const file = opts.file ?? '<snippet>';
  const d = new Diags(file);
  const offset = (opts.firstLine ?? 1) - 1;
  const lines = splitLines(text).map((l) => ({ n: l.n + offset, text: l.text }));
  try {
    if (opts.directives === false) {
      const statements = new BlockParser(lines, d, opts.beatId ?? '').parseAll();
      return { mode: null, place: null, trigger: null, music: null, ambience: null, chapterEnd: null, statements, diagnostics: d.list };
    }
    const { fields, rest } = readDirectives(lines, offset + 1, d);
    const statements = new BlockParser(rest, d, opts.beatId ?? '').parseAll();
    return { ...fields, statements, diagnostics: d.list };
  } catch (err) {
    d.error('P99', `Parser crashed: ${err instanceof Error ? err.message : String(err)}`, offset + 1);
    return { mode: null, place: null, trigger: null, music: null, ambience: null, chapterEnd: null, statements: [], diagnostics: d.list };
  }
}
