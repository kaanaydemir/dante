/**
 * Tercets, terza-rima chains and the coda (bible §3.4.5): validation, effect,
 * Grace cost and the cento reading.
 *
 * Owner: team B (verse). Contract: EvaluateVerse (src/runtime/contracts.ts).
 * Pure: used by the Words screen (team C) and by verse casting (team D).
 *
 * Rules (bible §3.4.4–§3.4.5):
 * - A tercet is three slots, A · B · A. The two outer words share a rhyme family
 *   and are different words. The middle word belongs to another family.
 *   Burden and sealed words cannot be placed; the closer (Judgment, no family)
 *   only sits in the middle and ends a chain.
 * - Effect: the middle word's category ("the heart of the tercet"). Every outer
 *   word of the same category strengthens it one step: strength = 1 + that count.
 * - Chain (aba bcb cdc): the next tercet's outer words rhyme with the previous
 *   middle word. No word appears twice in a chain. Needs `unlock:chain`; at most
 *   `ctx.maxTercets` tercets (Chapter 1: two).
 * - Coda: one word that rhymes with the last middle word and is not used in the
 *   chain; it plays the strengthened closing of its own category. Needs `unlock:chain`.
 */

import type {
  ComposedVerse,
  EvaluateVerse,
  GameStateView,
  Tercet,
  VerseContext,
  VerseEvaluation,
  VerseIssue,
  VerseIssueCode,
} from '../runtime/contracts';
import { getWord } from '../story/words';
import type { WordCategory, WordDef, WordName } from '../story/types';
import { centoLines } from './cento';
import { chainMultiplier, graceCostFor, VERSE_TUNING } from './costs';

type Slot = 0 | 1 | 2;

/** Short plain-English explanations for the compose screen. */
export const VERSE_ISSUE_MESSAGES: Readonly<Record<VerseIssueCode, string>> = {
  locked: 'You cannot compose verses yet.',
  empty: 'Place three words: the outer two must rhyme.',
  unknown_word: 'That is not a word from the poem.',
  not_owned: 'You do not carry that word.',
  sealed: 'That word is sealed. It cannot be placed.',
  burden: 'A burden cannot be placed in a verse.',
  outer_not_rhyming: 'The first and the last word must rhyme.',
  outer_same_word: 'The first and the last word must be different words.',
  middle_same_family: 'The middle word must not rhyme with the outer two.',
  closer_not_middle: 'This word can only stand in the middle.',
  chain_locked: 'You cannot chain verses yet.',
  chain_break: 'In a chain, the next outer words must rhyme with the middle word before them.',
  chain_repeat: 'A word cannot appear twice in a chain.',
  chain_after_closer: 'Nothing can follow a verse closed by this word.',
  too_many_tercets: 'The chain is too long.',
  coda_locked: 'You cannot close a verse with a coda yet.',
  coda_not_rhyming: 'The coda must rhyme with the last middle word.',
  coda_reused: 'The coda must be a word not used in the chain.',
};

function issue(code: VerseIssueCode, tercet: number | null, slot: Slot | null, word: WordName | null): VerseIssue {
  return { code, tercet, slot, word, message: VERSE_ISSUE_MESSAGES[code] };
}

function canonical(word: WordName): WordName {
  return getWord(word)?.name ?? word;
}

/** Two different words of one rhyme family rhyme; a word never rhymes with itself; family-less words never rhyme. */
function rhymes(a: WordDef | null, b: WordDef | null): boolean {
  return a !== null && b !== null && a.name !== b.name && a.family !== null && a.family === b.family;
}

/** Ownership / placeability checks for one word in one slot. */
function checkWord(
  word: WordName,
  def: WordDef | null,
  tercet: number | null,
  slot: Slot | null,
  owned: ReadonlySet<WordName>,
  sealed: ReadonlySet<WordName>,
  out: VerseIssue[],
): void {
  if (!def) {
    out.push(issue('unknown_word', tercet, slot, word));
    return;
  }
  if (def.role === 'burden') out.push(issue('burden', tercet, slot, def.name));
  if (!owned.has(def.name)) out.push(issue('not_owned', tercet, slot, def.name));
  else if (sealed.has(def.name)) out.push(issue('sealed', tercet, slot, def.name));
}

export const evaluateVerse: EvaluateVerse = (verse: ComposedVerse, ctx: VerseContext): VerseEvaluation => {
  const issues: VerseIssue[] = [];
  const unlocks = new Set<string>(ctx.unlocks);
  const owned = new Set(ctx.owned.map(canonical));
  const sealed = new Set(ctx.sealed.map(canonical));
  const tercets = verse.tercets;

  if (!unlocks.has('compose') && !unlocks.has('verse')) issues.push(issue('locked', null, null, null));
  if (tercets.length === 0) issues.push(issue('empty', null, null, null));
  if (tercets.length > 1 && !unlocks.has('chain')) issues.push(issue('chain_locked', null, null, null));
  if (tercets.length > Math.max(1, ctx.maxTercets)) issues.push(issue('too_many_tercets', null, null, null));

  /** First place each word appears in the chain. */
  const firstUse = new Map<WordName, number>();
  const effects: { middle: WordName; category: WordCategory; strength: number }[] = [];

  tercets.forEach((t: Tercet, ti: number) => {
    const defs = t.map((w) => (w ? getWord(w) : null)) as [WordDef | null, WordDef | null, WordDef | null];

    // Slots: empty, unknown, ownership, burden, closer placement.
    ([0, 1, 2] as const).forEach((slot) => {
      const word = t[slot];
      if (!word) {
        issues.push(issue('empty', ti, slot, null));
        return;
      }
      const def = defs[slot];
      checkWord(word, def, ti, slot, owned, sealed, issues);
      if (def && def.role === 'closer' && slot !== 1) issues.push(issue('closer_not_middle', ti, slot, def.name));
    });

    const [a, b, c] = defs;

    // Outer pair: same family, different words.
    if (a && c) {
      if (a.name === c.name) issues.push(issue('outer_same_word', ti, 2, c.name));
      else if (!rhymes(a, c)) issues.push(issue('outer_not_rhyming', ti, 2, c.name));
    }

    // Middle word: another family than the outer pair.
    if (b && b.family !== null) {
      const outerFamily = a?.family ?? c?.family ?? null;
      if (outerFamily !== null && b.family === outerFamily) issues.push(issue('middle_same_family', ti, 1, b.name));
    }

    // Chain link with the previous tercet.
    if (ti > 0) {
      const prev = tercets[ti - 1];
      const prevMiddle = prev && prev[1] ? getWord(prev[1]) : null;
      if (prevMiddle && prevMiddle.role === 'closer') {
        issues.push(issue('chain_after_closer', ti, null, prevMiddle.name));
      } else if (prevMiddle && a && !rhymes(prevMiddle, a)) {
        issues.push(issue('chain_break', ti, 0, a.name));
      }
    }

    // No word twice in a chain (within one tercet the outer pair rule reports it).
    ([0, 1, 2] as const).forEach((slot) => {
      const def = defs[slot];
      if (!def) return;
      const seenIn = firstUse.get(def.name);
      if (seenIn === undefined) firstUse.set(def.name, ti);
      else if (seenIn !== ti) issues.push(issue('chain_repeat', ti, slot, def.name));
    });

    // Effect of this tercet: the middle word's category, strengthened by matching outer words.
    if (b && b.role !== 'burden') {
      const strength = 1 + [a, c].filter((d) => d !== null && d.category === b.category).length;
      effects.push({ middle: b.name, category: b.category, strength });
    }
  });

  // Coda
  let coda: VerseEvaluation['coda'] = null;
  if (verse.coda) {
    const def = getWord(verse.coda);
    if (!unlocks.has('chain')) issues.push(issue('coda_locked', null, null, def?.name ?? verse.coda));
    checkWord(verse.coda, def, null, null, owned, sealed, issues);
    if (def) {
      const last = tercets[tercets.length - 1];
      const lastMiddle = last && last[1] ? getWord(last[1]) : null;
      if (firstUse.has(def.name)) issues.push(issue('coda_reused', null, null, def.name));
      else if (!rhymes(lastMiddle, def)) issues.push(issue('coda_not_rhyming', null, null, def.name));
      if (def.role !== 'burden') coda = { word: def.name, category: def.category };
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    tercets: effects,
    chainLength: tercets.length,
    coda,
    graceCost: graceCostFor(tercets.length, verse.coda !== null && verse.coda !== ''),
    cento: centoLines(verse),
  };
};

// ---------------------------------------------------------------------------
// Helpers for the Words screen (C) and casting (D)
// ---------------------------------------------------------------------------

/** The verse context of the current state (Chapter 1 chain limit by default). */
export function verseContextOf(state: GameStateView, maxTercets: number = VERSE_TUNING.maxTercetsChapter1): VerseContext {
  return {
    owned: state.words.owned,
    sealed: state.words.sealed,
    unlocks: state.unlocks,
    maxTercets,
  };
}

/** One step of a cast, in play order: each tercet, then the coda's strengthened closing. */
export interface VerseCastStep {
  readonly kind: 'tercet' | 'coda';
  /** The middle word of a tercet, or the coda word. */
  readonly word: WordName;
  readonly category: WordCategory;
  /** 1 + outer words of the same category (tercets); 1 for the coda. */
  readonly strength: number;
  /** strength × the chain's rising bonus (tercets) or × the coda multiplier. */
  readonly power: number;
  /** Position in the chain (0-based); the coda gets the chain length. */
  readonly index: number;
}

/** What casting an evaluated verse does, step by step. Empty when the verse is not valid. */
export function castPlan(evaluation: VerseEvaluation): VerseCastStep[] {
  if (!evaluation.valid) return [];
  const steps: VerseCastStep[] = evaluation.tercets.map((t, i) => ({
    kind: 'tercet',
    word: t.middle,
    category: t.category,
    strength: t.strength,
    power: VERSE_TUNING.basePower * t.strength * chainMultiplier(i),
    index: i,
  }));
  if (evaluation.coda) {
    const index = evaluation.tercets.length;
    steps.push({
      kind: 'coda',
      word: evaluation.coda.word,
      category: evaluation.coda.category,
      strength: 1,
      power: VERSE_TUNING.basePower * VERSE_TUNING.codaPowerMultiplier * chainMultiplier(index),
      index,
    });
  }
  return steps;
}

/**
 * Every valid single tercet the player can compose now, ordered by the order
 * the words were gained (outer pair first, then middle). For suggestions,
 * tutorials and autoplay.
 */
export function listValidTercets(ctx: VerseContext): Tercet[] {
  const usable = ctx.owned
    .map((w) => getWord(w))
    .filter((d): d is WordDef => d !== null && d.role !== 'burden' && !ctx.sealed.includes(d.name));
  const out: Tercet[] = [];
  for (const a of usable) {
    for (const c of usable) {
      if (!rhymes(a, c)) continue;
      for (const b of usable) {
        if (b.name === a.name || b.name === c.name) continue;
        if (b.family !== null && b.family === a.family) continue;
        const tercet: Tercet = [a.name, b.name, c.name];
        if (evaluateVerse({ tercets: [tercet], coda: null }, ctx).valid) out.push(tercet);
      }
    }
  }
  return out;
}
