/**
 * Canto I — The Dark Wood (bible §7.1, docs/script/inferno-01.md).
 *
 * The generic layout of the script (wood -> wood's edge -> valley's end ->
 * slope -> lower slope -> upper slope -> the shade -> the other road ->
 * the hillside path) with the canto's moments:
 *
 *   s1.b1  Dante lies among the roots until the player's first input
 *   s1.b2–b4  the wood is walked, not read: each verse waits for Dante at its
 *          place on the way (a fear hollow across the path, the darkest
 *          passage where the ring of sight narrows, the end of an old paving)
 *   s1.b5  a creeping shadow pursues Dante out of the wood; the dash escapes it
 *   s2.b1  holding R at the valley's end looks back at the pass  -> inf01.looked_back
 *   s3     the panther drops in front of Dante and keeps between him and the
 *          hill (she cannot be passed before the dawn); the dawn comes down;
 *          eight still seconds (or steps back down) without first trying to
 *          get past her is waiting for it                    -> inf01.waited_dawn
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
import type { BeatHookContext, LevelBuildContext, LevelRuntime, Rect } from '../../../runtime/contracts';
import type { Chase } from '../../../mechanics/chase';
import type { Darkness } from '../../../mechanics/darkness';
import type { HoldGround } from '../../../mechanics/hold_ground';
import type { PushBack } from '../../../mechanics/push_back';
import { dist, normalize, rectContains, type Vec } from '../../../world/geometry';
import type { GenericLayout } from '../layout';
import { placeProp } from '../map';
import { onDo, until, untilMoved } from '../kit';
import { centreOf, ext, levelSignal, pathYAt, promptE, showFigure, spawnOf, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

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

// ---------------------------------------------------------------------------
// The dark wood (s1.b1–b4)
// ---------------------------------------------------------------------------

/**
 * The dark wood, walked rather than read (bible §7.1, inf01 s1.b1–b4). The
 * generic layout gives the wood one short place; the level widens it back to
 * the start of the map, so Dante wakes deep among the trunks. On his way out
 * each verse waits for him at its place: a fear hollow across the path (b2),
 * the darkest passage where his ring of sight narrows (b3), and the end of an
 * old paving under the thorns (b4). The thicket at the end of the paving is
 * closed until he takes the word Way; then a narrow gap opens on the path and
 * the word's light runs through it to the wood's edge.
 * Pure: tests check the marks lie on the path, in order, before the edge.
 */
export interface WoodPlan {
  /** The widened wood (replaces the generic place). */
  readonly wood: Rect & { readonly spawn: Vec };
  /** A fear hollow across the path (s1.b2 opens in its middle). */
  readonly pit: Rect;
  readonly pitX: number;
  /** The darkest passage: the ring of sight narrows inside it (s1.b3). */
  readonly passage: Rect;
  readonly passageX: number;
  /** Two hollows pressing on the passage from either side. */
  readonly hollows: readonly Rect[];
  /** Tile centres of the old paving under the thorns (s1.b4 opens where it ends). */
  readonly paving: readonly Vec[];
  readonly pavingEndX: number;
  /** The thicket across the whole wood at the end of the paving, and the gap that opens in it on the path. */
  readonly thornX: number;
  readonly gap: Vec;
  /** The wood's edge (the light of the taken word runs toward it). */
  readonly edge: Vec;
}

export function planWood(layout: GenericLayout): WoodPlan | null {
  const wood0 = layout.places.find((p) => p.id === PLACE.wood);
  const edge = layout.places.find((p) => p.id === PLACE.edge);
  if (!wood0 || !edge) return null;
  const y = (x: number): number => Math.round(pathYAt(layout.path, x));
  const left = Math.max(16, Math.min(wood0.x, layout.start.x - 24));
  const spawnX = left + 28;
  const wood = { x: left, y: Math.min(wood0.y, y(spawnX) - 40), w: wood0.x + wood0.w - left, h: 0, spawn: { x: spawnX, y: y(spawnX) } };
  wood.h = Math.max(wood0.y + wood0.h, y(spawnX) + 40) - wood.y;
  const thornX = edge.x - 44;
  const span = thornX - 12 - spawnX;
  if (span < 160) return null;
  const at = (k: number): number => Math.round(spawnX + span * k);
  const pitX = at(0.3);
  const passageX = at(0.6);
  // Short of the thorns (the thicket holds him a body width before its stems).
  const pavingEndX = thornX - 24;
  const pit = { x: pitX - 28, y: y(pitX) - 26, w: 56, h: 36 };
  const passage = { x: passageX - 34, y: 0, w: thornX - (passageX - 34), h: layout.height };
  const hollows = [
    { x: passageX - 30, y: y(passageX) - 58, w: 66, h: 28 },
    { x: passageX - 30, y: y(passageX) + 18, w: 66, h: 28 },
  ];
  const paving: Vec[] = [];
  for (let x = passageX + 40; x <= pavingEndX; x += 16) paving.push({ x, y: y(x) });
  const espawn = edge.spawn ?? { x: edge.x + edge.w / 2, y: edge.y + edge.h / 2 };
  return {
    wood,
    pit,
    pitX,
    passage,
    passageX,
    hollows,
    paving,
    pavingEndX,
    thornX,
    gap: { x: thornX, y: y(thornX) },
    edge: { x: espawn.x, y: espawn.y },
  };
}

interface WoodState {
  readonly plan: WoodPlan;
  narrow: boolean;
  /** The Way is taken: the wood lets him go. */
  done: boolean;
  /** Opens the gap in the thicket (idempotent). */
  open: () => void;
}

interface PantherWatch {
  tried: boolean;
  waited: boolean;
  done: boolean;
}

/** Per level instance (the LevelHost given to build and to every hook). */
const woods = new WeakMap<object, WoodState>();
const panthers = new WeakMap<object, PantherWatch>();

/** The old paving: worn slabs along the path, more of them missing toward the thorns. */
function layPaving(ctx: LevelRuntime, plan: WoodPlan): void {
  const g = ctx.scene.add.graphics().setDepth(DEPTH.groundDecor);
  plan.paving.forEach((p, i) => {
    const rows = [-7, 0, 7];
    rows.forEach((dy, j) => {
      // A deterministic wear pattern: the last stretch is half buried.
      if ((i * 7 + j * 3) % 5 === 0 || (i >= plan.paving.length - 2 && j !== 1)) return;
      const w = 9 + ((i + j) % 3) * 2;
      const x = p.x - 8 + ((i * 5 + j * 7) % 4);
      const y = p.y + dy - 3;
      g.fillStyle(0x3b3a33, 0.9);
      g.fillRect(x - 1, y - 1, w + 2, 7);
      g.fillStyle(0x6c6a5d, 0.85);
      g.fillRect(x, y, w, 5);
    });
  });
}

/**
 * The thicket at the end of the paving: thorn bushes across the whole wood
 * (the darkness hides all but the stretch near the path). Returns the opener:
 * a narrow gap on the path, the bushes there wither away.
 */
function growThicket(ctx: LevelBuildContext, plan: WoodPlan, height: number): () => void {
  const w = ext(ctx);
  const scene = ctx.scene;
  const x = plan.thornX;
  const half = 7;
  const removeWall = w ? w.addSolid({ x: x - half, y: 0, w: half * 2, h: height }) : () => undefined;
  // Thorn bushes near the path, close trunks away from it (the dark hides the rest).
  const bushes: Array<{ img: { destroy(): void }; y: number }> = [];
  for (let y = 8, i = 0; y < height; y += 10, i++) {
    const near = Math.abs(y - plan.gap.y) < 56;
    const jitter = ((i * 37) % 11) - 5;
    if (near || i % 2 === 0) {
      const img = placeProp(ctx, near ? 'bush' : i % 4 === 0 ? 'tree' : 'bush', x + jitter, y, { tint: 0x55644f });
      if (img) bushes.push({ img, y });
    }
  }
  let opened = false;
  return () => {
    if (opened) return;
    opened = true;
    removeWall();
    const gapHalf = 15;
    if (w) {
      w.addSolid({ x: x - half, y: 0, w: half * 2, h: Math.max(0, plan.gap.y - gapHalf - 6) });
      w.addSolid({ x: x - half, y: plan.gap.y + gapHalf, w: half * 2, h: Math.max(0, height - plan.gap.y - gapHalf) });
    }
    for (const b of bushes) {
      if (b.y < plan.gap.y - gapHalf - 4 || b.y > plan.gap.y + gapHalf + 12) continue;
      scene.tweens.add({ targets: b.img, alpha: 0, duration: 900, onComplete: () => b.img.destroy() });
    }
  };
}

/** s1.b1 start: Dante lies among the roots; the player's first input (or a while) and he rises. */
function lyingAmongRoots(ctx: BeatHookContext): void {
  const w = ext(ctx.level);
  if (!w || ctx.autoplay) return;
  const signal = levelSignal(ctx);
  w.dante.setPose('faint');
  // The key that turned the opening page is not yet his first move.
  void ctx.level
    .wait(450, signal)
    .then(() => untilMoved(ctx.level, 7000, signal))
    .then(() => {
      if (w.dante.pose === 'faint') w.dante.clearPose();
    });
}

/** s1.b2–b4 DO[0]: the verse waits until Dante reaches its place on the way (bounded). */
async function waitOnTheWay(ctx: BeatHookContext, x: (plan: WoodPlan) => number): Promise<void> {
  const st = woods.get(ctx.level);
  if (!st || ctx.autoplay) return;
  const level = ctx.level;
  const goal = x(st.plan);
  await until(level, () => level.player.x >= goal, 90_000, ctx.signal);
}

/** The wood lets him go: full sight again and the gap in the thorns (idempotent). */
function leaveTheWood(level: LevelRuntime, fast = false): void {
  const st = woods.get(level);
  if (!st || st.done) return;
  st.done = true;
  st.open();
  if (st.narrow) mechanic<Darkness>(level, 'dark')?.setRadius(84, fast ? 1 : 1200);
  st.narrow = false;
}

/** s1.b4 DO[1]: the Way is taken; the thorns part and its light runs ahead through the gap to the wood's edge. */
function wayLight(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = woods.get(level);
  leaveTheWood(level);
  const scene = level.scene;
  if (!scene.textures.exists('fx-glow')) return;
  const from = { x: level.player.x, y: level.player.y - 8 };
  const via = st ? { x: st.plan.gap.x, y: st.plan.gap.y - 8 } : null;
  const to = st ? { x: st.plan.edge.x, y: st.plan.edge.y - 8 } : { x: from.x + 160, y: from.y };
  const points: Vec[] = [];
  const legs: Array<[Vec, Vec, number]> = via && via.x > from.x + 8 ? [[from, via, 3], [via, to, 5]] : [[from, to, 7]];
  for (const [a, b, n] of legs) {
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      points.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 4 });
    }
  }
  points.forEach((p, i) => {
    const g = scene.add.image(p.x, p.y, 'fx-glow').setDepth(DEPTH.darkness + 1).setTint(level.palette.light).setDisplaySize(26, 18).setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 0.6, duration: 380, delay: (i + 1) * 140, yoyo: true, hold: 1800, onComplete: () => g.destroy() });
  });
}

/** Every frame of the wood: the darkest passage narrows his sight; fear makes his steps heavy. */
function woodFrame(level: LevelRuntime): void {
  const st = woods.get(level);
  if (!st || st.done) return;
  const w = ext(level);
  if (!w) return;
  // Whatever happened to the beat, the word in his book opens the thicket.
  if (level.store.state.words.owned.includes('Way')) {
    leaveTheWood(level);
    return;
  }
  const p = level.player;
  const inPassage = rectContains(st.plan.passage, p.x, p.y);
  if (inPassage !== st.narrow) {
    st.narrow = inPassage;
    mechanic<Darkness>(level, 'dark')?.setRadius(inPassage ? 50 : 84, inPassage ? 900 : 1200);
  }
  if (rectContains(st.plan.pit, p.x, p.y) || st.plan.hollows.some((r) => rectContains(r, p.x, p.y))) w.slow(0.75);
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
  // Out of the wood (a jump or a continue past it): full sight and the gap in the thorns.
  if (i >= at(ctx, 'inf01.s1.b5')) leaveTheWood(level, true);
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

/**
 * s3.b1 DO[0]: the panther springs down in front of Dante and keeps between
 * him and the hill. From now until the dawn reaches her, what he does is
 * watched (bible §4.9, inf01.c1): eight still seconds, or steps back down the
 * slope, before ever trying to get past her, is waiting for the dawn. Only his
 * own steps count (her shoves move him without his choosing).
 */
function pantherSprings(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  const panther = mechanic<Chase>(level, 'panther');
  const goal = centreOf(level, PLACE.upper);
  const p = level.player;
  const d = normalize(goal.x - p.x, goal.y - p.y);
  const spot = w ? w.freeSpot(p.x + d.x * 56, p.y + d.y * 56) : { x: p.x + d.x * 56, y: p.y + d.y * 56 };
  showFigure(level, 'PANTHER', true, spot);
  if (panther) {
    panther.placeAt(spot.x, spot.y);
    panther.enabled = true;
  }
  if (ctx.autoplay || !w) return;
  const watch: PantherWatch = { tried: false, waited: false, done: false };
  panthers.set(level, watch);
  const signal = levelSignal(ctx);
  // A breath to take her in: a step already under way when she lands is not yet trying to pass.
  const GRACE_MS = 1200;
  const t0 = w.now();
  let last = t0;
  let ref = { x: p.x, y: p.y };
  let still = 0;
  let toward = 0;
  let away = 0;
  void until(
    level,
    () => {
      if (watch.done) return true;
      const now = w.now();
      const dt = Math.min(200, now - last);
      last = now;
      const input = w.input();
      const own = Math.hypot(input.moveX, input.moveY) > 0.2 || input.dashPressed || w.dante.dashing;
      const here = { x: p.x, y: p.y };
      if (now - t0 > GRACE_MS && w.playable()) {
        if (own) {
          const d0 = dist(ref.x, ref.y, goal.x, goal.y);
          const d1 = dist(here.x, here.y, goal.x, goal.y);
          if (d1 < d0) toward += d0 - d1;
          else away += d1 - d0;
        } else {
          still += dt;
        }
        if (!watch.tried && !watch.waited && toward >= 28) watch.tried = true;
        if (!watch.tried && !watch.waited && (still >= 8000 || away >= 40)) watch.waited = true;
      }
      ref = here;
      return false;
    },
    120_000,
    signal,
  );
}

/** s3.b1 DO[3]: the dawn comes down the slope to the panther (about 25 s; at once once he has waited for it). */
async function dawn(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  const panther = mechanic<Chase>(level, 'panther');
  if (ctx.autoplay || !w) return;
  const watch = panthers.get(level) ?? null;
  const scene = level.scene;
  const upper = level.place(PLACE.upper);
  const startX = upper ? upper.x + upper.w : level.player.x + 360;
  const light = scene.textures.exists('fx-glow')
    ? scene.add.image(startX, level.player.y - 30, 'fx-glow').setDepth(DEPTH.weather).setTint(level.palette.light).setDisplaySize(300, 420).setAlpha(0.3)
    : null;
  const goal = centreOf(level, PLACE.upper);
  const DAWN_MS = 25_000;
  let elapsed = 0;
  await until(
    level,
    () => {
      elapsed += 50;
      const target = panther?.position ?? goal;
      const waited = watch?.waited ?? false;
      if (light) light.x += (target.x - light.x) * (waited ? 0.08 : 0.012);
      return waited || elapsed >= DAWN_MS;
    },
    DAWN_MS + 1000,
    ctx.signal,
  );
  if (watch) watch.done = true;
  if (watch?.waited) {
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
  // One step toward him, never into him.
  const step = Math.max(0, Math.min(16, dist(p.x, p.y, v.x, v.y) - 28));
  if (step > 1) void walkTo(level, v, { x: v.x + d.x * step, y: v.y + d.y * step * 0.6 }, 30, 1500);
  v.faceToward(p.x, p.y);
  // His bench (the checkpoint of DO[1]) stands behind him in the shade, out of the way of the call.
  const post = shadePost(level);
  w.checkpointAt(post.x + 34, post.y - 6);
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
  // Virgil waits, and looks where Dante came from: up the slope, at her.
  if (wolf) w.companion.actor.faceToward(wolf.x, wolf.y);
  // After a while Dante's own eyes go back to her (the key then shows); after a minute he shows her by himself.
  const t0 = w.now();
  let glanced = false;
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
      if (!glanced && wolf && w.now() - t0 > 20_000 && w.playable()) {
        glanced = true;
        w.dante.actor.faceToward(wolf.x, wolf.y);
      }
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
  const level = storyLevel({
    id: 'inf01',
    emits: [EV.lookedBack, EV.waitedDawn, EV.heldGround, EV.turned, EV.reached, EV.climbed],
    // The wood's ring of sight is named so the darkest passage can narrow it.
    overrides: { darkness: { id: 'dark' } },
    build(ctx, layout) {
      const w = ext(ctx);
      w?.setVirgilStaging('manual');
      w?.showVirgil(false);
      // No faint in this canto (bible §7.1): at the bottom he gathers himself.
      w?.setRescue({ at: 1, to: 3 });
      for (const s of ['PANTHER', 'LION', 'SHE_WOLF']) showFigure(ctx, s, false);

      // The dark wood: deeper than its generic place (he wakes far in), a hollow across the way,
      // the darkest passage between two more, the old paving, the thicket at its end.
      const wood = planWood(layout);
      const wood0 = ctx.place(PLACE.wood);
      if (wood && wood0) {
        ctx.addPlace({ ...wood0, x: wood.wood.x, y: wood.wood.y, w: wood.wood.w, h: wood.wood.h, spawn: wood.wood.spawn });
        ctx.setStart(wood.wood.spawn.x, wood.wood.spawn.y);
        ctx.createMechanic('fear', { id: 'pit', zones: [wood.pit, ...wood.hollows], floor: 1 });
        layPaving(ctx, wood);
        woods.set(ctx, { plan: wood, narrow: false, done: false, open: growThicket(ctx, wood, layout.height) });
      }

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
        // The summit she denies lies beyond the whole slope, so she is always in front of him, never beside.
        goal: upper ? { x: upper.x + upper.w + 240, y: upperC.y } : upperC,
        gap: 34,
        speed: 95,
        damage: 0.3,
        // She keeps the lower slope, top to bottom, and holds the line below the upper slope: there is
        // no walking round her; only a dash slips past her (bible §7.1: those who dash and force get
        // through in the end). Walking into her turns him back toward the wood (I 34–36).
        ...(lower && upper ? { area: { x: lower.x - 20, y: 16, w: upper.x + 8 - (lower.x - 20), h: layout.height - 32 } } : {}),
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
      'inf01.s1.b1': (ctx) => (ctx.phase === 'start' ? lyingAmongRoots(ctx) : undefined),
      'inf01.s1.b2': onDo(0, (ctx) => waitOnTheWay(ctx, (p) => p.pitX - 4)),
      'inf01.s1.b3': onDo(0, (ctx) => waitOnTheWay(ctx, (p) => p.passageX)),
      'inf01.s1.b4': async (ctx) => {
        if (ctx.phase !== 'do') return;
        if (ctx.doIndex === 0) await waitOnTheWay(ctx, (p) => p.pavingEndX);
        if (ctx.doIndex === 1) wayLight(ctx);
      },
      'inf01.s1.b5': onDo(2, shadowAtTheEdge),
      'inf01.s3.b1': async (ctx) => {
        if (ctx.phase === 'do' && ctx.doIndex === 0) pantherSprings(ctx);
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
  level.update = (_dt, runtime) => woodFrame(runtime);
  return level;
}
