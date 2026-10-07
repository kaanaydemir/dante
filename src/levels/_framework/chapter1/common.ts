/**
 * Shared plumbing for the Chapter 1 levels: a "story level" is the generic
 * layout of its script (places, path, figures, ambient mechanics) plus a
 * hand-made layer of moments — beat hooks that stage the poem's moments with
 * the mechanics library and produce the events its DO lines name.
 *
 * Rules every moment follows (docs/ENGINE.md: no soft-locks):
 * - An event a level declares in `emits` is always produced in the end: by
 *   the player's play, or by the moment's own time limit.
 * - A DO hook that holds its beat (gameplay inside a beat) never holds it
 *   under autoplay, and always has a time limit in game time.
 * - Moments that outlive their beat (the runner waits on an event meanwhile)
 *   are bound to the level's lifetime (`levelSignal`), not to the beat.
 *
 * Owner: team D (levels framework).
 */

import { paletteFor } from '../../../config';
import type { ActorHandle, BeatHook, BeatHookContext, LevelBuildContext, LevelModule, LevelRuntime, PlaceDef } from '../../../runtime/contracts';
import type { BeatId, CantoId, EventId, SpeakerId } from '../../../story/types';
import { worldExtras, type WorldExtras } from '../../../world/extras';
import { dist, rectCenter, type Vec } from '../../../world/geometry';
import { buildGenericInto, emptyLevel, type AmbientOverrides } from '../generic';
import { planGenericLevel, type GenericLayout } from '../layout';
import { until } from '../kit';

export interface StoryLevelSpec {
  readonly id: CantoId;
  /** Events this level produces (the runner then waits for the player instead of firing them itself). */
  readonly emits: readonly EventId[];
  /** The generic level's ambient mechanics (default true). */
  readonly ambient?: boolean;
  /** Changes to the ambient mechanics (ids, events, strengths; `false` leaves one out). */
  readonly overrides?: AmbientOverrides;
  /** Extra building after the generic layout (figures, mechanics, props). */
  build?(ctx: LevelBuildContext, layout: GenericLayout): void;
  /** Called at the start of every beat, before its own hook (staging that depends on where the story is). */
  everyBeat?: BeatHook;
  readonly hooks: Readonly<Record<BeatId, BeatHook>>;
}

const specs = new WeakMap<LevelModule, StoryLevelSpec>();

/** The spec a story level was made from (tests check its hook ids against the script). */
export function storySpecOf(level: LevelModule): StoryLevelSpec | null {
  return specs.get(level) ?? null;
}

/** A per-canto level built on the generic layout of its script. */
export function storyLevel(spec: StoryLevelSpec): LevelModule {
  const hooks: Record<BeatId, BeatHook> = {};
  const every = spec.everyBeat;
  const level: LevelModule = {
    id: spec.id,
    palette: paletteFor(spec.id),
    emits: spec.emits,
    beatHooks: hooks,
    build: async (ctx) => {
      const script = ctx.script;
      if (!script) {
        await emptyLevel(spec.id).build(ctx);
        return;
      }
      const layout = planGenericLevel(script);
      buildGenericInto(ctx, layout, { ambient: spec.ambient !== false, ...(spec.overrides ? { overrides: spec.overrides } : {}) });
      spec.build?.(ctx, layout);
      // Hooks for every beat of the script: the shared staging first, then the beat's own.
      for (const key of Object.keys(hooks)) delete hooks[key];
      for (const scene of script.scenes) {
        for (const beat of scene.beats) {
          const own = spec.hooks[beat.id];
          if (!own && !every) continue;
          hooks[beat.id] = async (hctx: BeatHookContext) => {
            if (every && hctx.phase === 'start') await every(hctx);
            if (own) await own(hctx);
          };
        }
      }
    },
  };
  specs.set(level, spec);
  return level;
}

/** A beat's position in the canto (scenes in order, then beats); -1 when absent. For staging after jumps and continues. */
export function beatIndex(ctx: BeatHookContext, beatId: string): number {
  let i = 0;
  for (const scene of ctx.canto.scenes) {
    for (const beat of scene.beats) {
      if (beat.id === beatId) return i;
      i += 1;
    }
  }
  return -1;
}

/** The y of a left-to-right polyline (the generic level's path) at x. */
export function pathYAt(path: readonly Vec[], x: number): number {
  if (path.length === 0) return 0;
  const first = path[0] as Vec;
  if (x <= first.x) return first.y;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i] as Vec;
    const b = path[i + 1] as Vec;
    if (x >= a.x && x <= b.x) return b.x === a.x ? a.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return (path[path.length - 1] as Vec).y;
}

/** The world's extended API (always present inside WorldScene). */
export function ext(level: LevelRuntime): WorldExtras | null {
  return worldExtras(level);
}

/** The signal for a moment that outlives its beat: aborted when the level is torn down. */
export function levelSignal(ctx: BeatHookContext): AbortSignal {
  return ext(ctx.level)?.levelSignal ?? ctx.signal;
}

export function placeOf(level: LevelRuntime, id: string): PlaceDef | null {
  return level.place(id);
}

/** The centre of a place (or a fallback point). */
export function centreOf(level: LevelRuntime, id: string, fallback: Vec = { x: level.player.x, y: level.player.y }): Vec {
  const p = level.place(id);
  return p ? rectCenter(p) : fallback;
}

/** The spawn point of a place. */
export function spawnOf(level: LevelRuntime, id: string, fallback: Vec = { x: level.player.x, y: level.player.y }): Vec {
  const p = level.place(id);
  if (!p) return fallback;
  return p.spawn ? { x: p.spawn.x, y: p.spawn.y } : rectCenter(p);
}

/** Show or hide a figure of the level (an NPC). */
export function showFigure(level: LevelRuntime, speaker: SpeakerId, on: boolean, at?: Vec): void {
  const npc = ext(level)?.npcOf(speaker);
  if (!npc) return;
  if (at) npc.actor.teleport(at.x, at.y);
  npc.setVisible(on);
}

/** Virgil stands where the level puts him (no following, no leading) until `virgilFollows`. */
export function virgilHolds(level: LevelRuntime, at?: Vec): void {
  const w = ext(level);
  if (!w) return;
  w.setVirgilLeads(false);
  w.companion.mode = 'hold';
  if (at) {
    const spot = w.freeSpot(at.x, at.y);
    w.companion.actor.teleport(spot.x, spot.y);
  }
}

export function virgilFollows(level: LevelRuntime): void {
  const w = ext(level);
  if (!w) return;
  w.companion.mode = 'follow';
  w.companion.trail.reset(level.player.x, level.player.y);
  w.setVirgilLeads(true);
}

/** Walk an actor to a point (bounded; resolves on arrival, abort or time limit). */
export async function walkTo(level: LevelRuntime, actor: ActorHandle, to: Vec, speed: number, limitMs: number, signal?: AbortSignal): Promise<void> {
  await Promise.race([actor.moveTo(to.x, to.y, { speed, signal }), level.wait(limitMs, signal)]);
}

/**
 * A prompt the player answers with E near a point (a call, a gesture): shows
 * the key cap there and resolves true on E, false on time out / abort.
 */
export function promptE(level: LevelRuntime, id: string, at: () => Vec, radius: number, limitMs: number, signal?: AbortSignal): Promise<boolean> {
  const w = ext(level);
  if (!w) return Promise.resolve(false);
  let pressed = false;
  const first = at();
  const it = w.addInteractable({
    id,
    x: first.x,
    y: first.y,
    radius,
    onInteract: () => {
      pressed = true;
    },
  });
  return until(
    level,
    () => {
      const p = at();
      it.x = p.x;
      it.y = p.y;
      return pressed;
    },
    limitMs,
    signal,
  ).finally(() => w.removeInteractable(id));
}

/** Has Dante moved `px` toward (`sign` > 0) or away from (< 0) a point, compared with where he stood? */
export function movedToward(from: Vec, now: Vec, target: Vec, px: number): boolean {
  return dist(now.x, now.y, target.x, target.y) <= dist(from.x, from.y, target.x, target.y) - px;
}
