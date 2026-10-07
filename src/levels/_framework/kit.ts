/**
 * A small kit for writing per-canto levels (docs/ENGINE.md §8.2): beat-hook
 * combinators and bounded "wait for the player" helpers. Every helper honours
 * the hook's abort signal and has a time limit (in game time, so the Book's
 * pause does not eat it), so a level can never hold the story forever.
 *
 *   beatHooks: {
 *     'inf01.s4.b1': onDo(4, async (ctx) => {
 *       const roar = ctx.level.mechanic<HoldGround>('hold_ground');
 *       await roar?.cue();
 *     }),
 *     'inf02.s5.b1': onDo(1, (ctx) => { void untilMoved(ctx.level, 20_000, ctx.signal).then(() => ctx.level.emit('inf02.dante_rises')); }),
 *   }
 *
 * Owner: team D (levels framework).
 */

import type { ActorHandle, BeatHook, BeatHookContext, LevelRuntime } from '../../runtime/contracts';
import type { EventId } from '../../story/types';
import { worldExtras } from '../../world/extras';
import { dist } from '../../world/geometry';

/** Polling step of the wait helpers (game ms). */
const STEP_MS = 50;

/** Run `fn` at the start of the beat. */
export function onStart(fn: BeatHook): BeatHook {
  return (ctx) => (ctx.phase === 'start' ? fn(ctx) : undefined);
}

/** Run `fn` at the end of the beat. */
export function onEnd(fn: BeatHook): BeatHook {
  return (ctx) => (ctx.phase === 'end' ? fn(ctx) : undefined);
}

/** Run `fn` for the beat's DO line number `index` (0-based among its DO lines). */
export function onDo(index: number, fn: BeatHook): BeatHook {
  return (ctx) => (ctx.phase === 'do' && ctx.doIndex === index ? fn(ctx) : undefined);
}

/** Run `fn` for the DO line that carries `{event:<id>}`. */
export function onDoEvent(event: EventId, fn: BeatHook): BeatHook {
  return (ctx) => (ctx.phase === 'do' && ctx.stmt?.tags.some((t) => t.kind === 'event' && t.id === event) ? fn(ctx) : undefined);
}

/** Several hooks for one beat, run in order. */
export function hooks(...parts: readonly BeatHook[]): BeatHook {
  return async (ctx: BeatHookContext) => {
    for (const p of parts) {
      if (ctx.signal.aborted) return;
      await p(ctx);
    }
  };
}

/**
 * Poll `test` every few frames until it is true (resolves true), `limitMs` of
 * game time pass (false) or `signal` aborts (false).
 */
export async function until(level: LevelRuntime, test: () => boolean, limitMs: number, signal?: AbortSignal): Promise<boolean> {
  // No limit means half an hour; a real-time cap ends the wait even if game time stops (scene gone).
  const limit = limitMs > 0 ? limitMs : 30 * 60_000;
  const hardCap = Date.now() + Math.max(limit * 3, limit + 60_000);
  let waited = 0;
  for (;;) {
    if (signal?.aborted) return false;
    try {
      if (test()) return true;
    } catch {
      return false;
    }
    if (waited >= limit || Date.now() > hardCap) return false;
    await level.wait(STEP_MS, signal);
    waited += STEP_MS;
  }
}

/** Dante (or `who`) comes within `radius` px of a point or an actor. */
export function reach(
  level: LevelRuntime,
  target: { readonly x: number; readonly y: number } | ActorHandle | (() => { x: number; y: number } | null),
  radius: number,
  limitMs: number,
  signal?: AbortSignal,
  who: ActorHandle = level.player,
): Promise<boolean> {
  const where = (): { x: number; y: number } | null => (typeof target === 'function' ? target() : { x: target.x, y: target.y });
  return until(
    level,
    () => {
      const t = where();
      return t !== null && dist(t.x, t.y, who.x, who.y) <= radius;
    },
    limitMs,
    signal,
  );
}

/** The player stands still (no movement input, no dash) for `ms` in total. */
export async function stillFor(level: LevelRuntime, ms: number, limitMs: number, signal?: AbortSignal): Promise<boolean> {
  const w = worldExtras(level);
  let still = 0;
  let last = Date.now();
  return until(
    level,
    () => {
      const now = Date.now();
      const dt = Math.min(100, now - last);
      last = now;
      const input = w?.input();
      const moving = !input || Math.hypot(input.moveX, input.moveY) > 0.1 || input.dashPressed;
      if (!moving && (w?.playable() ?? false)) still += dt;
      return still >= ms;
    },
    limitMs,
    signal,
  );
}

/** The player tries to move (any movement key, dash or E). */
export function untilMoved(level: LevelRuntime, limitMs: number, signal?: AbortSignal): Promise<boolean> {
  const w = worldExtras(level);
  return until(
    level,
    () => {
      const input = w?.input();
      return Boolean(input && (Math.hypot(input.moveX, input.moveY) > 0.2 || input.dashPressed || input.interactPressed));
    },
    limitMs,
    signal,
  );
}

/** Wait for a gameplay event on the bus (whoever emits it). */
export function waitForEvent(level: LevelRuntime, id: EventId, limitMs: number, signal?: AbortSignal): Promise<boolean> {
  let seen = false;
  const off = level.bus.on('world:signal', (sig) => {
    if (sig.kind === 'event' && sig.id === id) seen = true;
  });
  return until(level, () => seen, limitMs, signal).finally(off);
}

/** A verse of `category` is cast within `radius` of a point. */
export function verseNear(
  level: LevelRuntime,
  at: { readonly x: number; readonly y: number },
  radius: number,
  categories: readonly string[],
  limitMs: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const w = worldExtras(level);
  let hit = false;
  const off = w?.onVerse((cast) => {
    if (categories.includes(cast.category) && dist(cast.x, cast.y, at.x, at.y) <= radius) hit = true;
  });
  return until(level, () => hit, limitMs, signal).finally(() => off?.());
}

/** Emit `event` when `promise` resolves true (or always, with `always`). Never throws. */
export function emitWhen(level: LevelRuntime, promise: Promise<boolean>, event: EventId, always = false): void {
  void promise
    .then((ok) => {
      if (ok || always) level.emit(event);
    })
    .catch(() => {
      if (always) level.emit(event);
    });
}
