/**
 * Pure effect application (bible §2.10): one EFFECTS token applied to a
 * mutable GameStateData. The store wraps this with bus events and feedback.
 *
 * Owner: team B (state). No Phaser, no DOM.
 *
 * Rules implemented here:
 * - Heart effects only add (never subtract); every addition also goes into the
 *   per-sin ledger (`pity@lust`). A non-positive amount is ignored.
 * - Trust is clamped to 0–10.
 * - Virtues only grow.
 * - `word:` gives the word, or unseals it when sealed; a shed word never returns.
 * - `seal:` seals (adding the word if missing); `shed:` drops a held word for good.
 * - Memories, codex entries, flags and unlocks are added once (flags are never lowered).
 * - Resources are in bar units. A scripted `resolve-N` never takes Resolve below
 *   1 unit (script effects never cause a faint); easy mode ignores Resolve losses.
 */

import { RESOURCES, TRUST } from '../config';
import type { EffectOutcome, GameStateData, HeartLedgerEntry } from '../runtime/contracts';
import type { Effect } from '../story/types';

export interface ApplyOptions {
  /** GDD 9 easy mode: Resolve never decreases. */
  readonly easyMode: boolean;
}

/** The outcome of one effect plus which channels changed (so the store can emit the matching bus events). */
export interface AppliedEffect {
  readonly outcome: EffectOutcome;
  readonly changed: boolean;
  /** The heart counters changed. */
  readonly heart: boolean;
  /** Trust changed by this much (after clamping); 0 when unchanged. */
  readonly trustDelta: number;
  /** Resolve, Grace or the Grace maximum changed. */
  readonly resources: boolean;
}

const NONE: Omit<AppliedEffect, 'outcome' | 'changed'> = { heart: false, trustDelta: 0, resources: false };

function result(outcome: EffectOutcome, changed: boolean, extra: Partial<AppliedEffect> = {}): AppliedEffect {
  return { ...NONE, outcome, changed, ...extra };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function addUnique<T>(list: T[], value: T): boolean {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

function removeValue<T>(list: T[], value: T): boolean {
  const i = list.indexOf(value);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

/** Outcome for a bounded numeric change: applied, clamped (partly or fully), or ignored when nothing was asked. */
function boundedOutcome(before: number, target: number, after: number): { outcome: EffectOutcome; changed: boolean } {
  const changed = after !== before;
  if (target === before) return { outcome: 'ignored', changed: false };
  return { outcome: after === target ? 'applied' : 'clamped', changed };
}

/**
 * Applies one effect to `state` in place and reports what happened.
 * Never throws for well-typed input; malformed values degrade to `ignored`.
 */
export function applyEffectTo(state: GameStateData, effect: Effect, opts: ApplyOptions): AppliedEffect {
  switch (effect.type) {
    case 'heart': {
      const n = effect.amount;
      if (!finite(n) || n <= 0) return result('ignored', false);
      state.heart[effect.side] += n;
      if (effect.sin) {
        const ledger = state.heart.ledger;
        const entry: HeartLedgerEntry = ledger[effect.sin] ?? { pity: 0, justice: 0 };
        entry[effect.side] += n;
        ledger[effect.sin] = entry;
      }
      return result('applied', true, { heart: true });
    }

    case 'trust': {
      const d = effect.delta;
      if (!finite(d) || d === 0) return result('ignored', false);
      const before = state.trust;
      const target = before + d;
      const after = clamp(target, TRUST.min, TRUST.max);
      state.trust = after;
      const o = boundedOutcome(before, target, after);
      return result(o.outcome, o.changed, { trustDelta: after - before });
    }

    case 'virtue': {
      const n = effect.amount;
      if (!finite(n) || n <= 0 || !(effect.virtue in state.virtues)) return result('ignored', false);
      state.virtues[effect.virtue] += n;
      return result('applied', true);
    }

    case 'word': {
      const w = effect.word;
      const words = state.words;
      if (!w || words.shed.includes(w)) return result('ignored', false);
      if (words.sealed.includes(w)) {
        removeValue(words.sealed, w);
        addUnique(words.owned, w);
        return result('unsealed', true);
      }
      if (words.owned.includes(w)) return result('duplicate', false);
      words.owned.push(w);
      return result('applied', true);
    }

    case 'seal': {
      const w = effect.word;
      const words = state.words;
      if (!w || words.shed.includes(w)) return result('ignored', false);
      if (words.sealed.includes(w)) return result('duplicate', false);
      addUnique(words.owned, w);
      words.sealed.push(w);
      return result('applied', true);
    }

    case 'shed': {
      const w = effect.word;
      const words = state.words;
      if (!w) return result('ignored', false);
      if (words.shed.includes(w)) return result('duplicate', false);
      if (!words.owned.includes(w)) return result('ignored', false);
      removeValue(words.owned, w);
      removeValue(words.sealed, w);
      words.shed.push(w);
      return result('applied', true);
    }

    case 'memory':
      if (!effect.id) return result('ignored', false);
      return addUnique(state.memories, effect.id) ? result('applied', true) : result('duplicate', false);

    case 'codex':
      if (!effect.id) return result('ignored', false);
      return addUnique(state.codex, effect.id) ? result('applied', true) : result('duplicate', false);

    case 'flag':
      if (!effect.id) return result('ignored', false);
      return addUnique(state.flags, effect.id) ? result('applied', true) : result('duplicate', false);

    case 'unlock':
      if (!effect.feature) return result('ignored', false);
      return addUnique(state.unlocks, effect.feature) ? result('applied', true) : result('duplicate', false);

    case 'resolve': {
      const d = effect.delta;
      if (!finite(d) || d === 0) return result('ignored', false);
      if (d < 0 && opts.easyMode) return result('ignored', false);
      const before = state.resolve;
      const target = before + d;
      let after: number;
      if (d < 0) {
        // Script effects never cause a faint: never below 1 unit (and never raise a lower value).
        after = Math.max(target, Math.min(before, 1));
      } else {
        after = Math.min(target, Math.max(before, RESOURCES.resolveMax));
      }
      after = clamp(after, 0, Math.max(before, RESOURCES.resolveMax));
      state.resolve = after;
      const o = boundedOutcome(before, target, after);
      return result(o.outcome, o.changed, { resources: o.changed });
    }

    case 'grace': {
      const d = effect.delta;
      if (!finite(d) || d === 0) return result('ignored', false);
      const before = state.grace;
      const target = before + d;
      const after = clamp(target, 0, Math.max(0, state.gracemax));
      state.grace = after;
      const o = boundedOutcome(before, target, after);
      return result(o.outcome, o.changed, { resources: o.changed });
    }

    case 'gracemax': {
      const d = effect.delta;
      if (!finite(d) || d === 0) return result('ignored', false);
      const before = state.gracemax;
      const target = before + d;
      const after = clamp(target, 0, RESOURCES.graceMaxLimit);
      state.gracemax = after;
      if (state.grace > after) state.grace = after;
      const o = boundedOutcome(before, target, after);
      return result(o.outcome, o.changed, { resources: o.changed });
    }

    default: {
      // Unknown effect type (malformed data from outside the type system).
      return result('ignored', false);
    }
  }
}
