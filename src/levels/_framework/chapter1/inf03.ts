/**
 * Canto III — The Gate (bible §7.3, docs/script/inferno-03.md).
 *
 * The generic layout (gorge -> gate -> dark plain -> ridge -> the plain and
 * its banner -> the island -> the plain's edge -> the rise -> the shore ->
 * Virgil's rock), its ambient darkness, fear, inscription, the runners behind
 * the banner and their wasps, with:
 *
 *   s1.b2  passing the middle of the arch: control stops a breath
 *   s2.b2  whirls of dark sand full of voices cross the plain (moving fear;
 *          beside Virgil it works by half)
 *   s3     the banner's turns are remembered     (inf03.banner_turned, no trigger)
 *   s5.b2  Charon's command rolls over the shore like a wave of fear; not
 *          stepping back from the water through it -> inf03.held_before_charon
 *   s6.b1  Charon's oar falls on whoever lags behind, until Dante reaches the rock
 *   s7.b1  the quake: reach Virgil's hand (or twelve seconds) -> inf03.reached_for_hand
 *
 * At the bottom of his strength Dante sinks to his knees and Virgil lifts him
 * (bible §7.3 s3.b3).
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import type { BeatHookContext, LevelRuntime } from '../../../runtime/contracts';
import type { Guardian } from '../../../mechanics/guardian';
import type { HoldGround } from '../../../mechanics/hold_ground';
import type { Quake } from '../../../mechanics/quake';
import { ellipseLoop } from '../../../mechanics/logic/path';
import { rectCenter } from '../../../world/geometry';
import { onDo } from '../kit';
import { ext, levelSignal, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

const EV = {
  bannerTurned: 'inf03.banner_turned',
  heldBeforeCharon: 'inf03.held_before_charon',
  reachedForHand: 'inf03.reached_for_hand',
} as const;

const PLACE = {
  gate: 'inf03_gate',
  plain: 'inf03_dark_plain',
  ridge: 'inf03_ridge',
  shore: 'inf03_shore',
  rock: 'inf03_virgil_rock',
} as const;

function mechanic<T>(level: LevelRuntime, id: string): T | null {
  return level.mechanic(id) as unknown as T | null;
}

/** A short pause of control (the inscription's last tercet, the voices rising). */
async function pause(ctx: BeatHookContext, ms: number): Promise<void> {
  const w = ext(ctx.level);
  if (!w || ctx.autoplay) return;
  const unlock = w.lock('pause');
  try {
    await ctx.level.wait(ms, ctx.signal);
  } finally {
    unlock();
  }
}

/** s5.b2: Charon's command, a wave of fear over the shore. */
async function command(ctx: BeatHookContext): Promise<void> {
  const wave = mechanic<HoldGround>(ctx.level, 'command');
  if (ctx.autoplay || !wave) return;
  await wave.cue(5000, ctx.signal);
}

/** s6.b1: Virgil climbs the low rock; the oar falls on whoever lags behind. */
function theOar(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const rock = level.place(PLACE.rock);
  if (rock) {
    virgilHolds(level);
    const c = rectCenter(rock);
    void walkTo(level, w.companion.actor, w.freeSpot(c.x, c.y - 10), 80, 6000, levelSignal(ctx));
  }
  const oar = mechanic<Guardian>(level, 'oar');
  if (oar && !ctx.autoplay) {
    oar.enabled = true;
    oar.start();
  }
}

/** s6.b2: on the rock beside Virgil; the oar is still. */
function onTheRock(ctx: BeatHookContext): void {
  const oar = mechanic<Guardian>(ctx.level, 'oar');
  if (oar) {
    oar.stop();
    oar.enabled = false;
  }
}

/** s7.b1: the quake; Virgil stands four tiles away with his hand held out. */
function theQuake(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  const quake = mechanic<Quake>(level, 'quake');
  if (!w || !quake) return;
  const p = level.player;
  virgilHolds(level, w.freeSpot(p.x + 64, p.y - 4));
  w.companion.actor.faceToward(p.x, p.y);
  void quake.run(levelSignal(ctx));
}

/** s7.b2: in the red light Dante sinks down like one whom sleep has seized. */
function falls(ctx: BeatHookContext): void {
  const w = ext(ctx.level);
  if (!w) return;
  w.dante.setPose('faint');
}

export function createInf03Level() {
  return storyLevel({
    id: 'inf03',
    emits: [EV.heldBeforeCharon, EV.reachedForHand],
    overrides: {
      crowd_flow: { id: 'banner', turnEvent: EV.bannerTurned },
      swarm: { follow: 'banner' },
    },
    build(ctx) {
      const w = ext(ctx);
      // Bible §7.3 s3.b3: at one unit Dante sinks to his knees; Virgil lifts him to three.
      w?.setRescue({ at: 1, to: 3 });
      // Whirls of dark sand over the starless plain (III 28–30).
      const plain = ctx.place(PLACE.plain);
      if (plain) {
        const c = rectCenter(plain);
        ctx.createMechanic('fear', {
          id: 'whirls',
          visible: false,
          floor: 1.5,
          drainPerSecond: 0.35,
          whirls: [
            { path: ellipseLoop(c.x - 30, c.y, 70, 40, 12), radius: 20, speed: 30 },
            { path: ellipseLoop(c.x + 60, c.y + 10, 60, 50, 12, Math.PI), radius: 18, speed: 26 },
          ],
        });
      }
      // Charon's command (a wave of fear; only stepping back from the water breaks it).
      ctx.createMechanic('hold_ground', {
        id: 'command',
        source: 'CHARON',
        event: EV.heldBeforeCharon,
        awayOnly: true,
        tolerancePx: 16,
        cueMs: 5000,
        drainPerSecond: 0.2,
        floor: 1.5,
        sfx: 'thunder',
      });
      // The oar, on the shore only.
      const shore = ctx.place(PLACE.shore);
      const oar = ctx.createMechanic('guardian', {
        id: 'oar',
        actor: 'CHARON',
        aim: 'behind',
        everyMs: 2400,
        telegraphMs: 1000,
        radius: 16,
        damage: 1,
        knock: 180,
        reach: 400,
        auto: false,
        ...(shore ? { area: { x: shore.x - 40, y: shore.y - 40, w: shore.w + 200, h: shore.h + 80 } } : {}),
      });
      if (oar) oar.enabled = false;
      ctx.createMechanic('quake', { id: 'quake', event: EV.reachedForHand, durationMs: 12_000, reach: 'VIRGIL', reachDistance: 18 });
    },
    everyBeat: (ctx) => {
      // Back on the road after a held moment (a jump, a continue): Virgil walks with Dante again.
      const w = ext(ctx.level);
      if (!w) return;
      const scene = ctx.canto.scenes.findIndex((s) => s.id === ctx.scene.id);
      if (scene < 6 && w.companion.mode === 'hold') virgilFollows(ctx.level);
    },
    hooks: {
      'inf03.s1.b2': onDo(1, (ctx) => pause(ctx, 1200)),
      'inf03.s2.b1': onDo(2, (ctx) => pause(ctx, 1500)),
      'inf03.s3.b2': onDo(1, (ctx) => pause(ctx, 1800)),
      'inf03.s5.b2': onDo(1, command),
      'inf03.s6.b1': onDo(2, theOar),
      'inf03.s6.b2': (ctx) => (ctx.phase === 'start' ? onTheRock(ctx) : undefined),
      'inf03.s7.b1': onDo(0, theQuake),
      'inf03.s7.b2': onDo(1, falls),
    },
  });
}
