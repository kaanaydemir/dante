/**
 * Read-only helpers over the game state for the HUD, the Book and the world.
 * Owner: team B (state). Pure.
 */

import { HEART_TILT_CLAMP, TRUST, VIRTUE_TIERS } from '../config';
import type { GameStateView, ReadingLogEntry, TrustLabel } from '../runtime/contracts';
import type { CantoId, SinTag, Virtue, WordName } from '../story/types';

/** heart = pity − justice (bible §3.1). Positive leans to pity. */
export function heartBalance(state: GameStateView): number {
  return state.heart.pity - state.heart.justice;
}

/** The scale beam's tilt, clamped to ±HEART_TILT_CLAMP (bible §3.1: the number is never shown). */
export function heartTilt(state: GameStateView): number {
  return Math.max(-HEART_TILT_CLAMP, Math.min(HEART_TILT_CLAMP, heartBalance(state)));
}

/** The ledger of one sin (pity and justice given against it). */
export function sinLedger(state: GameStateView, sin: SinTag): { pity: number; justice: number } {
  const entry = state.heart.ledger[sin];
  return { pity: entry?.pity ?? 0, justice: entry?.justice ?? 0 };
}

/** Bible §3.3 thresholds: Faithful ≥ 7, Wayward ≤ 2. */
export function trustLabel(trust: number): TrustLabel {
  if (trust >= TRUST.faithful) return 'Faithful';
  if (trust <= TRUST.wayward) return 'Wayward';
  return 'Steady';
}

export function trustLabelOf(state: GameStateView): TrustLabel {
  return trustLabel(state.trust);
}

/** Bible §3.6: tiers at 2, 5 and 9 points (0 = none yet, 3 = highest). */
export function virtueTier(state: GameStateView, virtue: Virtue): number {
  const points = state.virtues[virtue] ?? 0;
  return VIRTUE_TIERS.filter((t) => points >= t).length;
}

export type WordStatus = 'owned' | 'sealed' | 'shed' | 'unknown';

/** Where a word stands for the Book's word cards. */
export function wordStatus(state: GameStateView, word: WordName): WordStatus {
  const w = state.words;
  if (w.shed.includes(word)) return 'shed';
  if (w.sealed.includes(word)) return 'sealed';
  if (w.owned.includes(word)) return 'owned';
  return 'unknown';
}

/** Words that can go into a tercet now (owned, not sealed). The burden is excluded by the verse rules. */
export function usableWords(state: GameStateView): WordName[] {
  return state.words.owned.filter((w) => !state.words.sealed.includes(w));
}

/** "As you lived it" (bible §1.5): the reading log of one canto, in order. */
export function logOfCanto(state: GameStateView, canto: CantoId): ReadingLogEntry[] {
  return state.log.filter((e) => e.canto === canto) as ReadingLogEntry[];
}

/** Cantos with something in the log, in the order they were first read. */
export function cantosRead(state: GameStateView): CantoId[] {
  const out: CantoId[] = [];
  for (const e of state.log) if (!out.includes(e.canto)) out.push(e.canto);
  return out;
}

/** Longfellow lines the reader has seen in one canto (gold in the Book). */
export function linesSeenIn(state: GameStateView, canticle: string, canto: number): readonly number[] {
  return state.linesSeen[`${canticle}:${canto}`] ?? [];
}
