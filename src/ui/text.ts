/**
 * Pure text helpers for the book layer: word wrapping against a measuring
 * function, verse chunking into tercet-sized bubbles, typewriter pacing,
 * reading times and citation slices.
 *
 * Owner: team C (presentation). No Phaser, no DOM: the measuring function is
 * injected (a canvas context in the game, a fixed-width stub in tests).
 */

import { TIMINGS, readingTimeMs } from '../config';
import { formatCitation } from '../story/cite';
import type { Citation } from '../story/types';

/** Width in px of a string in some fixed font. */
export type Measure = (text: string) => number;

/** A crude measure for tests and fallbacks: average glyph width × length. */
export function monoMeasure(charWidth: number): Measure {
  return (text: string) => text.length * charWidth;
}

/**
 * Greedy word wrap. Explicit `\n` are kept; runs of spaces collapse; a word
 * longer than `maxWidth` is broken between characters. Never returns an empty
 * array (an empty text gives `['']`).
 */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const out: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth || !line) {
        if (!line && measure(word) > maxWidth && maxWidth > 0) {
          // Break an over-long word.
          const pieces = breakWord(word, maxWidth, measure);
          for (let i = 0; i < pieces.length - 1; i++) out.push(pieces[i] as string);
          line = pieces[pieces.length - 1] ?? '';
        } else {
          line = candidate;
        }
      } else {
        out.push(line);
        if (measure(word) > maxWidth && maxWidth > 0) {
          const pieces = breakWord(word, maxWidth, measure);
          for (let i = 0; i < pieces.length - 1; i++) out.push(pieces[i] as string);
          line = pieces[pieces.length - 1] ?? '';
        } else {
          line = word;
        }
      }
    }
    out.push(line);
  }
  return out.length > 0 ? out : [''];
}

/**
 * Wrap into the same number of lines as `wrapText` at `maxWidth`, but as
 * narrow as possible, so the lines come out even (no lone last word).
 */
export function balancedWrap(text: string, maxWidth: number, measure: Measure): string[] {
  const base = wrapText(text, maxWidth, measure);
  if (base.length <= 1 || text.includes('\n')) return base;
  let lo = maxWidth * 0.4;
  let hi = maxWidth;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (wrapText(text, mid, measure).length > base.length) lo = mid;
    else hi = mid;
  }
  return wrapText(text, hi, measure);
}

function breakWord(word: string, maxWidth: number, measure: Measure): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const ch of word) {
    if (current && measure(current + ch) > maxWidth) {
      pieces.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * A verse line that is too wide is wrapped with a hanging indent (the
 * continuation is marked so the renderer can indent it). Returns at least one segment.
 */
export function wrapVerseLine(
  line: string,
  maxWidth: number,
  measure: Measure,
  indentPx: number,
): { text: string; continuation: boolean }[] {
  if (measure(line) <= maxWidth) return [{ text: line, continuation: false }];
  const first = wrapText(line, maxWidth, measure);
  const head = first[0] ?? '';
  const rest = line.slice(head.length).trim();
  const tail = rest ? wrapText(rest, Math.max(40, maxWidth - indentPx), measure) : [];
  return [{ text: head, continuation: false }, ...tail.map((t) => ({ text: t, continuation: true }))];
}

/** Number of sentences (for strip sanity checks; `…` and `—` do not end sentences). */
export function sentenceCount(text: string): number {
  const matches = text.trim().match(/[.!?]+(?=\s|$|["'”’])/g);
  return Math.max(1, matches ? matches.length : 0);
}

/**
 * Splits verse lines into tercet-sized chunks (bible §2.6: the engine splits
 * 4–6 lines into tercet-sized bubbles). With source line numbers, a new chunk
 * starts at every tercet head of the canto (line n with (n − 1) % 3 === 0);
 * a chunk never exceeds three lines; up to three lines stay together.
 * Returns index ranges [start, end) into `lineNumbers`.
 */
export function verseChunks(lineNumbers: readonly (number | null)[]): [number, number][] {
  const count = lineNumbers.length;
  if (count <= 3) return count === 0 ? [] : [[0, count]];
  const chunks: [number, number][] = [];
  let start = 0;
  for (let i = 1; i < count; i++) {
    const size = i - start;
    const n = lineNumbers[i];
    const tercetHead = typeof n === 'number' && (n - 1) % 3 === 0;
    if (size >= 3 || (tercetHead && size > 0)) {
      chunks.push([start, i]);
      start = i;
    }
  }
  chunks.push([start, count]);
  // A lone line in its own chunk is kept: in terza rima a single closing line is a real unit (3n + 1).
  return chunks;
}

/**
 * Citation text for a slice of a quote (`Inferno III, 7–9`), from the slice's
 * known line numbers; falls back to the full citation text.
 */
export function sliceCitation(
  citation: Citation | null,
  fullText: string,
  lineNumbers: readonly (number | null)[],
  start: number,
  end: number,
): string {
  if (!citation) return fullText;
  const nums = lineNumbers.slice(start, end).filter((n): n is number => typeof n === 'number');
  if (nums.length === 0) return fullText;
  const first = Math.min(...nums);
  const last = Math.max(...nums);
  if (first === citation.first && last === citation.last) return citation.text;
  return formatCitation(citation.canticle, citation.canto, first, last);
}

/** Characters per second of the typewriter for a text speed; Infinity means instant. */
export function typewriterCps(speed: keyof typeof TIMINGS.textCps): number {
  return TIMINGS.textCps[speed];
}

/** How many characters are visible after `elapsedMs` at `cps` (clamped to the text length). */
export function typedLength(elapsedMs: number, cps: number, total: number): number {
  if (!Number.isFinite(cps) || cps <= 0) return total;
  return Math.max(0, Math.min(total, Math.floor((elapsedMs / 1000) * cps)));
}

/** Time to type `text` fully at `cps` (0 when instant). Pauses after punctuation are included. */
export function typingDurationMs(text: string, cps: number): number {
  if (!Number.isFinite(cps) || cps <= 0) return 0;
  return Math.ceil((text.length / cps) * 1000);
}

/**
 * Typewriter with natural pauses: the delay (ms) before revealing character
 * `i` of `text`. Commas pause a little, sentence ends and dashes a little more.
 */
export function charDelayMs(text: string, i: number, cps: number): number {
  if (!Number.isFinite(cps) || cps <= 0) return 0;
  const base = 1000 / cps;
  const prev = i > 0 ? text[i - 1] : '';
  if (prev === ',' || prev === ';' || prev === ':') return base * 4;
  if (prev === '.' || prev === '!' || prev === '?' || prev === '—' || prev === '…') return base * 7;
  return base;
}

/** Reading time for a non-blocking strip / bubble (config readingTimeMs, with a floor for verse). */
export function readingMs(text: string, opts: { verseLines?: number } = {}): number {
  const base = readingTimeMs(text);
  const verse = opts.verseLines ? opts.verseLines * 1400 : 0;
  return Math.max(base, verse);
}

/** Option text without its surrounding double quotes (spoken options show their quotes; this is for logs). */
export function unquote(text: string): string {
  const t = text.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

/** Elisions that take an apostrophe even at a word start (`'t is`, `'Twixt`, `'mid`). */
const ELISION = /^'(t\b|t |tis\b|twas\b|twixt\b|gainst\b|mid\b|neath\b|tween\b|em\b)/i;

/**
 * Display typography: straight quotes become curly ones (the book font draws
 * a straight " like a closing quote). One character for one, so indices into
 * the text (collectible words) stay valid. The script files keep straight quotes.
 */
export function typeset(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    const prev = i > 0 ? (text[i - 1] as string) : '';
    const opening = prev === '' || /[\s(\[{—–…\-]/.test(prev);
    if (ch === '"') out += opening ? '\u201C' : '\u201D';
    else if (ch === "'") out += opening && !ELISION.test(text.slice(i)) ? '\u2018' : '\u2019';
    else out += ch;
  }
  return out;
}

/** Shortens text to `max` characters with an ellipsis (`…`). */
export function ellipsize(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Splits a verse line around a collectible word range: [before, word, after].
 * Out-of-range input returns the whole line as `before`.
 */
export function splitAround(line: string, start: number, end: number): [string, string, string] {
  if (start < 0 || end > line.length || start >= end) return [line, '', ''];
  return [line.slice(0, start), line.slice(start, end), line.slice(end)];
}

/** `I`, `II` … from `CANTO II` (the label the runner passes). */
export function numeralOf(cantoLabel: string): string {
  const m = /([MDCLXVI]+)\s*$/.exec(cantoLabel.trim());
  return m ? (m[1] as string) : cantoLabel;
}
