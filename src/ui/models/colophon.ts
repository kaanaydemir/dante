/**
 * The colophon's "In this canto" page and the chapter-end summary as ordered
 * blocks (pure), plus pagination of measured blocks into book pages.
 * Bible §1.3.8, §1.5; ENGINE §5.9.
 */

import type { ChapterSummary, ColophonChoiceRow, ColophonSpec, WordChange } from '../../runtime/contracts';
import { VIRTUES } from '../../story/types';
import { centoLines } from '../../verse/cento';
import { heartPhrase, starLevel, trustPhrase, VIRTUE_NAMES } from './copy';

export type SummaryBlock =
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'subheading'; readonly text: string }
  | { readonly kind: 'choice'; readonly title: string; readonly yours: string; readonly heading: string | null; readonly dante: string | null; readonly systemic: boolean }
  | { readonly kind: 'word'; readonly word: string; readonly change: WordChange['change']; readonly origin: string; readonly citation: string }
  | { readonly kind: 'line'; readonly text: string; readonly muted?: boolean }
  | { readonly kind: 'scale'; readonly pity: number; readonly justice: number }
  | { readonly kind: 'stars'; readonly levels: readonly { name: string; level: number }[] }
  | { readonly kind: 'cento'; readonly lines: readonly { text: string; citation: string }[] }
  | { readonly kind: 'gap' };

function choiceBlock(row: ColophonChoiceRow): SummaryBlock {
  return {
    kind: 'choice',
    title: row.title,
    yours: row.chosenText,
    heading: row.heading,
    dante: row.note,
    systemic: row.systemic,
  };
}

/**
 * Words of the canto, one row per word: the latest change wins (Fear given then
 * set down shows as set down), engine kits stay out unless nothing else is there.
 */
export function colophonWordRows(words: readonly WordChange[]): WordChange[] {
  const byWord = new Map<string, WordChange>();
  for (const w of words) byWord.set(w.word, w);
  return [...byWord.values()];
}

/** Blocks of the "In this canto" page, in reading order. */
export function colophonBlocks(spec: ColophonSpec): SummaryBlock[] {
  const blocks: SummaryBlock[] = [{ kind: 'heading', text: 'In this canto' }];
  if (spec.choices.length > 0) {
    blocks.push({ kind: 'subheading', text: 'Your choices, and Dante’s' });
    for (const row of spec.choices) blocks.push(choiceBlock(row));
  }
  const words = colophonWordRows(spec.words);
  if (words.length > 0) {
    blocks.push({ kind: 'subheading', text: 'Words' });
    for (const w of words) {
      blocks.push({
        kind: 'word',
        word: w.word,
        change: w.change,
        origin: w.def?.origin.text ?? '',
        citation: w.def?.origin.citation ?? '',
      });
    }
  }
  if (spec.memories.length > 0) {
    blocks.push({ kind: 'subheading', text: 'Remembered' });
    for (const m of spec.memories) blocks.push({ kind: 'line', text: m.entry?.name ?? m.id });
  }
  const shown = spec.codex.filter((c) => !c.silent);
  const silent = spec.codex.filter((c) => c.silent);
  if (shown.length > 0) {
    blocks.push({ kind: 'subheading', text: 'Pages of the Book' });
    blocks.push({ kind: 'line', text: shown.map((c) => c.entry?.title ?? c.id).join(' · ') });
  }
  if (silent.length > 0) {
    blocks.push({
      kind: 'line',
      text: `The Book kept ${silent.length === 1 ? 'a page' : 'some pages'} for later.`,
      muted: true,
    });
  }
  if (spec.heart.visible) {
    blocks.push({ kind: 'subheading', text: 'The scale' });
    blocks.push({ kind: 'scale', pity: spec.heart.pity, justice: spec.heart.justice });
  }
  if (spec.fullTextUnlocked) {
    blocks.push({ kind: 'gap' });
    blocks.push({ kind: 'line', text: 'The whole canto is now open in the Book.', muted: true });
  }
  return blocks;
}

/** Blocks of the chapter-end summary (left page) and "Your Comedy" preview (right page). */
export function chapterBlocks(summary: ChapterSummary): { summary: SummaryBlock[]; comedy: SummaryBlock[] } {
  const left: SummaryBlock[] = [];
  left.push({ kind: 'heading', text: 'In this chapter' });
  left.push({ kind: 'line', text: heartPhrase(summary.heart.pity, summary.heart.justice) });
  left.push({ kind: 'scale', pity: summary.heart.pity, justice: summary.heart.justice });
  left.push({ kind: 'line', text: trustPhrase(summary.trustLabel) });
  left.push({
    kind: 'stars',
    levels: VIRTUES.map((v) => ({ name: VIRTUE_NAMES[v], level: starLevel(summary.virtues[v] ?? 0) })),
  });
  if (summary.words.length > 0) {
    left.push({ kind: 'subheading', text: 'Words he carries' });
    left.push({ kind: 'line', text: summary.words.join(' · ') });
  }
  if (summary.memories.length > 0) {
    left.push({ kind: 'subheading', text: 'Remembered' });
    for (const m of summary.memories) left.push({ kind: 'line', text: m.entry?.name ?? m.id });
  }

  const right: SummaryBlock[] = [{ kind: 'heading', text: 'Your Comedy' }];
  if (summary.verses.length > 0) {
    for (const v of summary.verses) {
      right.push({ kind: 'cento', lines: centoLines(v.verse).map((l) => ({ text: l.text, citation: l.citation })) });
      right.push({ kind: 'gap' });
    }
  } else {
    right.push({
      kind: 'line',
      text: 'No verse was composed yet. Every verse made in the Book is written here in Longfellow’s lines.',
      muted: true,
    });
  }
  for (const canto of summary.cantos) {
    if (canto.choices.length === 0) continue;
    right.push({ kind: 'subheading', text: canto.title });
    for (const row of canto.choices) right.push(choiceBlock(row));
  }
  return { summary: left, comedy: right };
}

/**
 * Greedy pagination of measured blocks: indices per page. A block taller than
 * a page gets a page of its own; a subheading never ends a page (it moves on
 * with the block after it).
 */
export function paginate(heights: readonly number[], pageHeight: number, kinds?: readonly SummaryBlock['kind'][]): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  for (let i = 0; i < heights.length; i++) {
    const h = Math.max(0, heights[i] ?? 0);
    if (current.length > 0 && used + h > pageHeight) {
      // Keep a trailing subheading with what follows it.
      const lastIdx = current[current.length - 1] as number;
      if (kinds && kinds[lastIdx] === 'subheading' && current.length > 1) {
        current.pop();
        pages.push(current);
        current = [lastIdx];
        used = heights[lastIdx] ?? 0;
      } else {
        pages.push(current);
        current = [];
        used = 0;
      }
    }
    current.push(i);
    used += h;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}
