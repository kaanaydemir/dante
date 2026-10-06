/**
 * Initial game state.
 *
 * STARTER IMPLEMENTATION written by the architect. Owner: team B (state).
 * Keep the export `createInitialState`; values come from config.ts.
 * Note: the M0 kit (config M0_PROFILE) is applied by the store's reset('m0')
 * through ordinary effects, not here, so the Book and logs stay consistent.
 */

import { RESOURCES, TRUST } from '../config';
import type { GameProfile, GameStateData } from '../runtime/contracts';

export function createInitialState(profile: GameProfile = 'full', now: number = Date.now()): GameStateData {
  return {
    version: 1,
    profile,
    heart: { pity: 0, justice: 0, ledger: {} },
    trust: TRUST.start,
    virtues: { prudence: 0, justice: 0, fortitude: 0, temperance: 0 },
    resolve: RESOURCES.resolveStart,
    grace: RESOURCES.graceStart,
    gracemax: RESOURCES.graceMaxStart,
    words: { owned: [], sealed: [], shed: [] },
    memories: [],
    codex: [],
    flags: [],
    events: [],
    seen: [],
    choices: {},
    unlocks: [],
    verses: [],
    equippedVerse: null,
    log: [],
    linesSeen: {},
    pendingReveals: [],
    hintsUsed: [],
    completedCantos: [],
    position: { canto: null, scene: null, beat: null, checkpoint: null },
    stats: { faints: 0, choicesMade: 0, startedAt: now },
  };
}
