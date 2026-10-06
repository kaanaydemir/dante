/**
 * Longfellow source texts and quote verification (bible §2.6, lint L06).
 *
 * Owner: team A (story-core). Pure TypeScript.
 * Frozen exports (docs/ENGINE.md): `parseSourceText(text, file)`,
 * `verifyQuote(quote, source)`, `sourceKey()`, `QuoteCheck`.
 *
 * The §2.6 cutting rules:
 *   1. Whole lines are copied exactly (words, punctuation, case, spelling,
 *      quotation marks and the source's oddities, §6.6).
 *   2. Part of a line may be taken with `…` where it was cut; the uncut end
 *      must start (or end) exactly like the source line.
 *   3. A line holding only `…` skips one or more lines inside the cited range.
 *   The citation covers exactly the first and the last quoted line.
 *
 * Diagnostic codes (lint reports them under L06):
 *   Q01  citation missing or unreadable
 *   Q02  source text not available (warning; the quote is not verified)
 *   Q03  the source given is not the cited canto
 *   Q04  citation outside the canto
 *   Q05  a verse line does not match the source
 *   Q06  lines out of order, or non-consecutive lines without a `…` line between them
 *   Q07  the citation does not cover exactly the first and last quoted line
 *   Q08  a `…` skip line at the start or end of a quote
 *   Q09  a `…` cut mark where nothing was cut (warning)
 */

import { formatCitation } from './cite';
import { CANTICLES, type Canticle, type Diagnostic, type QuoteLine, type QuoteStmt, type SourceCanto } from './types';

/** Key used by the library for a source canto. */
export function sourceKey(canticle: Canticle, canto: number): string {
  return `${canticle}:${canto}`;
}

/**
 * Parses a numbered source file (`  12 | In which I had abandoned the true way.`).
 * Canticle and canto come from the path: `/docs/source/inferno/canto-01.txt`.
 * Returns null when the path or the content is not a numbered canto.
 */
export function parseSourceText(text: string, file: string): SourceCanto | null {
  const pm = /\/(inferno|purgatorio|paradiso)\/canto-(\d{2})\.txt$/i.exec(file);
  if (!pm) return null;
  const folder = (pm[1] as string).toLowerCase();
  const canticle = CANTICLES.find((c) => c.toLowerCase() === folder);
  if (!canticle) return null;
  const canto = Number(pm[2]);
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const m = /^\s*(\d+) \| ?(.*?)\r?$/.exec(raw);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 1) continue;
    lines[n - 1] = m[2] as string;
  }
  if (lines.length === 0) return null;
  // Fill accidental holes so lines[n - 1] is always a string.
  for (let i = 0; i < lines.length; i++) if (lines[i] === undefined) lines[i] = '';
  return { canticle, canto, lines, count: lines.length, file };
}

/** Builds the `sourceKey -> SourceCanto` map from raw files (path -> text). Unreadable files are skipped. */
export function buildSourceMap(files: Readonly<Record<string, string>>): Map<string, SourceCanto> {
  const map = new Map<string, SourceCanto>();
  for (const [path, text] of Object.entries(files)) {
    const src = parseSourceText(text, path);
    if (src) map.set(sourceKey(src.canticle, src.canto), src);
  }
  return map;
}

/** Result of checking one QUOTE block against its source canto. */
export interface QuoteCheck {
  /** True when every verse line matches under the §2.6 cutting rules and the citation covers exactly the first and last line. */
  readonly ok: boolean;
  /** Resolved source line number of each QuoteStmt.lines entry (null for skip lines or unmatched lines). */
  readonly lineNumbers: readonly (number | null)[];
  readonly diagnostics: readonly Diagnostic[];
}

// ---------------------------------------------------------------------------
// Matching one line
// ---------------------------------------------------------------------------

const ELLIPSIS = '…';

/** `...` written for `…` at either end is read as the cut mark (lint L22 reports the spelling). */
function normaliseCuts(text: string): string {
  let t = text.replace(/\s+$/, '');
  if (t.startsWith('...')) t = ELLIPSIS + t.slice(3);
  if (t.endsWith('...') && t.length > 1) t = t.slice(0, -3) + ELLIPSIS;
  return t;
}

/** The parts of a written verse line: the text between the cut marks and where it was cut. */
export function verseCore(written: string): { core: string; cutStart: boolean; cutEnd: boolean } {
  const w = normaliseCuts(written);
  const cutStart = w.startsWith(ELLIPSIS);
  const cutEnd = w.length > 1 && w.endsWith(ELLIPSIS);
  let core = w;
  if (cutStart) core = core.slice(1);
  if (cutEnd) core = core.slice(0, -1);
  if (cutStart) core = core.replace(/^\s+/, '');
  if (cutEnd) core = core.replace(/\s+$/, '');
  return { core, cutStart, cutEnd };
}

/**
 * Does a written verse line match a source line under the §2.6 rules?
 * Whole lines must be identical; a cut line must start (cut at the end) or end
 * (cut at the start) exactly like the source, or occur inside it (cut at both ends).
 */
export function matchVerse(written: string, original: string): boolean {
  const o = original.replace(/\s+$/, '');
  const { core, cutStart, cutEnd } = verseCore(written);
  if (core.length === 0) return false;
  if (cutStart && cutEnd) return o.includes(core);
  if (cutStart) return o.endsWith(core);
  if (cutEnd) return o.startsWith(core);
  return core === o;
}

/** Every source line number (1-based) a written verse line matches. */
export function findVerse(written: string, source: SourceCanto, from = 1, to = source.count): number[] {
  const out: number[] = [];
  for (let n = Math.max(1, from); n <= Math.min(to, source.count); n++) {
    if (matchVerse(written, source.lines[n - 1] ?? '')) out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Near-match hints
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length] as number;
}

/** The part of a source line a cut verse should be compared with. */
function comparable(written: string, original: string): { mine: string; theirs: string } {
  const { core, cutStart, cutEnd } = verseCore(written);
  const o = original.replace(/\s+$/, '');
  if (cutStart && cutEnd) {
    // Best window of the same length.
    let best = o.slice(0, core.length);
    let bestD = Number.POSITIVE_INFINITY;
    for (let i = 0; i + core.length <= o.length; i++) {
      const w = o.slice(i, i + core.length);
      const d = levenshtein(core, w);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return { mine: core, theirs: best };
  }
  if (cutStart) return { mine: core, theirs: o.slice(Math.max(0, o.length - core.length)) };
  if (cutEnd) return { mine: core, theirs: o.slice(0, core.length) };
  return { mine: core, theirs: o };
}

function straighten(s: string): string {
  return s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

/** Explains how a written line differs from the closest source line. */
function describeMismatch(written: string, source: SourceCanto, near: number): string {
  let bestLine = Math.min(Math.max(1, near), source.count);
  let bestScore = Number.POSITIVE_INFINITY;
  for (let n = 1; n <= source.count; n++) {
    const { mine, theirs } = comparable(written, source.lines[n - 1] ?? '');
    const score = levenshtein(mine, theirs) + Math.abs(n - near) * 0.01;
    if (score < bestScore) {
      bestScore = score;
      bestLine = n;
    }
  }
  const original = source.lines[bestLine - 1] ?? '';
  const { mine, theirs } = comparable(written, original);
  const label = formatCitation(source.canticle, source.canto, bestLine);
  if (straighten(mine) === straighten(theirs)) {
    return `closest is ${label}, which differs only in quotation marks (use straight quotes as in the source): "${original}"`;
  }
  if (mine.replace(/\s+/g, ' ') === theirs.replace(/\s+/g, ' ')) {
    return `closest is ${label}, which differs only in spacing: "${original}"`;
  }
  if (mine.toLowerCase() === theirs.toLowerCase()) {
    return `closest is ${label}, which differs only in capital letters: "${original}"`;
  }
  let at = 0;
  while (at < mine.length && at < theirs.length && mine[at] === theirs[at]) at += 1;
  const distance = levenshtein(mine, theirs);
  if (distance > Math.max(8, mine.length * 0.6)) return `no source line is close (nearest: ${label} "${original}")`;
  return `closest is ${label} "${original}" (first difference at character ${at + 1})`;
}

// ---------------------------------------------------------------------------
// Matching a whole quote
// ---------------------------------------------------------------------------

/**
 * Assigns source line numbers to the quote lines. Without a preceding skip
 * line a verse must be the next source line; after a skip line it may be any
 * later line (at least one skipped). The first verse is tried at each of
 * `starts` in turn; `fixedEnd` pins the last verse. Returns null when no
 * assignment exists. Failed states are memoised, so the search stays small.
 */
function solve(
  lines: readonly QuoteLine[],
  source: SourceCanto,
  starts: readonly number[],
  fixedEnd: number | null,
): (number | null)[] | null {
  const n = lines.length;
  const result: (number | null)[] = new Array<number | null>(n).fill(null);
  const max = source.count;
  const failed = new Set<string>();

  const rec = (idx: number, cursor: number, free: boolean): boolean => {
    if (idx === n) return fixedEnd === null || cursor - 1 === fixedEnd;
    const key = `${idx}:${cursor}:${free ? 1 : 0}`;
    if (failed.has(key)) return false;
    const line = lines[idx] as QuoteLine;
    if (line.kind === 'skip') {
      result[idx] = null;
      if (rec(idx + 1, cursor + 1, true)) return true;
      failed.add(key);
      return false;
    }
    const limit = fixedEnd ?? max;
    const last = free ? limit : cursor;
    for (let k = cursor; k <= last && k <= max; k++) {
      if (matchVerse(line.text, source.lines[k - 1] ?? '')) {
        result[idx] = k;
        if (rec(idx + 1, k + 1, false)) return true;
      }
    }
    result[idx] = null;
    failed.add(key);
    return false;
  };

  for (const start of starts) {
    if (start < 1 || start > max) continue;
    // A leading skip line lets the first verse float (relaxed search only).
    if (rec(0, start, false)) return result;
  }
  return null;
}

function verseNumbers(lines: readonly QuoteLine[], numbers: readonly (number | null)[]): number[] {
  return lines.flatMap((l, i) => (l.kind === 'verse' && numbers[i] != null ? [numbers[i] as number] : []));
}

/**
 * Verifies a QUOTE against the source (exact text, `…` cuts at either end, lone
 * `…` skip lines, citation range covering exactly the first and last line).
 * Never throws. `lineNumbers` is filled whenever the lines can be located,
 * even if the citation is wrong (so the Book and collectible words still work).
 */
export function verifyQuote(quote: QuoteStmt, source: SourceCanto | null): QuoteCheck {
  const diagnostics: Diagnostic[] = [];
  const pos = quote.pos;
  const fallback = quote.lines.map((l) => (l.kind === 'verse' ? l.lineNo : null));
  const add = (severity: Diagnostic['severity'], code: string, message: string): void => {
    diagnostics.push({ severity, code, message: `QUOTE ${quote.voice} (${quote.citationRaw}): ${message}`, pos });
  };

  try {
    const cit = quote.citation;
    if (!cit) {
      add('error', 'Q01', 'the citation is missing or unreadable, so the quote cannot be verified');
      return { ok: false, lineNumbers: fallback, diagnostics };
    }
    if (!source) {
      add('warning', 'Q02', `no source text is loaded for ${cit.canticle} ${cit.roman}; the quote was not verified`);
      return { ok: false, lineNumbers: fallback, diagnostics };
    }
    if (source.canticle !== cit.canticle || source.canto !== cit.canto) {
      add('error', 'Q03', `the source given is ${source.canticle} ${source.canto}, not the cited canto`);
      return { ok: false, lineNumbers: fallback, diagnostics };
    }
    const verses = quote.lines.filter((l) => l.kind === 'verse');
    if (verses.length === 0) {
      add('error', 'Q05', 'the quote has no verse lines');
      return { ok: false, lineNumbers: fallback, diagnostics };
    }

    let ok = true;
    if (cit.first < 1 || cit.last > source.count) {
      add('error', 'Q04', `${cit.text} is outside ${source.canticle} ${cit.roman}, which has ${source.count} lines`);
      ok = false;
    }
    const firstLine = quote.lines[0] as QuoteLine;
    const lastLine = quote.lines[quote.lines.length - 1] as QuoteLine;
    if (firstLine.kind === 'skip' || lastLine.kind === 'skip') {
      add('error', 'Q08', 'a quote cannot start or end with a "…" line; cite the first and last line you show');
      ok = false;
    }
    for (let i = 1; i < quote.lines.length; i++) {
      if (quote.lines[i]?.kind === 'skip' && quote.lines[i - 1]?.kind === 'skip') {
        add('warning', 'Q08', 'two "…" lines in a row; one is enough');
      }
    }

    // Cut marks that cut nothing (checked against the line each verse was matched to).
    const checkCuts = (numbers: readonly (number | null)[]): void => {
      quote.lines.forEach((l, i) => {
        const n = numbers[i];
        if (l.kind !== 'verse' || n == null) return;
        const { core, cutStart, cutEnd } = verseCore(l.text);
        if ((cutStart || cutEnd) && core === (source.lines[n - 1] ?? '').replace(/\s+$/, '')) {
          add('warning', 'Q09', `"${l.text}" marks a cut, but it is the whole of line ${n}`);
        }
      });
    };

    // 1. Strict: first verse at the citation's first line, last at its last line.
    const strict = ok ? solve(quote.lines, source, [cit.first], cit.last) : null;
    if (strict) {
      checkCuts(strict);
      return { ok, lineNumbers: strict, diagnostics };
    }

    // 2. Relaxed: anywhere in the canto, starting as close to the citation as possible.
    const starts: number[] = [];
    for (let d = 0; d < source.count; d++) {
      const below = cit.first - d;
      const above = cit.first + d;
      if (below >= 1) starts.push(below);
      if (d > 0 && above <= source.count) starts.push(above);
    }
    const leadingSkips = quote.lines.findIndex((l) => l.kind === 'verse');
    const core = leadingSkips > 0 ? quote.lines.slice(leadingSkips) : quote.lines;
    const relaxedCore = solve(core, source, starts, null);
    const relaxed = relaxedCore ? [...new Array<number | null>(Math.max(0, leadingSkips)).fill(null), ...relaxedCore] : null;
    if (relaxed) {
      checkCuts(relaxed);
      const nums = verseNumbers(quote.lines, relaxed);
      const first = nums[0] as number;
      const last = nums[nums.length - 1] as number;
      if (first !== cit.first || last !== cit.last) {
        add(
          'error',
          'Q07',
          `the lines are ${formatCitation(source.canticle, source.canto, first, last)}; the citation must cover exactly the first and last quoted line`,
        );
      }
      return { ok: false, lineNumbers: relaxed, diagnostics };
    }

    // 3. Explain line by line.
    let anyUnmatched = false;
    const perLine: (number | null)[] = quote.lines.map((l) => {
      if (l.kind !== 'verse') return null;
      const inRange = cit.first >= 1 ? findVerse(l.text, source, cit.first, cit.last) : [];
      const anywhere = inRange.length > 0 ? inRange : findVerse(l.text, source);
      if (anywhere.length === 0) {
        anyUnmatched = true;
        add('error', 'Q05', `"${l.text}" does not match the source: ${describeMismatch(l.text, source, cit.first)}`);
        return null;
      }
      return inRange.length === 1 ? (inRange[0] as number) : anywhere.length === 1 ? (anywhere[0] as number) : null;
    });
    if (!anyUnmatched) {
      add(
        'error',
        'Q06',
        'every line exists in the source, but not in this order or not consecutively; mark skipped lines with a line holding only "…"',
      );
    }
    return { ok: false, lineNumbers: perLine, diagnostics };
  } catch (err) {
    add('error', 'Q05', `the quote could not be verified: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, lineNumbers: fallback, diagnostics };
  }
}

/** The source text of a citation's range (for the Book's "whole canto" pages and tools). */
export function sourceRange(source: SourceCanto, first: number, last: number = first): string[] {
  const out: string[] = [];
  for (let n = Math.max(1, first); n <= Math.min(last, source.count); n++) out.push(source.lines[n - 1] ?? '');
  return out;
}
