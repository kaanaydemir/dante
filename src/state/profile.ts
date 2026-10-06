/**
 * Game profiles. `m0` (bible §7.5, GDD 10.4): Canto I straight into Canto V.
 * The engine opens the missing locks, grants the missing words and sheds the
 * Fear burden, so every player enters Canto V in the state of the end of
 * Canto IV. Only what is missing is applied, as ordinary system effects.
 *
 * Owner: team B (state). Pure.
 */

import { M0_PROFILE } from '../config';
import type { GameStateView } from '../runtime/contracts';
import type { Effect } from '../story/types';

/** The missing parts of the M0 kit for this state, in order: unlocks, then words, then shed. */
export function m0KitEffects(state: GameStateView): Effect[] {
  const out: Effect[] = [];
  for (const feature of M0_PROFILE.unlocks) {
    if (!state.unlocks.includes(feature)) out.push({ type: 'unlock', feature });
  }
  const { owned, sealed, shed } = state.words;
  for (const word of M0_PROFILE.words) {
    // `word:` also unseals a sealed word; a shed word never returns.
    if (shed.includes(word)) continue;
    if (!owned.includes(word) || sealed.includes(word)) out.push({ type: 'word', word });
  }
  for (const word of M0_PROFILE.shed) {
    if (owned.includes(word)) out.push({ type: 'shed', word });
  }
  return out;
}
