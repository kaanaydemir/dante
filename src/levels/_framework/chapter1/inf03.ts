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

import type { BeatHookContext, LevelRuntime, Rect } from '../../../runtime/contracts';
import type { FearZones } from '../../../mechanics/fear';
import type { Guardian } from '../../../mechanics/guardian';
import type { HoldGround } from '../../../mechanics/hold_ground';
import type { Quake } from '../../../mechanics/quake';
import { ellipseLoop } from '../../../mechanics/logic/path';
import { rectCenter, type Vec } from '../../../world/geometry';
import type { GenericLayout } from '../layout';
import { onDo } from '../kit';
import { ext, levelSignal, pathYAt, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

const EV = {
  bannerTurned: 'inf03.banner_turned',
  heldBeforeCharon: 'inf03.held_before_charon',
  reachedForHand: 'inf03.reached_for_hand',
} as const;

const PLACE = {
  gate: 'inf03_gate',
  plain: 'inf03_dark_plain',
  ridge: 'inf03_ridge',
  north: 'inf03_plain_north',
  island: 'inf03_island',
  edge: 'inf03_plain_edge',
  shore: 'inf03_shore',
  rock: 'inf03_virgil_rock',
} as const;

/**
 * The banner's course (bible §7.3 s3): the line runs round the island, so it
 * cuts the way twice, the outer arm before the island and the inner arm after
 * it. Its two sharp bends lie on the way itself: when the banner swings round
 * one of them, the line thins there for a moment (crowd_flow `thinAtBends`)
 * and Dante can cross. Pure: tests check the bends sit on the path.
 */
export interface BannerPlan {
  readonly loop: readonly Vec[];
  /** The two crossings (bends on the way): before and after the island. */
  readonly outer: Vec;
  readonly inner: Vec;
  /** Where the line can drag him and the wasps can chase him. */
  readonly area: Rect;
}

export function planBanner(layout: GenericLayout): BannerPlan | null {
  const at = (id: string) => layout.places.find((p) => p.id === id) ?? null;
  const north = at(PLACE.north);
  const isl = at(PLACE.island);
  const edge = at(PLACE.edge);
  if (!north || !isl || !edge) return null;
  const xl = Math.round((north.x + north.w + isl.x) / 2);
  const xr = Math.round((isl.x + isl.w + edge.x) / 2);
  const outer = { x: xl, y: Math.round(pathYAt(layout.path, xl)) };
  const inner = { x: xr, y: Math.round(pathYAt(layout.path, xr)) };
  const top = isl.y + 6;
  const bottom = Math.min(layout.height - 24, isl.y + isl.h + 30);
  // Clockwise: up along the outer arm, along the island's north shore, down the inner arm, back along the south.
  const loop = [outer, { x: isl.x + 20, y: top }, { x: isl.x + isl.w - 20, y: top }, inner, { x: isl.x + isl.w - 20, y: bottom }, { x: isl.x + 20, y: bottom }];
  const area = { x: north.x + north.w - 40, y: 0, w: edge.x + 40 - (north.x + north.w - 40), h: layout.height };
  return { loop, outer, inner, area };
}

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

/** s2.b5 (inf03.c2 = b) DO[2]: Dante goes down off the ridge among the runners; DO[4]: he climbs back. */
async function downAmongThem(ctx: BeatHookContext, back: boolean): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  const ridge = level.place(PLACE.ridge);
  if (!w || !ridge || ctx.autoplay) return;
  const p = level.player;
  if (!back) {
    descents.set(level, { x: p.x, y: p.y });
    const to = w.freeSpot(p.x + 12, Math.min(w.bounds().h - 20, ridge.y + ridge.h + 26));
    await walkTo(level, p, to, 80, 2600, ctx.signal);
    w.dante.actor.face('right');
  } else {
    const from = descents.get(level);
    if (!from) return;
    descents.delete(level);
    await walkTo(level, p, from, 70, 3000, ctx.signal);
    w.dante.actor.faceToward(w.companion.actor.x, w.companion.actor.y);
  }
}

/** Where Dante stood on the ridge before he went down (per level instance). */
const descents = new WeakMap<object, { x: number; y: number }>();

/** s5.b2: Charon's command, a wave of fear over the shore. */
async function command(ctx: BeatHookContext): Promise<void> {
  const wave = mechanic<HoldGround>(ctx.level, 'command');
  if (ctx.autoplay || !wave) return;
  await wave.cue(5000, ctx.signal);
}

/** The fear before the arch goes out (Dante left his fear at the gate). */
function archOut(ctx: BeatHookContext): void {
  mechanic<FearZones>(ctx.level, 'arch')?.quench();
}

/** Levels (per instance) in which Virgil has already climbed his rock. */
const climbed = new WeakSet<object>();

/**
 * s6.b1 DO[0]: the crowd surges, Virgil climbs the low rock at the shore's
 * edge, and from now on the oar falls on whoever lags behind (III 109–111 are
 * read while it falls). Idempotent: DO[2] (the oar's own line) calls it again.
 */
function theOar(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const rock = level.place(PLACE.rock);
  if (rock && !climbed.has(level)) {
    climbed.add(level);
    virgilHolds(level);
    const c = rectCenter(rock);
    void walkTo(level, w.companion.actor, w.freeSpot(c.x, c.y - 10), 80, 6000, levelSignal(ctx));
  }
  const oar = mechanic<Guardian>(level, 'oar');
  if (oar && !ctx.autoplay && !oar.enabled) {
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
      // The banner and its wasps are this level's own (round the island, below).
      crowd_flow: false,
      swarm: false,
    },
    build(ctx, layout) {
      const w = ext(ctx);
      // Before the arch the ground is a hollow of fear (s1.b2; at most down to two units). Leaving
      // the fear at the gate (inf03.c1 = a) puts it out.
      const gate = ctx.place(PLACE.gate);
      if (gate) {
        const gx = Math.round(gate.x + gate.w / 2 + 8);
        const gy = Math.round(pathYAt(layout.path, gx));
        ctx.createMechanic('fear', { id: 'arch', zones: [{ x: gx - 44, y: gy - 30, w: 88, h: 50 }], floor: 2 });
      }
      // The runners behind the banner, round the island; their wasps ride above them.
      const banner = planBanner(layout);
      if (banner) {
        // The generic plain's standing banners would be a second banner: there is only the running one.
        for (const o of [...ctx.scene.children.list]) {
          if ((o as { texture?: { key?: string } }).texture?.key === 'prop-banner') o.destroy();
        }
        ctx.createMechanic('crowd_flow', {
          id: 'banner',
          path: banner.loop,
          runners: 44,
          spacing: 11,
          gapEvery: 7,
          gapLength: 2,
          speed: 40,
          thinAtBends: 22,
          openMs: 3500,
          turnEvent: EV.bannerTurned,
          area: banner.area,
        });
        ctx.createMechanic('swarm', { follow: 'banner', count: 3, damage: 0.3, chaseRadius: 44, area: banner.area });
      }
      // Below the ridge, more of the train runs by in the dusk (III 52–57; s2.b3, s2.b5): seen, never in the way.
      const ridge = ctx.place(PLACE.ridge);
      if (ridge) {
        const cy = Math.min(layout.height - 30, ridge.y + ridge.h + 46);
        ctx.createMechanic('crowd_flow', {
          id: 'train',
          path: ellipseLoop(ridge.x + ridge.w / 2, cy, 230, 14, 16),
          runners: 18,
          gapEvery: 5,
          gapLength: 3,
          speed: 40,
          banner: false,
          area: { x: 0, y: 0, w: 0, h: 0 },
        });
      }
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
      const rock = ctx.place(PLACE.rock);
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
        // The shore up to the foot of Virgil's rock: up on the rock Dante is out of his reach.
        ...(shore ? { area: { x: shore.x - 40, y: shore.y - 40, w: (rock ? rock.x - 6 : shore.x + shore.w + 200) - (shore.x - 40), h: shore.h + 80 } } : {}),
      });
      if (oar) oar.enabled = false;
      ctx.createMechanic('quake', { id: 'quake', event: EV.reachedForHand, durationMs: 12_000, reach: 'VIRGIL', reachDistance: 18 });
    },
    everyBeat: (ctx) => {
      // Back on the road after a held moment (a jump, a continue): Virgil walks with Dante again.
      const w = ext(ctx.level);
      if (!w) return;
      if (ctx.state.words.shed.includes('Fear')) archOut(ctx);
      const scene = ctx.canto.scenes.findIndex((s) => s.id === ctx.scene.id);
      if (scene < 6 && w.companion.mode === 'hold') virgilFollows(ctx.level);
    },
    hooks: {
      'inf03.s1.b2': onDo(1, (ctx) => pause(ctx, 1200)),
      // inf03.c1 = a, DO[1]: the Fear card falls on the threshold stone; the hollow under the arch goes out.
      'inf03.s1.b3': onDo(1, archOut),
      'inf03.s2.b1': onDo(2, (ctx) => pause(ctx, 1500)),
      'inf03.s3.b2': onDo(1, (ctx) => pause(ctx, 1800)),
      'inf03.s2.b5': async (ctx) => {
        if (ctx.phase !== 'do') return;
        // Option a: he lifts his eyes from the runners to the dark in the middle, where something turns.
        if (ctx.doIndex === 1) ext(ctx.level)?.dante.actor.face('right');
        if (ctx.doIndex === 2) await downAmongThem(ctx, false);
        if (ctx.doIndex === 4) await downAmongThem(ctx, true);
      },
      'inf03.s5.b2': onDo(1, command),
      'inf03.s6.b1': (ctx) => (ctx.phase === 'do' && (ctx.doIndex === 0 || ctx.doIndex === 2) ? theOar(ctx) : undefined),
      'inf03.s6.b2': (ctx) => (ctx.phase === 'start' ? onTheRock(ctx) : undefined),
      'inf03.s7.b1': onDo(0, theQuake),
      'inf03.s7.b2': onDo(1, falls),
    },
  });
}
