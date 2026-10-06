/**
 * Pure builders for what the runner hands the presenter: canto meta, quote
 * specs (with resolved line numbers and collectible words), "What Dante did"
 * cards, colophon rows and the chapter summary.
 *
 * Owner: team B (runtime). No Phaser, no DOM.
 */

import { TRUST } from '../config';
import { cantoLabel } from '../story/cite';
import { findWordInLine, getWord } from '../story/words';
import {
  SPEAKERS,
  type BeatMode,
  type CantoId,
  type CantoScript,
  type ChoiceOption,
  type ChoiceStmt,
  type Citation,
  type OptionLetter,
  type QuoteStmt,
  type Reveal,
  type SourceCanto,
  type SpeakerId,
  type WordName,
} from '../story/types';
import type {
  CantoMeta,
  ColophonChoiceRow,
  CollectibleWord,
  GameStateView,
  QuoteContext,
  QuoteSpec,
  RevealCard,
  RevealHeading,
} from './contracts';

/** Bible §3.3 trust label (Faithful / Steady / Wayward); lives with the state selectors. */
export { trustLabel } from '../state/selectors';

// ---------------------------------------------------------------------------
// Canto
// ---------------------------------------------------------------------------

export function cantoMeta(script: CantoScript, chapter: string | null): CantoMeta {
  return {
    id: script.id,
    canticle: script.canticle,
    cantoNumber: script.cantoNumber,
    roman: script.roman,
    title: script.front.title,
    location: script.front.location,
    chapter,
  };
}

/** `INFERNO` */
export function canticleLabel(script: CantoScript): string {
  return script.canticle.toUpperCase();
}

/** `CANTO III` */
export function cantoLabelOf(script: CantoScript): string {
  return cantoLabel(script.cantoNumber);
}

export function speakerName(id: SpeakerId): string {
  return SPEAKERS[id]?.name ?? id;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/** Does a written verse line (with `…` cut marks) match the source line (bible §2.6)? */
export function verseMatches(written: string, original: string): boolean {
  const text = written.trim();
  const cutStart = text.startsWith('…');
  const cutEnd = text.length > 1 && text.endsWith('…');
  const core = text.replace(/^…/, '').replace(/…$/, '').trim();
  if (core.length === 0) return false;
  if (cutStart && cutEnd) return original.includes(core);
  if (cutStart) return original.trimEnd().endsWith(core);
  if (cutEnd) return original.trimStart().startsWith(core);
  return original.trim() === core;
}

/**
 * Source line number of every quote line (null for skip lines and lines that
 * cannot be resolved). Uses the parser / loader numbers when present and
 * resolves the rest against the Longfellow source within the citation range.
 */
export function resolveLineNumbers(quote: QuoteStmt, source: SourceCanto | null): (number | null)[] {
  const out: (number | null)[] = [];
  const cite = quote.citation;
  const usable =
    cite !== null && source !== null && source.canticle === cite.canticle && source.canto === cite.canto;
  let next = cite ? cite.first : 1;
  const last = cite ? cite.last : 0;
  for (const line of quote.lines) {
    if (line.kind === 'skip') {
      out.push(null);
      next += 1;
      continue;
    }
    if (line.lineNo !== null) {
      out.push(line.lineNo);
      next = line.lineNo + 1;
      continue;
    }
    let found: number | null = null;
    if (usable && source) {
      for (let k = next; k <= last; k++) {
        if (verseMatches(line.text, source.lines[k - 1] ?? '')) {
          found = k;
          break;
        }
      }
    }
    out.push(found);
    if (found !== null) next = found + 1;
  }
  return out;
}

/** Display text of each quote line: verse text as written, `…` for a skip line. */
export function quoteLineTexts(quote: QuoteStmt): string[] {
  return quote.lines.map((l) => (l.kind === 'verse' ? l.text : '…'));
}

/**
 * Words of a following `EFFECTS: word:X` line that can be taken from this quote
 * (bible §3.4.2 rule 5, ENGINE §5.8): X's origin line is one of the quote's lines
 * and the word is visible in it.
 */
export function collectibleWords(
  citation: Citation | null,
  lines: readonly string[],
  lineNumbers: readonly (number | null)[],
  words: readonly WordName[],
): CollectibleWord[] {
  const out: CollectibleWord[] = [];
  for (const word of words) {
    const def = getWord(word);
    if (!def) continue;
    let index = -1;
    if (citation && citation.canticle === def.origin.canticle && citation.canto === def.origin.canto) {
      index = lineNumbers.findIndex((n) => n === def.origin.line);
    }
    if (index < 0) {
      // Fallback for unresolved line numbers: the written line is (part of) the origin line.
      index = lines.findIndex((text, i) => {
        if (lineNumbers[i] !== null && lineNumbers[i] !== undefined) return false;
        const core = text.replace(/^…/, '').replace(/…$/, '').trim();
        return core.length > 0 && def.origin.text.includes(core);
      });
    }
    if (index < 0) continue;
    const range = findWordInLine(def.name, lines[index] ?? '');
    if (!range) continue;
    if (out.some((c) => c.word === def.name)) continue;
    out.push({
      word: def.name,
      def,
      lineIndex: index,
      start: range.start,
      end: range.end,
      auto: def.acquisition === 'auto' || def.role === 'burden',
    });
  }
  return out;
}

export interface QuoteSpecOptions {
  readonly context: QuoteContext;
  readonly mode: BeatMode;
  readonly source: SourceCanto | null;
  /** Words that may glow in this quote (from the following EFFECTS line, or a colophon highlight). */
  readonly words?: readonly WordName[];
}

export function buildQuoteSpec(quote: QuoteStmt, opts: QuoteSpecOptions): QuoteSpec {
  const lines = quoteLineTexts(quote);
  const lineNumbers = resolveLineNumbers(quote, opts.source);
  return {
    voice: quote.voice,
    speakerName: speakerName(quote.voice),
    citation: quote.citation,
    citationText: quote.citation?.text ?? quote.citationRaw,
    lines,
    lineNumbers,
    gloss: quote.gloss,
    collectible: opts.words && opts.words.length > 0 ? collectibleWords(quote.citation, lines, lineNumbers, opts.words) : [],
    context: opts.context,
    mode: opts.mode,
  };
}

/** The same spec with extra glowing words (e.g. `Pity` on a deferred card at the colophon). */
export function withCollectibles(spec: QuoteSpec, words: readonly WordName[]): QuoteSpec {
  if (words.length === 0) return spec;
  const extra = collectibleWords(spec.citation, spec.lines, spec.lineNumbers, words).filter(
    (c) => !spec.collectible.some((x) => x.word === c.word),
  );
  if (extra.length === 0) return spec;
  return { ...spec, collectible: [...spec.collectible, ...extra] };
}

// ---------------------------------------------------------------------------
// Choices and cards
// ---------------------------------------------------------------------------

/** `As Dante did` when the chosen letter is canonical (or canon is `all`); `What Dante did` otherwise; null without REVEAL. */
export function revealHeading(reveal: Reveal | null, letter: OptionLetter): RevealHeading | null {
  if (!reveal) return null;
  if (reveal.canon === 'all') return 'As Dante did';
  if (reveal.canon === 'none') return 'What Dante did';
  return reveal.canon.includes(letter) ? 'As Dante did' : 'What Dante did';
}

/** The first canonical option among `visible` (autoplay `canon`); `all`, `none` or no REVEAL: the first visible. */
export function canonicalLetter(choice: ChoiceStmt, visible: readonly ChoiceOption[]): OptionLetter | null {
  const first = visible[0]?.letter ?? null;
  const canon = choice.reveal?.canon;
  if (!canon || canon === 'all' || canon === 'none') return first;
  for (const option of visible) if (canon.includes(option.letter)) return option.letter;
  return first;
}

export function buildRevealCard(args: {
  readonly choice: ChoiceStmt;
  readonly option: ChoiceOption;
  readonly canto: CantoId;
  readonly heading: RevealHeading;
  readonly mode: BeatMode;
  readonly source: SourceCanto | null;
  readonly deferred: boolean;
}): RevealCard {
  const reveal = args.choice.reveal as Reveal;
  return {
    choice: args.choice.id,
    canto: args.canto,
    recordTitle: args.choice.title,
    heading: args.heading,
    chosenLetter: args.option.letter,
    chosenText: args.option.text,
    quotes: reveal.quotes.map((q) =>
      buildQuoteSpec(q, { context: 'card', mode: args.mode, source: args.source }),
    ),
    note: reveal.note,
    timing: reveal.timing,
    deferred: args.deferred,
    highlightWords: [],
  };
}

/** The choices of one canto as colophon / chapter rows, in the order they were made. */
export function choiceRows(state: GameStateView, canto: CantoId): ColophonChoiceRow[] {
  return Object.values(state.choices)
    .filter((c) => c.canto === canto)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      choice: c.choice,
      title: c.title,
      systemic: c.systemic,
      letter: c.letter,
      chosenText: c.optionText,
      heading: c.heading,
      note: c.note,
    }));
}

/** Bible §4.7: the chapter-end system flags for the current state (`ch1.heart_tender` …). */
export function chapterEndFlags(chapter: string, state: GameStateView): string[] {
  const heart = state.heart.pity - state.heart.justice;
  const flags: string[] = [];
  if (heart >= 3) flags.push(`${chapter}.heart_tender`);
  else if (heart <= -3) flags.push(`${chapter}.heart_stern`);
  else flags.push(`${chapter}.heart_even`);
  if (state.trust >= TRUST.faithful) flags.push(`${chapter}.trust_faithful`);
  else if (state.trust <= TRUST.wayward) flags.push(`${chapter}.trust_wayward`);
  return flags;
}
