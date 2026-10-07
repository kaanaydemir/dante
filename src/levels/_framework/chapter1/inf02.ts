/**
 * Canto II — The Evening of Doubt (bible §7.2, docs/script/inferno-02.md).
 *
 * The generic layout of the script (hillside -> overlook -> switchback ->
 * dusk path -> the stone (bench) -> the fallen stone -> the gorge) with:
 *
 *   s2.b4  Virgil walks on down the path toward the stone; Dante follows
 *          unwillingly (shorter steps, looks back up the hill, a step back
 *          when the keys are let go). Three shadows beside the path take
 *          the shapes of the beasts; walking up to one dissolves it
 *                                                    -> inf02.shadow_faced
 *          standing still, turning back uphill or falling far behind
 *          Virgil (at the latest 20 s into the walk) -> inf02.dante_halts
 *   s3.b1  Virgil climbs back up to Dante for the rebuke
 *   s3.b2  Virgil sits on the flat stone; it is the checkpoint
 *   s5.b1  Dante sits head bowed; a key or E and he rises -> inf02.dante_rises
 *   s6.b3  the fallen stone blocks the way down; the first verse with Love at
 *          its heart (Force) tips it over the edge -> inf02.stone_moved.
 *          Grace never drops below one cast here; Virgil moves it himself if
 *          the reader cannot (a generous time limit), so nobody is ever stuck.
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../../../config';
import type { ActorHandle, BeatHookContext, LevelRuntime } from '../../../runtime/contracts';
import { leadWaypoints } from '../../../world/follow';
import { dist, type Vec } from '../../../world/geometry';
import { hooks, onDo, onStart, stillFor, until, untilMoved } from '../kit';
import { ext, levelSignal, pathYAt, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

const EV = {
  shadowFaced: 'inf02.shadow_faced',
  halts: 'inf02.dante_halts',
  rises: 'inf02.dante_rises',
  stoneMoved: 'inf02.stone_moved',
} as const;

const PLACE = {
  hillside: 'inf02_hillside',
  overlook: 'inf02_overlook',
  switchback: 'inf02_switchback',
  dusk: 'inf02_dusk_path',
  bench: 'inf02_bench',
  stone: 'inf02_fallen_stone',
  gorge: 'inf02_gorge',
} as const;

/** The flat stone beside the path (the place's bench landmark sits left of its centre). */
function stoneSeat(level: LevelRuntime): { x: number; y: number } {
  const p = level.place(PLACE.bench);
  if (!p) return { x: level.player.x + 40, y: level.player.y };
  return { x: Math.round(p.x + p.w / 2 - 24), y: p.y + 22 };
}

interface DuskShadow {
  readonly x: number;
  readonly y: number;
  readonly img: Phaser.GameObjects.Image | null;
  readonly prop: string;
  faced: boolean;
  flinched: boolean;
}

/** The shadows of the dusk path, per level instance (they dissolve into brush and stone at the rebuke). */
const duskShadows = new WeakMap<object, DuskShadow[]>();
/** The level's path (the generic layout's spine), per level instance. */
const spines = new WeakMap<object, readonly Vec[]>();

/** Up close (or once Virgil has named them), a shadow is only brush and stone. */
function dissolve(level: LevelRuntime, s: DuskShadow, ms = 700): void {
  if (s.faced) return;
  s.faced = true;
  const scene = level.scene;
  if (s.img) scene.tweens.add({ targets: s.img, alpha: 0, duration: ms, onComplete: () => s.img?.destroy() });
  if (scene.textures.exists(s.prop)) {
    const real = scene.add.image(s.x, s.y, s.prop).setOrigin(0.5, 1).setDepth(DEPTH.actors + s.y / 10_000).setAlpha(0);
    scene.tweens.add({ targets: real, alpha: 1, duration: ms });
  }
}

/** Scripted walks of an actor (a newer walk ends an older one between legs). */
const walkTokens = new WeakMap<object, number>();

/** Walk an actor along the level's path (the generic spine) to `to`, leg by leg (each leg bounded). */
async function walkAlong(level: LevelRuntime, actor: ActorHandle, to: Vec, speed: number, signal: AbortSignal): Promise<void> {
  const token = (walkTokens.get(actor) ?? 0) + 1;
  walkTokens.set(actor, token);
  for (const p of leadWaypoints({ x: actor.x, y: actor.y }, to, spines.get(level) ?? null)) {
    if (signal.aborted || walkTokens.get(actor) !== token) return;
    const d = dist(actor.x, actor.y, p.x, p.y);
    await walkTo(level, actor, p, speed, (d / speed) * 1000 + 1500, signal);
  }
}

/** Dante's unwilling walk down the dusk path (s2.b4), per level instance. */
interface DuskWalk {
  readonly signal: AbortSignal;
  /** When the walk began (scene ms): he halts twenty seconds after at the latest. */
  readonly startedAt: number;
  /** Virgil has reached the stone and waits there. */
  virgilArrived: boolean;
  /** Where the walk began: his steps shorten the further down he goes. */
  readonly fromX: number;
  /** Time walked since he last looked back up the hill, and in this stretch without letting go (ms). */
  walkedMs: number;
  stretchMs: number;
  /** When he last gave a step back (scene ms). */
  steppedBackAt: number;
  /** While he looks back up the hill: until this scene time, held by this lock. */
  glanceUntil: number;
  unlock: (() => void) | null;
  wasMoving: boolean;
  lastT: number;
}

const duskWalks = new WeakMap<object, DuskWalk>();

/**
 * s2.b4 start (DO[0], begun with the beat's narration, which says it): Virgil
 * goes on down the path without a word, pointing the way, toward the stone
 * where he will sit (s3.b2). It is his own walk, unhurried and not waiting for
 * Dante (the world's lead would stop him as soon as the next beats arm).
 * Dante follows, unwillingly (duskFrame).
 */
function theUnwillingWalk(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const signal = levelSignal(ctx);
  const seat = stoneSeat(level);
  const v = w.companion.actor;
  virgilHolds(level);
  w.companion.point('right', 900);
  const walk: DuskWalk = {
    signal,
    startedAt: w.now(),
    virgilArrived: false,
    fromX: level.player.x,
    walkedMs: 0,
    stretchMs: 0,
    steppedBackAt: -Infinity,
    glanceUntil: 0,
    unlock: null,
    wasMoving: false,
    lastT: w.now(),
  };
  if (!ctx.autoplay) duskWalks.set(level, walk);
  void level.wait(950, signal).then(async () => {
    if (signal.aborted) return;
    // Briskly past Dante first (he was a step behind him), then at an unhurried pace on to the stone.
    const path = spines.get(level) ?? [];
    const aheadX = Math.max(v.x, level.player.x) + 26;
    const ahead = w.freeSpot(aheadX, path.length > 1 ? Math.round(pathYAt(path, aheadX)) : v.y);
    const mine = (walkTokens.get(v) ?? 0) + 1;
    if (ahead.x < seat.x) await walkAlong(level, v, ahead, 66, signal);
    if (signal.aborted || (walkTokens.get(v) ?? 0) > mine) return;
    await walkAlong(level, v, w.freeSpot(seat.x + 30, seat.y + 20), 40, signal);
    if (signal.aborted) return;
    walk.virgilArrived = true;
    v.faceToward(level.player.x, level.player.y);
  });
}

/**
 * Every frame of the unwilling walk (II 37–42): the further down he goes, the
 * shorter his steps; every few steps he stops and looks back up the hill; let
 * go of the keys and he gives a step back uphill. Ends at the halt.
 */
function duskFrame(level: LevelRuntime): void {
  const walk = duskWalks.get(level);
  if (!walk) return;
  const w = ext(level);
  if (!w || walk.signal.aborted) {
    endDuskWalk(level);
    return;
  }
  const now = w.now();
  const dt = Math.min(100, Math.max(0, now - walk.lastT));
  walk.lastT = now;
  if (walk.unlock) {
    if (now < walk.glanceUntil) {
      w.dante.actor.face('left');
      return;
    }
    walk.unlock();
    walk.unlock = null;
    walk.wasMoving = false;
    walk.stretchMs = 0;
  }
  if (!w.playable()) {
    walk.wasMoving = false;
    walk.stretchMs = 0;
    return;
  }
  const input = w.input();
  const moving = Math.hypot(input.moveX, input.moveY) > 0.2;
  const gone = Math.max(0, level.player.x - walk.fromX);
  // Back up the hill his feet are light again; he does not walk ahead of his guide.
  if (input.moveX > -0.2) w.slow(Math.max(0.7, 1 - gone / 500));
  if (!walk.virgilArrived && input.moveX > 0.2 && level.player.x > w.companion.actor.x - 10) w.slow(0.4);
  if (moving) {
    walk.walkedMs += dt;
    walk.stretchMs += dt;
    if (walk.walkedMs >= 2800) {
      walk.walkedMs = 0;
      walk.glanceUntil = now + 600;
      walk.unlock = w.lock('dusk-glance');
      w.dante.actor.face('left');
    }
  } else if (walk.wasMoving && gone > 12 && walk.stretchMs >= 500 && now - walk.steppedBackAt > 2000) {
    // He let go after a few steps: a step back up the hill (one now and then, not at every tap).
    walk.steppedBackAt = now;
    w.dante.knock(-55, 0, 280);
    w.dante.actor.face('left');
  }
  if (!moving) walk.stretchMs = 0;
  walk.wasMoving = moving;
}

function endDuskWalk(level: LevelRuntime): void {
  const walk = duskWalks.get(level);
  if (!walk) return;
  duskWalks.delete(level);
  walk.unlock?.();
  walk.unlock = null;
}

/**
 * s2.b4: the three shadows on the dusk path, and the halt. They rise ahead of
 * Dante beside the path (a deliberate step off it reaches one); passing one
 * by, he shies like a skittish beast (II 48). He halts in every case: still
 * for a few seconds once all three are out, turning back uphill, falling far
 * behind Virgil, or at the latest twenty seconds into the walk.
 */
function shadowsOnTheDuskPath(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const signal = levelSignal(ctx);
  const scene = level.scene;
  const path = spines.get(level) ?? [];
  const lineY = (x: number): number => (path.length > 1 ? pathYAt(path, x) : level.player.y);
  const fromX = level.player.x;
  const kinds: Array<{ tex: string; frame: string; prop: string }> = [
    { tex: 'npc-panther', frame: 'left-0', prop: `prop-bush-${level.cantoId}` },
    { tex: 'npc-lion', frame: 'left-0', prop: `prop-rock-${level.cantoId}` },
    { tex: 'npc-she_wolf', frame: 'left-0', prop: `prop-tree_dead-${level.cantoId}` },
  ];
  const shadows: DuskShadow[] = kinds.map((k, i) => {
    const x = Math.round(fromX + 100 + i * 80);
    // Beside the path, not on it: walking the path passes them by; a step aside reaches one.
    const y = Math.round(lineY(x) + (i % 2 === 0 ? -34 : 36));
    const img = scene.textures.exists(k.tex) ? scene.add.image(x, y, k.tex, k.frame).setOrigin(0.5, 1).setDepth(DEPTH.actors + y / 10_000).setTint(0x000000).setAlpha(0) : null;
    if (img) scene.tweens.add({ targets: img, alpha: 0.7, duration: 1200, delay: i * 600 });
    return { x, y, img, prop: k.prop, faced: false, flinched: false };
  });
  duskShadows.set(level, shadows);
  let faced = false;
  let halted = false;
  const t0 = w.now();
  let last = { x: level.player.x, y: level.player.y };
  void until(
    level,
    () => {
      const p = level.player;
      const now = { x: p.x, y: p.y };
      for (const s of shadows) {
        if (s.faced) continue;
        const d = dist(p.x, p.y, s.x, s.y);
        if (d <= 24) {
          dissolve(level, s);
          if (!faced) {
            faced = true;
            level.emit(EV.shadowFaced);
          }
          continue;
        }
        // Passing one by (not walking up to it), he shies away from it once.
        const closing = dist(last.x, last.y, s.x, s.y) - d;
        if (!s.flinched && !halted && d < 52 && closing < 0.2 && (s.img?.alpha ?? 0) > 0.4 && w.playable()) {
          s.flinched = true;
          const away = d > 0.1 ? { x: (p.x - s.x) / d, y: (p.y - s.y) / d } : { x: -1, y: 0 };
          w.dante.knock(away.x * 110, away.y * 110, 220);
          w.dante.actor.faceToward(s.x, s.y);
          w.sfx('step');
        }
      }
      last = now;
      return halted;
    },
    60_000,
    signal,
  );
  // He halts: once the three are out, still for two seconds, back uphill, far behind Virgil; at the latest after twenty seconds.
  const grace = 3000;
  const walk = duskWalks.get(level);
  const capAt = (walk?.startedAt ?? t0) + 20_000;
  void level.wait(grace, signal).then(async () => {
    if (signal.aborted) return;
    const uphillFrom = { x: level.player.x, y: level.player.y };
    const toVirgil = (): number => dist(level.player.x, level.player.y, w.companion.actor.x, w.companion.actor.y);
    await Promise.race([
      stillFor(level, 2000, 20_000, signal),
      until(
        level,
        () =>
          level.player.x < uphillFrom.x - 30 ||
          toVirgil() > 192 ||
          // He caught up with Virgil, who waits by the stone.
          (walk?.virgilArrived === true && toVirgil() < 40) ||
          w.now() > capAt,
        20_000,
        signal,
      ),
    ]);
    if (signal.aborted) return;
    halted = true;
    endDuskWalk(level);
    // He stands in the middle of the path, his face turned back up the hill (s2.b6); Virgil is below, in the dark.
    w.dante.actor.face('left');
    level.emit(EV.halts);
  });
}

/** s3.b1 start: Virgil names what Dante saw; the shadows left on the path are brush and stone again. */
function shadowsNamed(ctx: BeatHookContext): void {
  for (const s of duskShadows.get(ctx.level) ?? []) dissolve(ctx.level, s, 1600);
}

/** s3.b1 start: Virgil climbs back up the path and stops in front of Dante (CAM: follow). */
function virgilReturns(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  endDuskWalk(level);
  const p = level.player;
  const v = w.companion.actor;
  const side = v.x >= p.x ? 1 : -1;
  const spot = w.freeSpot(p.x + side * 22, p.y + 1);
  virgilHolds(level);
  if (ctx.autoplay) {
    v.teleport(spot.x, spot.y);
    return;
  }
  const signal = levelSignal(ctx);
  void walkAlong(level, v, spot, 70, signal).then(() => {
    if (signal.aborted) return;
    v.faceToward(p.x, p.y);
    w.dante.actor.faceToward(v.x, v.y);
  });
}

/** s3.b2 DO[0]: Virgil walks to the flat stone and sits; the stone is the checkpoint. */
async function virgilSits(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const seat = stoneSeat(level);
  w.checkpointAt(seat.x, seat.y);
  virgilHolds(level);
  const v = w.companion.actor;
  // Side by side on the stone, not one over the other (the figures are about 14 px wide).
  const spot = { x: seat.x + 8, y: seat.y + 1 };
  if (ctx.autoplay) v.teleport(spot.x, spot.y);
  else void walkAlong(level, v, spot, 70, levelSignal(ctx)).then(() => sit(level));
  if (ctx.autoplay) sit(level);
}

function sit(level: LevelRuntime): void {
  const w = ext(level);
  if (!w) return;
  const a = w.companion.actor;
  a.poseLocked = false;
  if (a.pose('sit')) a.poseLocked = true;
}

function stand(level: LevelRuntime): void {
  const w = ext(level);
  if (!w) return;
  const a = w.companion.actor;
  a.poseLocked = false;
  a.playIdle();
}

/** s4.b1 DO[0]: Dante sits on the stone beside Virgil. */
function danteSits(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const seat = stoneSeat(level);
  w.dante.teleport(seat.x - 8, seat.y + 1);
  w.dante.setPose('sit');
}

/** s5.b1: Dante sits, head bowed; any key or E and he rises (or by himself, after a while). */
function rises(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const signal = levelSignal(ctx);
  if (w.dante.pose !== 'sit') danteSits(ctx);
  void untilMoved(level, 30_000, signal).then(() => {
    if (signal.aborted) return;
    w.dante.clearPose();
    const seat = stoneSeat(level);
    const off = w.freeSpot(seat.x - 8, seat.y + 12);
    w.dante.teleport(off.x, off.y);
    level.emit(EV.rises);
  });
}

/** s5.b2 DO[4]: Virgil turns toward the gorge and walks. */
function virgilGoes(ctx: BeatHookContext): void {
  const level = ctx.level;
  stand(level);
  virgilFollows(level);
}

/** s6.b3: the fallen stone across the way down; the first verse moves it. */
function theStone(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const signal = levelSignal(ctx);
  const scene = level.scene;
  const place = level.place(PLACE.stone);
  const here = place ? { x: place.x + place.w + 26, y: place.y + place.h / 2 + 12 } : { x: level.player.x + 70, y: level.player.y };
  // A stone as tall as a man, right across the path (the way down to the gorge).
  const img = scene.textures.exists('prop-stone') ? scene.add.image(here.x, here.y, 'prop-stone').setOrigin(0.5, 1).setScale(2).setDepth(DEPTH.actors + here.y / 10_000) : null;
  const removeSolid = w.addSolid({ x: here.x - 18, y: here.y - 14, w: 36, h: 14 });
  // The path is walled either side of the stone, so the verse is the way.
  const removeWalls = [w.addSolid({ x: here.x - 18, y: -100, w: 36, h: here.y - 14 + 100 }), w.addSolid({ x: here.x - 18, y: here.y, w: 36, h: 4000 })];
  let moved = false;
  const tumble = (): void => {
    if (moved) return;
    moved = true;
    removeSolid();
    for (const r of removeWalls) r();
    if (img) {
      scene.tweens.add({ targets: img, x: here.x + 30, y: here.y + 60, angle: 80, alpha: 0, duration: 1100, ease: 'Quad.easeIn', onComplete: () => img.destroy() });
    }
    void level.camera.shake(400, 0.005);
    w.sfx('quake');
    level.emit(EV.stoneMoved);
  };
  const offVerse = w.onVerse((cast) => {
    if (moved || dist(cast.x, cast.y, here.x, here.y) > 140) return;
    if (cast.category === 'Force') tumble();
    else w.companion.gesture(-1); // Virgil shakes his head: the heart of that verse does not move stones
  });
  // Whoever emits the event (autoplay, debug), the stone goes.
  const offBus = level.bus.on('world:signal', (sig) => {
    if (sig.kind === 'event' && sig.id === EV.stoneMoved) tumble();
  });
  // During the lesson, Grace never falls below one cast (bible §7.2).
  void until(
    level,
    () => {
      const g = level.store.state.grace;
      if (!moved && g < 1) level.store.adjustGrace(1 - g);
      return moved;
    },
    150_000,
    signal,
  ).then(async () => {
    offVerse();
    offBus();
    if (moved || signal.aborted) return;
    // He could not: Virgil sets his shoulder to it.
    const v = w.companion.actor;
    await walkTo(level, v, { x: here.x - 24, y: here.y }, 60, 4000, signal);
    if (!signal.aborted) tumble();
  });
}

export function createInf02Level() {
  const level = storyLevel({
    id: 'inf02',
    emits: [EV.shadowFaced, EV.halts, EV.rises, EV.stoneMoved],
    build(ctx, layout) {
      spines.set(ctx, layout.path);
    },
    hooks: {
      'inf02.s2.b4': hooks(onStart(theUnwillingWalk), onDo(1, shadowsOnTheDuskPath)),
      'inf02.s3.b1': onStart((ctx) => {
        shadowsNamed(ctx);
        virgilReturns(ctx);
      }),
      'inf02.s3.b2': onDo(0, virgilSits),
      'inf02.s4.b1': onDo(0, danteSits),
      'inf02.s4.b9': onDo(0, (ctx) => {
        // Virgil rises and stands before Dante, a few steps from the stone; Dante stays seated.
        stand(ctx.level);
        const w = ext(ctx.level);
        if (!w) return;
        const seat = stoneSeat(ctx.level);
        const v = w.companion.actor;
        const spot = w.freeSpot(seat.x + 16, seat.y + 32);
        if (ctx.autoplay) {
          v.teleport(spot.x, spot.y);
          v.face('up');
          return;
        }
        const signal = levelSignal(ctx);
        void walkAlong(ctx.level, v, spot, 50, signal).then(() => {
          if (!signal.aborted) v.faceToward(seat.x - 8, seat.y - 4);
        });
      }),
      'inf02.s5.b1': onDo(1, rises),
      'inf02.s5.b2': onDo(4, virgilGoes),
      'inf02.s6.b3': onDo(2, theStone),
    },
    everyBeat: (ctx) => {
      // Back from the stone (a jump, a continue): nobody stays seated.
      const w = ext(ctx.level);
      if (!w) return;
      const i = ctx.canto.scenes.findIndex((s) => s.id === ctx.scene.id);
      if (i >= 6 && w.companion.mode === 'hold') {
        stand(ctx.level);
        virgilFollows(ctx.level);
      }
      if (i >= 6 && w.dante.pose === 'sit') w.dante.clearPose();
    },
  });
  level.update = (_dt, runtime) => duskFrame(runtime);
  return level;
}
