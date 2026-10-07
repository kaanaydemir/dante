/**
 * Canto II — The Evening of Doubt (bible §7.2, docs/script/inferno-02.md).
 *
 * The generic layout of the script (hillside -> overlook -> switchback ->
 * dusk path -> the stone (bench) -> the fallen stone -> the gorge) with:
 *
 *   s2.b4  three shadows on the dusk path take the shapes of the beasts;
 *          walking up to one dissolves it            -> inf02.shadow_faced
 *          standing still, turning back uphill or falling far behind
 *          Virgil (at the latest 20 s into the walk) -> inf02.dante_halts
 *   s3.b2  Virgil sits on the flat stone; it is the checkpoint
 *   s5.b1  Dante sits head bowed; a key or E and he rises -> inf02.dante_rises
 *   s6.b3  the fallen stone blocks the way down; the first verse with Love at
 *          its heart (Force) tips it over the edge -> inf02.stone_moved.
 *          Grace never drops below one cast here; Virgil moves it himself if
 *          the reader cannot (a generous time limit), so nobody is ever stuck.
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import { DEPTH } from '../../../config';
import type { BeatHookContext, LevelRuntime } from '../../../runtime/contracts';
import { dist } from '../../../world/geometry';
import { onDo, stillFor, until, untilMoved } from '../kit';
import { ext, levelSignal, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

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

/** s2.b4: the three shadows on the dusk path, and the halt. */
function shadowsOnTheDuskPath(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const signal = levelSignal(ctx);
  const scene = level.scene;
  const p0 = { x: level.player.x, y: level.player.y };
  const kinds: Array<{ tex: string; frame: string; prop: string }> = [
    { tex: 'npc-panther', frame: 'left-0', prop: `prop-bush-${level.cantoId}` },
    { tex: 'npc-lion', frame: 'left-0', prop: `prop-rock-${level.cantoId}` },
    { tex: 'npc-she_wolf', frame: 'left-0', prop: `prop-tree_dead-${level.cantoId}` },
  ];
  const shadows = kinds.map((k, i) => {
    const x = p0.x + 110 + i * 85;
    const y = p0.y + (i % 2 === 0 ? -26 : 24);
    const img = scene.textures.exists(k.tex) ? scene.add.image(x, y, k.tex, k.frame).setOrigin(0.5, 1).setDepth(DEPTH.actors + y / 10_000).setTint(0x000000).setAlpha(0) : null;
    if (img) scene.tweens.add({ targets: img, alpha: 0.7, duration: 1200, delay: i * 600 });
    return { x, y, img, prop: k.prop, faced: false };
  });
  // Virgil goes on down the path, pointing the way.
  w.setVirgilLeads(false);
  w.companion.lead([w.freeSpot(stoneSeat(level).x + 30, stoneSeat(level).y + 20)]);
  let faced = false;
  let halted = false;
  const startedAt = Date.now();
  void until(
    level,
    () => {
      const p = level.player;
      for (const s of shadows) {
        if (s.faced || dist(p.x, p.y, s.x, s.y) > 24) continue;
        s.faced = true;
        // Up close, only brush and stone.
        if (s.img) scene.tweens.add({ targets: s.img, alpha: 0, duration: 700, onComplete: () => s.img?.destroy() });
        if (scene.textures.exists(s.prop)) {
          const real = scene.add.image(s.x, s.y, s.prop).setOrigin(0.5, 1).setDepth(DEPTH.actors + s.y / 10_000).setAlpha(0);
          scene.tweens.add({ targets: real, alpha: 1, duration: 700 });
        }
        if (!faced) {
          faced = true;
          level.emit(EV.shadowFaced);
        }
      }
      return halted;
    },
    60_000,
    signal,
  );
  // He halts: still for two seconds, back uphill, far behind Virgil, or at the latest after twenty seconds.
  const grace = 3000;
  void level.wait(grace, signal).then(async () => {
    if (signal.aborted) return;
    const uphillFrom = { x: level.player.x, y: level.player.y };
    await Promise.race([
      stillFor(level, 2000, 17_000, signal),
      until(
        level,
        () =>
          level.player.x < uphillFrom.x - 30 ||
          dist(level.player.x, level.player.y, w.companion.actor.x, w.companion.actor.y) > 192 ||
          Date.now() - startedAt > 20_000,
        20_000,
        signal,
      ),
    ]);
    if (signal.aborted) return;
    halted = true;
    w.companion.lead(null);
    w.setVirgilLeads(true);
    level.emit(EV.halts);
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
  const spot = { x: seat.x + 6, y: seat.y + 1 };
  if (ctx.autoplay) v.teleport(spot.x, spot.y);
  else void walkTo(level, v, spot, 70, 6000, levelSignal(ctx)).then(() => sit(level));
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
  w.dante.teleport(seat.x - 6, seat.y + 1);
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
    const off = w.freeSpot(seat.x - 6, seat.y + 12);
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
  return storyLevel({
    id: 'inf02',
    emits: [EV.shadowFaced, EV.halts, EV.rises, EV.stoneMoved],
    hooks: {
      'inf02.s2.b4': onDo(1, shadowsOnTheDuskPath),
      'inf02.s3.b2': onDo(0, virgilSits),
      'inf02.s4.b1': onDo(0, danteSits),
      'inf02.s4.b9': onDo(0, (ctx) => {
        stand(ctx.level);
        const w = ext(ctx.level);
        if (w) {
          const seat = stoneSeat(ctx.level);
          w.companion.actor.teleport(seat.x + 4, seat.y + 18);
          w.companion.actor.face('up');
        }
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
}
