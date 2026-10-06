/**
 * Autoplay options (debug, smoke tests): defaults, merging, and the policies
 * the runner applies (which option to answer, which DO events to emit).
 *
 * Owner: team B (runtime). Pure.
 */

import { TIMINGS } from '../config';
import type { ChoiceOption, ChoiceStmt, EventId, OptionLetter } from '../story/types';
import type { AutoplayOptions } from './contracts';
import { canonicalLetter } from './specs';

export const DEFAULT_AUTOPLAY: AutoplayOptions = {
  choices: 'canon',
  textDelayMs: TIMINGS.autoplayTextMs,
  triggers: true,
  triggerDelayMs: TIMINGS.autoplayTriggerMs,
  events: 'all',
  stopAt: null,
};

function nonNegative(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** `partial` over `base` (defaults), with invalid values replaced. */
export function mergeAutoplay(
  partial: Partial<AutoplayOptions> | null | undefined,
  base: AutoplayOptions = DEFAULT_AUTOPLAY,
): AutoplayOptions {
  const p = partial ?? {};
  const choices = p.choices ?? base.choices;
  const events = p.events ?? base.events;
  return {
    choices:
      choices === 'canon' || choices === 'first' || choices === 'last' || (typeof choices === 'object' && choices !== null)
        ? choices
        : base.choices,
    textDelayMs: nonNegative(p.textDelayMs, base.textDelayMs),
    triggers: typeof p.triggers === 'boolean' ? p.triggers : base.triggers,
    triggerDelayMs: nonNegative(p.triggerDelayMs, base.triggerDelayMs),
    events: events === 'all' || events === 'none' || Array.isArray(events) ? events : base.events,
    stopAt: p.stopAt === undefined ? base.stopAt : p.stopAt,
  };
}

/** The letter autoplay answers for a dialogue choice, among the visible options. */
export function autoplayLetter(
  opts: AutoplayOptions,
  choice: ChoiceStmt,
  visible: readonly ChoiceOption[],
): OptionLetter | null {
  if (visible.length === 0) return null;
  const policy = opts.choices;
  if (policy === 'first') return visible[0]?.letter ?? null;
  if (policy === 'last') return visible[visible.length - 1]?.letter ?? null;
  if (typeof policy === 'object') {
    const wanted = policy[choice.id];
    if (wanted && visible.some((o) => o.letter === wanted)) return wanted;
  }
  return canonicalLetter(choice, visible);
}

/** Does autoplay emit this `{event:x}` DO tag? */
export function autoplayEmits(opts: AutoplayOptions, event: EventId): boolean {
  if (opts.events === 'all') return true;
  if (opts.events === 'none') return false;
  return opts.events.includes(event);
}
