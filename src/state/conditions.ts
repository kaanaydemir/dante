/**
 * The ConditionContext over the game state (bible §2.8): the read-only view
 * `evaluateCondition` (story-core) evaluates conditions against.
 *
 * Owner: team B (state). Pure.
 */

import type { GameStateView } from '../runtime/contracts';
import type { ConditionContext, EventId, VariableRef } from '../story/types';

/** The numeric value of a §2.8 variable. Missing data is 0. */
export function variableValue(state: GameStateView, variable: VariableRef): number {
  switch (variable.kind) {
    case 'pity':
      return state.heart.pity;
    case 'justice':
      return state.heart.justice;
    case 'heart':
      return state.heart.pity - state.heart.justice;
    case 'pity_at':
      return state.heart.ledger[variable.sin]?.pity ?? 0;
    case 'justice_at':
      return state.heart.ledger[variable.sin]?.justice ?? 0;
    case 'trust':
      return state.trust;
    case 'virtue':
      return state.virtues[variable.virtue] ?? 0;
    case 'resolve':
      return state.resolve;
    case 'grace':
      return state.grace;
  }
  return 0;
}

/**
 * A live ConditionContext. `read` is called on every query, so the context
 * stays valid across store resets and restores. `hasEvent` reads every event
 * recorded so far; the runner wraps it with its scene-scoped set (bible §2.9).
 */
export function createConditionContext(read: () => GameStateView): ConditionContext {
  return {
    hasFlag: (id) => read().flags.includes(id),
    hasMemory: (id) => read().memories.includes(id),
    hasCodex: (id) => read().codex.includes(id),
    hasWord: (word) => {
      const w = read().words;
      return w.owned.includes(word) && !w.sealed.includes(word) && !w.shed.includes(word);
    },
    isSealed: (word) => read().words.sealed.includes(word),
    choiceLetter: (choice) => read().choices[choice]?.letter ?? null,
    hasSeen: (id) => read().seen.includes(id),
    hasEvent: (id) => read().events.includes(id),
    value: (variable) => variableValue(read(), variable),
  };
}

/** The same context with a different `event:` predicate (the runner's scene-scoped event set). */
export function withEventScope(ctx: ConditionContext, hasEvent: (id: EventId) => boolean): ConditionContext {
  return {
    hasFlag: (id) => ctx.hasFlag(id),
    hasMemory: (id) => ctx.hasMemory(id),
    hasCodex: (id) => ctx.hasCodex(id),
    hasWord: (word) => ctx.hasWord(word),
    isSealed: (word) => ctx.isSealed(word),
    choiceLetter: (choice) => ctx.choiceLetter(choice),
    hasSeen: (id) => ctx.hasSeen(id),
    hasEvent,
    value: (variable) => ctx.value(variable),
  };
}
