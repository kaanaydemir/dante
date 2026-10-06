/**
 * Tunable numbers of the verse system (bible §3.4.5: "Grace cost, durations
 * and power are tuned in system design"). Change them here, not inline.
 *
 * Owner: team B (verse). Pure constants.
 */

import { RESOURCES } from '../config';

export const VERSE_TUNING = {
  /** Grace per cast tercet; a chain pays this for each of its tercets. */
  gracePerTercet: RESOURCES.verseGraceCost,
  /** Extra Grace for closing a verse with a coda. */
  graceForCoda: 1,
  /** Chapter 1: a chain is at most two tercets (bible §3.4.7). */
  maxTercetsChapter1: 2,
  /** Base power of one tercet before its outer words strengthen it. */
  basePower: 1,
  /** Each tercet after the first in a chain is this much stronger than the one before (the "rising bonus"). */
  chainBonusStep: 0.25,
  /** A coda plays the strengthened "closing" version of its category. */
  codaPowerMultiplier: 1.5,
  /**
   * GDD 2.3: Grace fills as Dante reads and listens. Taking a word from a
   * verse line gives this much Grace (burden words give none).
   */
  graceForWord: 1,
  /** GDD 2.3: a beat the player opens by talking to someone gives this much Grace. */
  graceForTalk: 0.5,
} as const;

/** Grace cost of a verse with `tercets` tercets and an optional coda. */
export function graceCostFor(tercets: number, hasCoda: boolean): number {
  if (tercets <= 0) return 0;
  return tercets * VERSE_TUNING.gracePerTercet + (hasCoda ? VERSE_TUNING.graceForCoda : 0);
}

/** Power multiplier of the tercet at `index` (0-based) in a chain. */
export function chainMultiplier(index: number): number {
  return 1 + Math.max(0, index) * VERSE_TUNING.chainBonusStep;
}
