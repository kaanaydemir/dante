/**
 * Canto I — The Dark Wood (bible §7.1, docs/script/inferno-01.md).
 *
 * The generic layout of the script (wood -> wood's edge -> valley's end ->
 * slope -> lower slope -> upper slope -> the shade -> the other road ->
 * the hillside path) with the canto's moments:
 *
 *   s1.b5  a creeping shadow pursues Dante out of the wood; the dash escapes it
 *   s2.b1  holding R at the valley's end looks back at the pass  -> inf01.looked_back
 *   s3     the panther keeps between Dante and the hill; the dawn comes down;
 *          eight still seconds (or a step back) is waiting for it -> inf01.waited_dawn
 *   s4     the lion paces, roars twice and charges three times; standing still
 *          through a roar holds the ground                       -> inf01.held_ground
 *   s5     the she-wolf pushes him down step by step until he falls; a figure
 *          waits below. Walking down to it                      -> inf01.turned_to_guide
 *          climbing again                                       -> inf01.climbed_again
 *          either way she brings him to the figure              -> inf01.reached_shadow
 *   s6     calling to the figure (E); showing him the beast (E)
 *   s8     following Virgil on the hillside path
 *
 * "Up" the hill is toward the upper slope, "down" toward the shade (in the
 * generic layout the shade lies past the upper slope). No faint in this canto:
 * at the bottom of his strength Dante gathers himself (bible §7.1).
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import { DEPTH } from '../../../config';
import type { BeatHookContext, LevelRuntime } from '../../../runtime/contracts';
import type { Chase } from '../../../mechanics/chase';
import type { HoldGround } from '../../../mechanics/hold_ground';
import type { PushBack } from '../../../mechanics/push_back';
import { dist, normalize } from '../../../world/geometry';
import { onDo, stillFor, until } from '../kit';
import { centreOf, ext, levelSignal, movedToward, promptE, showFigure, spawnOf, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

const EV = {
  lookedBack: 'inf01.looked_back',
  waitedDawn: 'inf01.waited_dawn',
  heldGround: 'inf01.held_ground',
  turned: 'inf01.turned_to_guide',
  reached: 'inf01.reached_shadow',
  climbed: 'inf01.climbed_again',
} as const;

const PLACE = {
  wood: 'inf01_wood',
  edge: 'inf01_wood_edge',
  valley: 'inf01_valley_end',
  slope: 'inf01_slope',
  lower: 'inf01_slope_lower',
  upper: 'inf01_slope_upper',
  shade: 'inf01_shade',
  road: 'inf01_other_road',
  path: 'inf01_hillside_path',
} as const;

/** Beat order index (for staging after a jump or a continue). */
function at(ctx: BeatHookContext, beatId: string): number {
  let i = 0;
  for (const scene of ctx.canto.scenes) {
    for (const beat of scene.beats) {
      if (beat.id === beatId) return i;
      i += 1;
    }
  }
  return -1;
}

function mechanic<T>(level: LevelRuntime, id: string): T | null {
  return level.mechanic(id) as unknown as T | null;
}

/** Where the lion keeps the top of the path. */
function lionPost(level: LevelRuntime): { x: number; y: number } {
  const p = level.place(PLACE.upper);
  return p ? { x: p.x + p.w - 30, y: p.y + p.h / 2 } : { x: level.player.x + 80, y: level.player.y };
}

/** Where the she-wolf paces, mid-slope. */
function wolfPost(level: LevelRuntime): { x: number; y: number } {
  const p = level.place(PLACE.upper);
  return p ? { x: p.x + p.w / 2, y: p.y + p.h / 2 - 10 } : { x: level.player.x + 60, y: level.player.y };
}

/** Where the figure (Virgil) stands in the shade. */
function shadePost(level: LevelRuntime): { x: number; y: number } {
  const s = spawnOf(level, PLACE.shade);
  return { x: s.x + 70, y: s.y - 4 };
}

/** Staging by where the story stands (jumps and continues land mid-canto). */
function stage(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  const i = at(ctx, ctx.beat.id);
  const beforeWolf = i < at(ctx, 'inf01.s5.b1');
  const figureFrom = at(ctx, 'inf01.s5.b3');
  const followFrom = at(ctx, 'inf01.s6.b3');
  // The beasts.
  showFigure(level, 'PANTHER', i >= at(ctx, 'inf01.s3.b1') && i <= at(ctx, 'inf01.s3.b2'));
  const lionOn = i >= at(ctx, 'inf01.s4.b1');
  showFigure(level, 'LION', lionOn);
  if (lionOn && i > at(ctx, 'inf01.s4.b2')) showFigure(level, 'LION', true, lionPost(level));
  showFigure(level, 'SHE_WOLF', !beforeWolf);
  if (!beforeWolf && i > at(ctx, 'inf01.s5.b5')) showFigure(level, 'SHE_WOLF', true, wolfPost(level));
  // Virgil: absent, then a still figure in the shade, then the guide.
  if (i < figureFrom) {
    if (i < at(ctx, 'inf01.s5.b2') && w.companion.visible) w.showVirgil(false);
  } else if (i < followFrom) {
    if (!w.companion.visible) {
      w.showVirgil(true, true);
      virgilHolds(level, shadePost(level));
    } else if (w.companion.mode !== 'hold') {
      virgilHolds(level);
    }
  } else {
    if (!w.companion.visible) w.showVirgil(true, true);
    if (w.companion.mode === 'hold') virgilFollows(level);
  }
}

/** s1.b5: the shadow that flows after him at the wood's edge; the dash takes him through. */
async function shadowAtTheEdge(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const shadow = mechanic<Chase>(level, 'shadow');
  if (!shadow) return;
  if (ctx.autoplay) return;
  const p = level.player;
  shadow.placeAt(p.x - 120, p.y - 6);
  shadow.show(true);
  shadow.enabled = true;
  const valley = level.place(PLACE.valley);
  await until(level, () => (valley ? p.x >= valley.x : true), 45_000, ctx.signal);
  shadow.stand();
  shadow.show(false);
}

/** s3.b1 DO[3]: the dawn comes down the slope; waiting for it (or stepping back) is remembered. */
async function dawn(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  const panther = mechanic<Chase>(level, 'panther');
  if (ctx.autoplay || !w) return;
  const scene = level.scene;
  const upper = level.place(PLACE.upper);
  const startX = upper ? upper.x + upper.w : level.player.x + 360;
  const light = scene.textures.exists('fx-glow')
    ? scene.add.image(startX, level.player.y - 30, 'fx-glow').setDepth(DEPTH.weather).setTint(level.palette.light).setDisplaySize(300, 420).setAlpha(0.3)
    : null;
  const from = { x: level.player.x, y: level.player.y };
  const goal = centreOf(level, PLACE.upper);
  const DAWN_MS = 25_000;
  let elapsed = 0;
  // The light travels toward the panther; still waiting or a step back down is "waiting for the dawn".
  const waited = Promise.race([
    stillFor(level, 8_000, DAWN_MS, ctx.signal),
    until(level, () => !movedToward(from, level.player, goal, -40) && dist(level.player.x, level.player.y, goal.x, goal.y) > dist(from.x, from.y, goal.x, goal.y) + 40, DAWN_MS, ctx.signal),
  ]);
  let waitedForIt = false;
  void waited.then((ok) => {
    if (ok) waitedForIt = true;
  });
  await until(
    level,
    () => {
      elapsed += 50;
      const target = panther?.position ?? goal;
      if (light) light.x += (target.x - light.x) * (waitedForIt ? 0.08 : 0.012);
      return waitedForIt || elapsed >= DAWN_MS;
    },
    DAWN_MS + 1000,
    ctx.signal,
  );
  if (waitedForIt) {
    level.emit(EV.waitedDawn);
    await level.wait(1500, ctx.signal);
  }
  if (light) scene.tweens.add({ targets: light, alpha: 0, duration: 2500, onComplete: () => light.destroy() });
}

/** s3.b2 DO[0]: the light reaches her; she turns to it and slips away among the rocks. */
async function pantherGoes(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  const panther = mechanic<Chase>(level, 'panther');
  panther?.stand();
  const npc = w?.npcOf('PANTHER');
  if (npc) {
    npc.actor.face('right');
    void walkTo(level, npc.actor, { x: npc.x + 90, y: npc.y - 70 }, 70, 2500).then(() => npc.setVisible(false));
  }
  // A warm light over everything for a moment (honey and rose, I 38).
  const scene = level.scene;
  const v = scene.cameras.main.worldView;
  const warm = scene.add.rectangle(v.x, v.y, v.width, v.height, 0xf2b25c, 1).setOrigin(0, 0).setDepth(DEPTH.weather + 1).setAlpha(0);
  scene.tweens.add({ targets: warm, alpha: 0.22, yoyo: true, hold: 900, duration: 900, onComplete: () => warm.destroy() });
  if (ctx.autoplay || !w) return;
  const unlock = w.lock('the panther goes');
  try {
    await level.wait(2000, ctx.signal);
  } finally {
    unlock();
  }
}

/** s4.b1 DO[4]: the lion paces, then roars for the first time. */
async function firstRoar(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const roar = mechanic<HoldGround>(level, 'roar');
  if (ctx.autoplay || !roar) return;
  await level.wait(1500, ctx.signal);
  await roar.cue(2200, ctx.signal);
}

/** s4.b1 DO[5]: three charges and a second roar. */
async function charges(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const lion = mechanic<Chase>(level, 'lion');
  const roar = mechanic<HoldGround>(level, 'roar');
  if (ctx.autoplay || !lion || !roar) return;
  await lion.lungeOnce();
  if (ctx.signal.aborted) return;
  await level.wait(1400, ctx.signal);
  await roar.cue(2200, ctx.signal);
  if (ctx.signal.aborted) return;
  await lion.lungeOnce();
  await level.wait(1000, ctx.signal);
  await lion.lungeOnce();
}

/** s4.b2 DO[0]: the lion goes back up and stands at the top of the path, head high. */
function lionStands(ctx: BeatHookContext): void {
  const level = ctx.level;
  const lion = mechanic<Chase>(level, 'lion');
  lion?.stand();
  const npc = ext(level)?.npcOf('LION');
  if (npc) {
    const post = lionPost(level);
    void walkTo(level, npc.actor, post, 50, 3000).then(() => npc.actor.face('left'));
  }
}

/** s5.b2: the she-wolf pushes him back by degrees until he falls. */
async function byDegrees(ctx: BeatHookContext): Promise<void> {
  const wolf = mechanic<PushBack>(ctx.level, 'wolf');
  if (!wolf) return;
  if (ctx.autoplay) return;
  await wolf.push(undefined, ctx.signal);
}

/**
 * s5.b3 – s5.b5: free again. Down to the figure is turning to the guide; up
 * again is climbing; either way she brings him down to the figure.
 */
function upOrDown(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  const wolf = mechanic<PushBack>(level, 'wolf');
  if (!w) return;
  const signal = levelSignal(ctx);
  const figure = (): { x: number; y: number } => (w.companion.visible ? { x: w.companion.actor.x, y: w.companion.actor.y } : shadePost(level));
  const shade = level.place(PLACE.shade);
  let decided = false;
  // Only his own steps decide (§4.9): a knock or a push moves him without him choosing.
  let ref = { x: level.player.x, y: level.player.y };
  let toward = 0;
  let away = 0;
  const reached = (): boolean => dist(level.player.x, level.player.y, figure().x, figure().y) < 42 || (shade !== null && level.isPlayerIn(PLACE.shade));
  void until(
    level,
    () => {
      const now = { x: level.player.x, y: level.player.y };
      const input = w.input();
      if (Math.hypot(input.moveX, input.moveY) > 0.2 || input.dashPressed) {
        const f = figure();
        const d0 = dist(ref.x, ref.y, f.x, f.y);
        const d1 = dist(now.x, now.y, f.x, f.y);
        if (d1 < d0) toward += d0 - d1;
        else away += d1 - d0;
      }
      ref = now;
      if (!decided) {
        if (toward >= 36) {
          decided = true;
          level.emit(EV.turned);
          wolf?.start();
        } else if (away >= 36) {
          decided = true;
          level.emit(EV.climbed);
          wolf?.start();
        }
      }
      return reached();
    },
    45_000,
    signal,
  ).then(async (ok) => {
    if (signal.aborted) return;
    if (!ok) {
      // He stood where he was: she comes down and drives him to the figure.
      wolf?.start();
      const f = figure();
      await walkTo(level, level.player, { x: f.x - 26, y: f.y + 2 }, 60, 9000, signal);
    }
    wolf?.stop();
    if (!signal.aborted) level.emit(EV.reached);
  });
}

/** s5.b5 DO[0]: she stops mid-slope, turns and goes back up. */
function wolfReturns(ctx: BeatHookContext): void {
  const level = ctx.level;
  mechanic<PushBack>(level, 'wolf')?.stop();
  const npc = ext(level)?.npcOf('SHE_WOLF');
  if (npc) {
    npc.actor.face('left');
    void walkTo(level, npc.actor, wolfPost(level), 40, 6000);
  }
}

/** s5.b2 DO[4]: below, where the valley turns to shadow, a motionless figure. */
function figureBelow(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  w.showVirgil(true, false);
  virgilHolds(level, shadePost(level));
  w.companion.actor.face('left');
}

/** s6.b1 DO[0]: the figure steps out of the shade toward him. */
function stepsForward(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w) return;
  if (!w.companion.visible) {
    w.showVirgil(true, true);
    virgilHolds(level, shadePost(level));
  }
  const p = level.player;
  const v = w.companion.actor;
  const d = normalize(p.x - v.x, p.y - v.y);
  void walkTo(level, v, { x: v.x + d.x * 16, y: v.y + d.y * 10 }, 30, 1500);
}

/** s6.b2 DO[0]: "[E] Call to him". */
async function callToHim(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  if (ctx.autoplay || !w) return;
  await promptE(level, 'inf01-call', () => ({ x: w.companion.actor.x, y: w.companion.actor.y }), 40, 60_000, ctx.signal);
}

/** s6.b5 DO[0]: "[E] Show him the beast" — once Dante turns up the slope, to the wolf. */
async function showTheBeast(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  if (ctx.autoplay || !w) return;
  const wolf = w.npcOf('SHE_WOLF');
  const towardWolf = (): boolean => {
    if (!wolf) return true;
    const f = w.dante.actor.facing;
    return wolf.x < level.player.x ? f === 'left' : f === 'right';
  };
  let shown = false;
  const it = w.addInteractable({
    id: 'inf01-show',
    x: level.player.x,
    y: level.player.y,
    radius: 30,
    onInteract: () => {
      if (towardWolf()) shown = true;
    },
  });
  await until(
    level,
    () => {
      it.x = level.player.x;
      it.y = level.player.y;
      it.enabled = towardWolf();
      return shown;
    },
    60_000,
    ctx.signal,
  );
  w.removeInteractable('inf01-show');
}

/** s8.b2 DO[0]: Virgil turns onto the path and walks; he waits when Dante falls behind. */
async function behindHim(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  if (!w || ctx.autoplay) return;
  w.setVirgilLeads(false);
  w.companion.mode = 'follow';
  const s = spawnOf(level, PLACE.path);
  const dest = w.freeSpot(s.x + 230, s.y - 6);
  w.companion.lead([dest]);
  await until(
    level,
    () => {
      const v = w.companion.actor;
      return dist(v.x, v.y, dest.x, dest.y) < 10 && dist(v.x, v.y, level.player.x, level.player.y) < 70;
    },
    45_000,
    ctx.signal,
  );
  w.companion.lead(null);
  w.setVirgilLeads(true);
}

export function createInf01Level() {
  return storyLevel({
    id: 'inf01',
    emits: [EV.lookedBack, EV.waitedDawn, EV.heldGround, EV.turned, EV.reached, EV.climbed],
    build(ctx) {
      const w = ext(ctx);
      w?.setVirgilStaging('manual');
      w?.showVirgil(false);
      // No faint in this canto (bible §7.1): at the bottom he gathers himself.
      w?.setRescue({ at: 1, to: 3 });
      for (const s of ['PANTHER', 'LION', 'SHE_WOLF']) showFigure(ctx, s, false);

      const valley = ctx.place(PLACE.valley);
      const lower = ctx.place(PLACE.lower);
      const upper = ctx.place(PLACE.upper);
      const shadeC = centreOf(ctx, PLACE.shade);
      const upperC = centreOf(ctx, PLACE.upper);
      ctx.createMechanic('chase', {
        id: 'shadow',
        mode: 'pursue',
        hidden: true,
        start: { x: 40, y: 200 },
        speed: 50,
        damage: 0.8,
        ...(valley ? { safe: valley } : {}),
      });
      ctx.createMechanic('look_back', { event: EV.lookedBack, where: PLACE.valley, dir: 'left', holdMs: 1200 });
      const panther = ctx.createMechanic('chase', {
        id: 'panther',
        mode: 'block',
        actor: 'PANTHER',
        goal: upperC,
        gap: 34,
        speed: 95,
        damage: 0.3,
        ...(lower ? { area: { x: lower.x - 20, y: lower.y - 20, w: lower.w + 120, h: lower.h + 40 } } : {}),
      });
      if (panther) panther.enabled = false;
      const lion = ctx.createMechanic('chase', {
        id: 'lion',
        mode: 'lunge',
        actor: 'LION',
        auto: false,
        speed: 34,
        lungeSpeed: 210,
        lungeMs: 620,
        telegraphMs: 800,
        damage: 1,
        ...(upper ? { area: { x: upper.x + 20, y: upper.y + 10, w: upper.w - 30, h: upper.h - 20 } } : {}),
      });
      if (lion) lion.enabled = false;
      ctx.createMechanic('hold_ground', { id: 'roar', source: 'LION', event: EV.heldGround, cueMs: 2200, drainPerSecond: 0.3, floor: 1 });
      ctx.createMechanic('push_back', {
        id: 'wolf',
        actor: 'SHE_WOLF',
        dir: { x: shadeC.x - upperC.x, y: shadeC.y - upperC.y },
        auto: false,
        stepMs: 1300,
        stepPx: 14,
        gap: 30,
        fallAfter: 5,
        fallPx: 64,
        floor: 1,
      });
    },
    everyBeat: (ctx) => stage(ctx),
    hooks: {
      'inf01.s1.b5': onDo(2, shadowAtTheEdge),
      'inf01.s3.b1': async (ctx) => {
        if (ctx.phase === 'do' && ctx.doIndex === 1) {
          const panther = mechanic<Chase>(ctx.level, 'panther');
          const lower = ctx.level.place(PLACE.lower);
          if (panther && lower) {
            const spot = { x: lower.x + lower.w * 0.75, y: lower.y + lower.h / 2 };
            showFigure(ctx.level, 'PANTHER', true, spot);
            panther.placeAt(spot.x, spot.y);
            panther.enabled = true;
          }
        }
        if (ctx.phase === 'do' && ctx.doIndex === 3) await dawn(ctx);
      },
      'inf01.s3.b2': onDo(0, pantherGoes),
      'inf01.s4.b1': async (ctx) => {
        if (ctx.phase === 'do' && ctx.doIndex === 1) {
          const lion = mechanic<Chase>(ctx.level, 'lion');
          if (lion) {
            const post = lionPost(ctx.level);
            showFigure(ctx.level, 'LION', true, post);
            lion.placeAt(post.x, post.y);
            lion.enabled = true;
          }
        }
        if (ctx.phase === 'do' && ctx.doIndex === 4) await firstRoar(ctx);
        if (ctx.phase === 'do' && ctx.doIndex === 5) await charges(ctx);
      },
      'inf01.s4.b2': onDo(0, lionStands),
      'inf01.s5.b1': onDo(0, (ctx) => {
        const post = lionPost(ctx.level);
        showFigure(ctx.level, 'SHE_WOLF', true, { x: post.x - 12, y: post.y + 18 });
      }),
      'inf01.s5.b2': async (ctx) => {
        if (ctx.phase !== 'do') return;
        if (ctx.doIndex === 3) await byDegrees(ctx);
        if (ctx.doIndex === 4) figureBelow(ctx);
      },
      'inf01.s5.b3': onDo(0, upOrDown),
      'inf01.s5.b5': onDo(0, wolfReturns),
      'inf01.s6.b1': onDo(0, stepsForward),
      'inf01.s6.b2': onDo(0, callToHim),
      'inf01.s6.b5': onDo(0, showTheBeast),
      'inf01.s8.b2': onDo(0, behindHim),
    },
  });
}
