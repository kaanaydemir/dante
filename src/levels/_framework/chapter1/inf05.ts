/**
 * Canto V — The Infernal Hurricane (bible §7.5, docs/script/inferno-05.md).
 *
 * The generic layout of the script (the stair -> Minos's court -> the bench ->
 * the threshold -> the dark -> the precipice -> the open -> the high rock and
 * its edge), its darkness, with the canto's own hurricane and moments:
 *
 *   s2.b2  Minos's tail sweeps the court (guardian; its shadow warns where it
 *          falls) and dread hangs about him (fear); the next soul is judged
 *   s2.b3  the bench behind him is the checkpoint; E there   -> inf05.watch_court
 *   s2.b4  the court game: three souls, a guess each (left / right, E); two
 *          right guesses or more                             -> inf05.minos_two_right
 *   s3     the hurricane: headwind lanes, lee rocks (the first and the
 *          precipice's are checkpoints), the ruin's cries (fear) above the
 *          path and the hardest wind below it, the starlings over the open
 *   s4.b1  the line of shades circles before the rock three times (E on a
 *          passing shade looks at it); after the third round, or E at Virgil's
 *          side once Dante has stepped away from him          -> inf05.line_passed
 *   s5.b2  the two who go together circle in the wind; E when they pass
 *          closest calls them (a call at the wrong time scatters in the wind)
 *                                                             -> inf05.called_them
 *   s5.b4  the wind falls silent (V 96) and stays silent
 *   s7.b1  the first step he tries is a stagger (or three seconds)
 *                                                             -> inf05.dante_falters
 *
 * At one unit of Resolve Dante sinks to his knees and Virgil lifts him to
 * three (bible §7.5 s3.b3). Every moment has a time limit; under autoplay the
 * runner produces the events itself.
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../../../config';
import type { BeatHookContext, LevelBuildContext, LevelRuntime, Rect } from '../../../runtime/contracts';
import type { SpeakerId } from '../../../story/types';
import type { Npc } from '../../../entities/npc';
import type { Faint } from '../../../mechanics/faint';
import type { Guardian } from '../../../mechanics/guardian';
import type { JudgementGameMechanic } from '../../../mechanics/judgement_game';
import type { WindField } from '../../../mechanics/wind_field';
import type { WindLane } from '../../../mechanics/logic/wind';
import { ellipseLoop, PolyPath } from '../../../mechanics/logic/path';
import { dustPuff } from '../../../mechanics/visuals';
import { dist, rectCenter, type Vec } from '../../../world/geometry';
import { placeBands } from '../ambient';
import type { GenericLayout } from '../layout';
import { placeProp } from '../map';
import { hooks, onDo, onStart, until } from '../kit';
import { beatIndex, ext, levelSignal, pathYAt, showFigure, storyLevel, virgilFollows, virgilHolds, walkTo } from './common';

const EV = {
  watchCourt: 'inf05.watch_court',
  twoRight: 'inf05.minos_two_right',
  linePassed: 'inf05.line_passed',
  calledThem: 'inf05.called_them',
  falters: 'inf05.dante_falters',
} as const;

const PLACE = {
  court: 'inf05_court',
  bench: 'inf05_court_bench',
  dark: 'inf05_dark',
  precipice: 'inf05_precipice',
  open: 'inf05_open',
  lee: 'inf05_lee',
  edge: 'inf05_lee_edge',
} as const;

/** Places crossed on the way down (s2–s3): bands across the level (see buildInf05). */
const BANDED: readonly string[] = ['inf05_court', 'inf05_court_bench', 'inf05_threshold', 'inf05_dark', 'inf05_precipice', 'inf05_open'];

/** The shades Virgil names (V 52–67), in the order they pass. */
const SHADES: readonly SpeakerId[] = ['SEMIRAMIS', 'DIDO', 'CLEOPATRA', 'HELEN', 'ACHILLES', 'PARIS', 'TRISTAN'];

const WATCH_ID = 'inf05-watch-judging';
const VIRGIL_ID = 'inf05-virgil-line';
const CALL_ID = 'inf05-call-them';

/** Speed of the line of shades and of the two lovers along their loops (px/s). */
const LINE_SPEED = 26;
const LOVERS_SPEED = 38;

interface Inf05State {
  /** The stone bench in the court (behind Minos). */
  readonly seat: Vec;
  /** Checkpoint spots in the lee of the first rock and of the precipice's rock. */
  readonly firstRock: Vec;
  readonly shelter: Vec;
  /** Where Virgil stands on the high rock, pointing at the line. */
  readonly rockEdge: Vec;
  readonly line: CircleOf;
  readonly lovers: CircleOf;
  /** Where the two hover once called. */
  hover: Vec | null;
}

const states = new WeakMap<object, Inf05State>();

function stateOf(level: LevelRuntime): Inf05State | null {
  return states.get(level) ?? null;
}

function mechanic<T>(level: LevelRuntime, id: string): T | null {
  return level.mechanic(id) as unknown as T | null;
}

// ---------------------------------------------------------------------------
// Figures going round a loop (the line of shades, the two who go together)
// ---------------------------------------------------------------------------

/**
 * A few NPCs going round a closed loop one behind another, driven by their
 * behaviours from the scene clock (so they move every frame, whatever the
 * story is doing). `hover` sends them to a spot and keeps them there.
 */
class CircleOf {
  private readonly path: PolyPath;
  private t0 = 0;
  private readonly glows: Array<Phaser.GameObjects.Image | null> = [];
  /** Extra brightness of the glows (the lovers' rose light when they pass closest). */
  glowBoost = 0;
  mode: 'off' | 'circle' | 'hover' = 'off';

  constructor(
    private readonly level: LevelRuntime,
    readonly speakers: readonly SpeakerId[],
    centre: Vec,
    rx: number,
    ry: number,
    private readonly speed: number,
    private readonly spacing: number,
    /** A soft light about each of them that shows through the dark (the gold of the named, the lovers' rose). */
    private readonly glow: { readonly tint: number; readonly size: number; readonly alpha: number } | null = null,
  ) {
    this.path = new PolyPath(ellipseLoop(centre.x, centre.y, rx, ry, 24), true);
  }

  private glowAt(k: number, x: number, y: number): void {
    const cfg = this.glow;
    const scene = this.level.scene;
    if (!cfg || !scene.textures.exists('fx-glow')) return;
    let g = this.glows[k] ?? null;
    if (!g || !g.active) {
      g = scene.add.image(x, y, 'fx-glow').setDepth(DEPTH.darkness + 1).setTint(cfg.tint).setDisplaySize(cfg.size, cfg.size).setBlendMode('ADD');
      this.glows[k] = g;
    }
    g.setVisible(true)
      .setPosition(Math.round(x), Math.round(y - 8))
      .setAlpha(Math.min(1, cfg.alpha + this.glowBoost));
  }

  private npcs(): Npc[] {
    const w = ext(this.level);
    if (!w) return [];
    return this.speakers.map((s) => w.npcOf(s)).filter((n): n is Npc => n !== null);
  }

  /** Length of one round in ms. */
  get roundMs(): number {
    return (this.path.length / Math.max(1, this.speed)) * 1000;
  }

  /** The loop's point farthest west (where it passes closest to the rock). */
  get west(): Vec {
    let best = this.path.points[0] as Vec;
    for (const p of this.path.points) if (p.x < best.x) best = p;
    return best;
  }

  /** Where the leader is now. */
  leader(): Vec {
    const n = this.npcs()[0];
    return n ? { x: n.x, y: n.y } : this.west;
  }

  /** Flying shades turn with the way they fly (their own animation); others keep their ambient one. */
  private orient(n: Npc, dx: number): void {
    if (Math.abs(dx) < 0.01) return;
    const sprite = n.actor.sprite;
    const key = `${sprite.texture.key}-fly-${dx < 0 ? 'left' : 'right'}`;
    if (this.level.scene.anims.exists(key) && (sprite.anims.currentAnim?.key !== key || !sprite.anims.isPlaying)) sprite.play(key, true);
  }

  circle(): void {
    const w = ext(this.level);
    if (!w || this.mode === 'circle') return;
    this.mode = 'circle';
    this.t0 = w.now();
    this.npcs().forEach((npc, k) => {
      npc.actor.stopWalk();
      npc.setVisible(true);
      npc.behaviour = (n) => {
        if (this.mode !== 'circle') return;
        const s = ((w.now() - this.t0) * this.speed) / 1000 - k * this.spacing;
        const p = this.path.at(s);
        const dx = p.x - n.x;
        n.actor.setPosition(p.x, p.y);
        this.orient(n, dx);
        this.glowAt(k, p.x, p.y);
      };
    });
  }

  /** Fly to `at` (one beside the other) and stay there in the still air, bobbing a little. */
  hoverAt(at: Vec): void {
    const w = ext(this.level);
    if (!w) return;
    this.mode = 'hover';
    const t0 = w.now();
    this.npcs().forEach((npc, k) => {
      npc.actor.stopWalk();
      npc.setVisible(true);
      const spot = { x: at.x + k * 12, y: at.y + k * 3 };
      let arrived = false;
      npc.behaviour = (n, dt) => {
        if (this.mode !== 'hover') return;
        const dx = spot.x - n.x;
        const dy = spot.y - n.y;
        const d = Math.hypot(dx, dy);
        if (!arrived && d > 1) {
          const step = Math.min(d, (60 * dt) / 1000);
          n.actor.setPosition(n.x + (dx / d) * step, n.y + (dy / d) * step);
          this.orient(n, dx);
          this.glowAt(k, n.x, n.y);
          return;
        }
        if (!arrived) {
          arrived = true;
          // Facing Dante, who stands to the west (the one who speaks; the other looks only at her).
          this.orient(n, -1);
        }
        n.actor.setPosition(spot.x, spot.y + Math.sin((w.now() - t0) / 420 + k) * 0.6);
        this.glowAt(k, n.x, n.y);
      };
    });
  }

  /** Gone into the dark. */
  dismiss(): void {
    this.mode = 'off';
    for (const npc of this.npcs()) {
      npc.behaviour = null;
      npc.setVisible(false);
    }
    for (const g of this.glows) if (g?.active) g.setVisible(false);
  }
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

/** The hurricane of the second circle (s3), from the generic layout. Pure (unit-tested for reachability). */
export interface Hurricane {
  readonly lanes: readonly WindLane[];
  /** Shelter rocks (solid), just above the path: their lee is west of them, downwind. */
  readonly rocks: readonly Rect[];
  /** Checkpoint spots in the lee of the first rock and of the precipice's rock. */
  readonly firstRock: Vec | null;
  readonly shelter: Vec | null;
  /** The ruin's cries (fear) above the path at the precipice. */
  readonly ruin: Rect | null;
  /** Where the starlings sweep (the open). */
  readonly flockArea: Rect | null;
}

export function planHurricane(layout: GenericLayout): Hurricane {
  const bands = placeBands(layout);
  const index = (id: string): number => layout.places.findIndex((p) => p.id === id);
  const band = (id: string): Rect | null => bands[index(id)] ?? null;
  const place = (id: string): Rect | null => {
    const p = layout.places[index(id)];
    return p ? { x: p.x, y: p.y, w: p.w, h: p.h } : null;
  };
  const yAt = (x: number): number => Math.round(pathYAt(layout.path, x));
  const lanes: WindLane[] = [];
  let ruin: Rect | null = null;
  const dark = band(PLACE.dark);
  if (dark) lanes.push({ rect: dark, dir: { x: -1, y: 0.15 }, strength: 28, gust: 8, gustMs: 2600 });
  const prec = band(PLACE.precipice);
  const precPlace = place(PLACE.precipice);
  if (prec && precPlace) {
    // Nearer the ruin the wind is weaker (and the cries are there); below the path it is hardest (s3.b2).
    const mid = yAt(precPlace.x + precPlace.w / 2);
    const split = mid - 14;
    lanes.push({ rect: { x: prec.x, y: prec.y, w: prec.w, h: split - prec.y }, dir: { x: -1, y: -0.2 }, strength: 24, gust: 8, gustMs: 2300 });
    lanes.push({ rect: { x: prec.x, y: split, w: prec.w, h: prec.y + prec.h - split }, dir: { x: -1, y: 0.2 }, strength: 40, gust: 10, gustMs: 2900 });
    ruin = { x: precPlace.x + 10, y: mid - 70, w: precPlace.w - 20, h: 46 };
  }
  const open = band(PLACE.open);
  if (open) lanes.push({ rect: open, dir: { x: -1, y: 0.25 }, strength: 30, gust: 10, gustMs: 2500 });
  // On the high rock and at its edge the air is still; a few steps beyond it, the wind (s3.b4).
  const edge = band(PLACE.edge);
  const edgeAt = place(PLACE.edge);
  if (edge && edgeAt) {
    const from = Math.round(edgeAt.x + edgeAt.w * 0.72);
    lanes.push({ rect: { x: from, y: edge.y, w: edge.x + edge.w - from, h: edge.h }, dir: { x: -1, y: 0.2 }, strength: 26, gust: 8, gustMs: 2700 });
  }
  // Rocks just above the path, clear of its corridor.
  const rockAt = (cx: number, wide = 40, high = 12): Rect => ({ x: Math.round(cx - wide / 2), y: yAt(cx) - 22 - high, w: wide, h: high });
  const darkPlace = place(PLACE.dark);
  const openPlace = place(PLACE.open);
  const rocks: Rect[] = [];
  const r1 = darkPlace ? rockAt(darkPlace.x + 64) : null;
  if (r1) rocks.push(r1);
  if (darkPlace) rocks.push(rockAt(darkPlace.x + darkPlace.w + 22));
  const r3 = precPlace ? rockAt(precPlace.x + precPlace.w - 12) : null;
  if (r3) rocks.push(r3);
  if (openPlace) rocks.push(rockAt(openPlace.x + openPlace.w / 2, 52, 14));
  const lee = (r: Rect | null): Vec | null => (r ? { x: r.x - 18, y: r.y + r.h + 4 } : null);
  return { lanes, rocks, firstRock: lee(r1), shelter: lee(r3), ruin, flockArea: open };
}

function buildInf05(ctx: LevelBuildContext, layout: GenericLayout): void {
  const w = ext(ctx);
  const place = (id: string): Rect | null => {
    const p = ctx.place(id);
    return p ? { x: p.x, y: p.y, w: p.w, h: p.h } : null;
  };

  // Bible §7.5 s3.b3: at one unit Dante sinks to his knees; Virgil lifts him to three.
  w?.setRescue({ at: 1, to: 3 });
  // Ground won against the wind is never taken back: a later beat of the hurricane whose place he has
  // already crossed (while an earlier one was still being read) leaves him where he is.
  w?.setKeepAhead(true);

  // Minos: dread about him (V 4: "There standeth Minos horribly, and snarls").
  const minos = w?.npcOf('MINOS') ?? null;
  if (minos) {
    ctx.createMechanic('fear', { id: 'dread', zones: [{ x: minos.x - 56, y: minos.y - 42, w: 112, h: 62 }], visible: false, floor: 2, drainPerSecond: 0.25 });
  }
  // The tail sweeps the court while Dante crosses it (s2.b2).
  const court = place(PLACE.court);
  const tail = ctx.createMechanic('guardian', {
    id: 'tail',
    actor: 'MINOS',
    aim: 'player',
    everyMs: 2800,
    telegraphMs: 1000,
    radius: 20,
    damage: 1,
    knock: 190,
    reach: 230,
    strikeFrame: 'snarl',
    auto: false,
    ...(court ? { area: { x: court.x - 30, y: court.y - 40, w: court.w + 110, h: court.h + 80 } } : {}),
  });
  if (tail) tail.enabled = false;

  // The bench behind Minos (the generic layout's bench sits left of the place's centre).
  const bench = place(PLACE.bench);
  const seat = bench ? { x: Math.round(bench.x + bench.w / 2 - 24), y: bench.y + 22 } : { x: ctx.player.x + 40, y: ctx.player.y };
  // The court game: the circles of the three souls of the script (2, 3, 9).
  ctx.createMechanic('judgement_game', { id: 'court', answers: [2, 3, 9], event: EV.twoRight, guessMs: 120_000, at: { x: seat.x + 10, y: seat.y + 50 } });

  // The hurricane (s3): headwinds against the way down, lee rocks, the ruin.
  const storm = planHurricane(layout);
  if (storm.ruin) {
    const ruin = storm.ruin;
    ctx.createMechanic('fear', { id: 'ruin', zones: [ruin], floor: 2, drainPerSecond: 0.3 });
    for (let i = 0; i < 4; i++) placeProp(ctx, 'rock_big', ruin.x + 14 + i * 46, ruin.y + 8 + (i % 2) * 10);
  }
  for (const r of storm.rocks) placeProp(ctx, 'shelter_rock', r.x + r.w / 2, r.y + r.h);
  ctx.createMechanic('wind_field', {
    id: 'wind',
    lanes: storm.lanes,
    rocks: storm.rocks,
    souls: 6,
    restPerSecond: 0.15,
    // V 37–39 / bible: the wind was not made for him: he is pushed, not swept away. Standing still he keeps low.
    brace: { afterMs: 450, factor: 0.15 },
    // The starlings sweep the open field only (s3.b3, V 40–43).
    flock: storm.flockArea ? { everyMs: 6500, speed: 160, width: 50, damage: 0.4, area: storm.flockArea } : null,
  });

  ctx.createMechanic('faint', { id: 'faint', falterEvent: EV.falters, timeoutMs: 3000 });

  // The line of shades and the two lovers wait in the dark until their scenes.
  const lee = place(PLACE.lee);
  const leeC = lee ? rectCenter(lee) : { x: ctx.player.x, y: ctx.player.y };
  const edgePlace = place(PLACE.edge);
  const edgeC = edgePlace ? rectCenter(edgePlace) : { x: leeC.x + 300, y: leeC.y - 60 };
  const line = new CircleOf(ctx, SHADES, { x: leeC.x + 102, y: leeC.y - 2 }, 58, 40, LINE_SPEED, 36, { tint: 0xe8c878, size: 22, alpha: 0.32 });
  const lovers = new CircleOf(ctx, ['FRANCESCA', 'PAOLO'], { x: edgeC.x + 40, y: edgeC.y + 24 }, 60, 42, LOVERS_SPEED, 14, { tint: 0xe89aa8, size: 30, alpha: 0.3 });
  for (const s of [...SHADES, 'FRANCESCA', 'PAOLO']) showFigure(ctx, s, false);
  for (const s of SHADES) w?.npcOf(s)?.actor.sprite.setTint(0xe8dcb4);

  // The court and the hurricane are crossed place by place: each of their places is a band across the level's
  // height, so no beat is passed by going round its place (the high rock and its edge keep their own rects).
  for (const p of layout.places) {
    if (BANDED.includes(p.id)) ctx.addPlace({ ...p, y: 0, h: layout.height });
  }

  states.set(ctx, {
    seat,
    firstRock: storm.firstRock ?? { x: seat.x + 500, y: seat.y },
    shelter: storm.shelter ?? { x: seat.x + 900, y: seat.y },
    rockEdge: { x: leeC.x + 12, y: leeC.y - 10 },
    line,
    lovers,
    hover: null,
  });
}

// ---------------------------------------------------------------------------
// The court (s2)
// ---------------------------------------------------------------------------

function tailStarts(ctx: BeatHookContext): void {
  const tail = mechanic<Guardian>(ctx.level, 'tail');
  if (!tail || ctx.autoplay) return;
  tail.enabled = true;
  tail.start();
}

function tailStops(level: LevelRuntime): void {
  const tail = mechanic<Guardian>(level, 'tail');
  if (!tail) return;
  tail.stop();
  tail.enabled = false;
}

/** The soul whose turn it is (the one figure of the queue that speaks). */
function nextSoul(level: LevelRuntime): Npc | null {
  return ext(level)?.npcOf('SOUL') ?? null;
}

const soulHome = new WeakMap<Npc, Vec>();

/** The soul steps forward before Minos. */
async function soulForward(ctx: BeatHookContext): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  const soul = nextSoul(level);
  const minos = w?.npcOf('MINOS');
  if (!w || !soul || !minos) return;
  soul.behaviour = null;
  if (!soulHome.has(soul)) soulHome.set(soul, { x: soul.x, y: soul.y });
  soul.setVisible(true);
  const to = { x: minos.x - 20, y: minos.y + 2 };
  if (ctx.autoplay) soul.actor.teleport(to.x, to.y);
  else await walkTo(level, soul.actor, to, 30, 2500, ctx.signal);
}

/** Minos winds his tail `coils` times (unless the court game did) and the soul is hurled down. */
async function hurl(ctx: BeatHookContext, coils: number): Promise<void> {
  const level = ctx.level;
  const w = ext(level);
  const soul = nextSoul(level);
  const minos = w?.npcOf('MINOS');
  if (!w || !soul) return;
  const signal = ctx.signal;
  if (minos && coils > 0) {
    for (let k = 1; k <= coils; k++) {
      if (signal.aborted) return;
      minos.actor.pose(`coil-${k}`);
      w.sfx('blip');
      await level.wait(ctx.autoplay ? 60 : 240, signal);
    }
  }
  dustPuff(level.scene, soul.x, soul.y);
  soul.setVisible(false);
  w.sfx('thunder');
  await level.wait(ctx.autoplay ? 100 : 700, signal);
  minos?.actor.pose('idle');
  // The next one of the queue takes its place at the back.
  const home = soulHome.get(soul);
  if (home) soul.actor.teleport(home.x, home.y);
  soul.setVisible(true);
}

/** s2.b2 DO[1]: the next soul is judged while Dante crosses the court. */
function judgedInPassing(ctx: BeatHookContext): void {
  const signal = levelSignal(ctx);
  const local: BeatHookContext = { ...ctx, signal };
  void soulForward(local).then(() => (signal.aborted ? undefined : hurl(local, 2)));
}

/** s2.b3 DO[0]: the bench behind Minos is the checkpoint. */
function benchCheckpoint(ctx: BeatHookContext): void {
  const st = stateOf(ctx.level);
  const w = ext(ctx.level);
  if (st && w) w.checkpointAt(st.seat.x, st.seat.y);
}

/** s2.b3 DO[1]: "[E] Watch the judging" over the bench. */
function watchPrompt(ctx: BeatHookContext): void {
  const st = stateOf(ctx.level);
  const w = ext(ctx.level);
  if (!st || !w || ctx.autoplay) return;
  w.addInteractable({
    id: WATCH_ID,
    // A little in front of the bench's own "rest" spot, so it wins where Dante stands to sit.
    x: st.seat.x,
    y: st.seat.y + 10,
    radius: 34,
    onInteract: () => {
      w.removeInteractable(WATCH_ID);
      w.emitOnce(EV.watchCourt);
    },
  });
}

function sitVirgil(level: LevelRuntime, on: boolean): void {
  const w = ext(level);
  if (!w) return;
  const a = w.companion.actor;
  a.poseLocked = false;
  if (on && a.pose('sit')) a.poseLocked = true;
  else a.playIdle();
}

/** s2.b4 DO[0]: Dante sits on the bench beside Virgil and watches. */
function sitOnBench(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w) return;
  w.removeInteractable(WATCH_ID);
  virgilHolds(level);
  w.companion.actor.teleport(st.seat.x + 8, st.seat.y + 1);
  sitVirgil(level, true);
  w.dante.teleport(st.seat.x - 6, st.seat.y + 1);
  w.dante.setPose('sit');
}

/** s2.b4 DO[3], [5], [7]: the player guesses, Minos winds his tail, the soul is hurled. */
async function judgeSoul(ctx: BeatHookContext): Promise<void> {
  const game = mechanic<JudgementGameMechanic>(ctx.level, 'court');
  let wound = false;
  if (game && !ctx.autoplay && !game.done) {
    const result = await game.judge(ctx.signal);
    wound = result !== null;
  }
  if (ctx.signal.aborted) return;
  const coils = [2, 3, 9][ctx.doIndex === 3 ? 0 : ctx.doIndex === 5 ? 1 : 2] ?? 2;
  await hurl(ctx, wound ? 0 : coils);
}

/** s2.b4 DO[8]: the margin closes (the event, if the game was passed). */
function courtCloses(ctx: BeatHookContext): void {
  mechanic<JudgementGameMechanic>(ctx.level, 'court')?.finish();
}

/** Dante gets up from the bench; Virgil stands and goes on (s2.b4 DO[10]; later beats only lift Dante). */
function riseFromBench(level: LevelRuntime, releaseVirgil = true): void {
  const st = stateOf(level);
  const w = ext(level);
  if (!w) return;
  // Only off the court's bench (a rest on another bench ends by itself).
  if (w.dante.pose === 'sit' && st && dist(w.dante.x, w.dante.y, st.seat.x, st.seat.y) < 30) {
    w.dante.clearPose();
    const off = w.freeSpot(st.seat.x - 6, st.seat.y + 14);
    w.dante.teleport(off.x, off.y);
  }
  if (releaseVirgil && w.companion.mode === 'hold') {
    sitVirgil(level, false);
    virgilFollows(level);
  }
}

/** s2.b5 DO[3]: the tail strikes the stone once; dust rises. */
function tailSlams(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  const minos = w?.npcOf('MINOS');
  if (!w || !minos) return;
  minos.actor.pose('snarl');
  dustPuff(level.scene, minos.x - 22, minos.y + 4);
  w.sfx('quake');
  void level.camera.shake(220, 0.004);
  void level.wait(700, levelSignal(ctx)).then(() => minos.actor.pose('idle'));
}

// ---------------------------------------------------------------------------
// The hurricane (s3)
// ---------------------------------------------------------------------------

/** s3.b1 DO[1]: the wind strikes for the first time and throws him back a step. */
function firstGust(ctx: BeatHookContext): void {
  const w = ext(ctx.level);
  if (!w) return;
  w.sfx('wind');
  if (!ctx.autoplay) w.dante.knock(-150, 0, 300);
  void ctx.level.camera.shake(200, 0.002);
}

function checkpointAt(level: LevelRuntime, which: 'firstRock' | 'shelter'): void {
  const st = stateOf(level);
  const w = ext(level);
  if (st && w) w.checkpointAt(st[which].x, st[which].y);
}

// ---------------------------------------------------------------------------
// The line of shades (s3.b4 – s4)
// ---------------------------------------------------------------------------

function showLine(level: LevelRuntime): void {
  const st = stateOf(level);
  if (!st) return;
  for (const s of SHADES) {
    const npc = ext(level)?.npcOf(s);
    if (npc) npc.talkable = true;
  }
  st.line.circle();
}

function lineGone(level: LevelRuntime): void {
  const st = stateOf(level);
  const w = ext(level);
  w?.removeInteractable(VIRGIL_ID);
  if (!st || st.line.mode === 'off') return;
  st.line.dismiss();
}

/** s4.b1 DO[0]: Virgil goes up to the rock's edge and points at the line. */
function virgilPoints(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w) return;
  virgilHolds(level);
  const v = w.companion.actor;
  const spot = w.freeSpot(st.rockEdge.x, st.rockEdge.y);
  const point = (): void => {
    v.faceToward(st.line.west.x, st.line.west.y);
    w.companion.point('right', 2600);
  };
  if (ctx.autoplay || dist(v.x, v.y, spot.x, spot.y) > 160) {
    v.teleport(spot.x, spot.y);
    point();
  } else {
    void walkTo(level, v, spot, 60, 4000, levelSignal(ctx)).then(point);
  }
}

/** s4.b1 DO[3]: three rounds before the rock; then the line breaks up (or Dante goes back to Virgil). */
function lineGoesRound(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w) return;
  showLine(level);
  if (ctx.autoplay) return;
  const signal = levelSignal(ctx);
  const v = w.companion.actor;
  let spoke = false;
  let away = false;
  let played = 0;
  let last = w.now();
  const it = w.addInteractable({
    id: VIRGIL_ID,
    x: v.x,
    y: v.y,
    radius: 22,
    onInteract: () => {
      spoke = true;
    },
  });
  it.enabled = false;
  const rounds = 3 * st.line.roundMs;
  void until(
    level,
    () => {
      const t = w.now();
      played += w.playable() ? Math.min(100, Math.max(0, t - last)) : 0;
      last = t;
      // "Returns to Virgil": the prompt only once he has stepped away from him.
      if (dist(level.player.x, level.player.y, v.x, v.y) > 56) away = true;
      it.x = v.x;
      it.y = v.y;
      it.enabled = away;
      return spoke || played >= rounds;
    },
    rounds * 2 + 60_000,
    signal,
  ).then(() => {
    w.removeInteractable(VIRGIL_ID);
    if (signal.aborted) return;
    lineGone(level);
    w.emitOnce(EV.linePassed);
  });
}

// ---------------------------------------------------------------------------
// The two who go together (s5)
// ---------------------------------------------------------------------------

/** A call at the wrong moment: Dante's words scatter in the wind. */
function scatterWords(level: LevelRuntime): void {
  const scene = level.scene;
  const p = level.player;
  ext(level)?.sfx('wind');
  if (!scene.textures.exists('fx-letters')) return;
  for (let i = 0; i < 6; i++) {
    const img = scene.add.image(p.x + 4, p.y - 30, 'fx-letters', String(i % 6)).setDepth(DEPTH.fx).setAlpha(0.9);
    scene.tweens.add({
      targets: img,
      x: p.x - 30 - i * 9,
      y: p.y - 40 + (i % 3) * 9,
      alpha: 0,
      angle: 90 + i * 40,
      duration: 900 + i * 60,
      onComplete: () => img.destroy(),
    });
  }
}

/** s5.b1: below the rock, in the wind, two shades fly side by side. */
function loversAppear(level: LevelRuntime): void {
  stateOf(level)?.lovers.circle();
}

/** Once called, they come through the wind and stay before the rock (V 82–87). */
function loversCome(level: LevelRuntime): void {
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w) return;
  if (!st.hover) {
    const p = level.player;
    st.hover = w.freeSpot(p.x + 30, p.y - 2);
  }
  w.removeInteractable(CALL_ID);
  st.lovers.hoverAt(st.hover);
}

/** s5.b2 DO[1]: E when they pass closest calls them; early or late, the words scatter. */
function callThem(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w) return;
  if (st.lovers.mode === 'off') st.lovers.circle();
  if (ctx.autoplay) return;
  const signal = levelSignal(ctx);
  const west = st.lovers.west;
  let called = false;
  let near = false;
  let played = 0;
  let last = w.now();
  const it = w.addInteractable({
    id: CALL_ID,
    x: west.x,
    y: west.y,
    radius: 60,
    silent: true,
    onInteract: () => {
      if (near) called = true;
      else scatterWords(level);
    },
  });
  void until(
    level,
    () => {
      const t = w.now();
      played += w.playable() ? Math.min(100, Math.max(0, t - last)) : 0;
      last = t;
      const pos = st.lovers.leader();
      near = st.lovers.mode === 'circle' && dist(pos.x, pos.y, west.x, west.y) < 36;
      st.lovers.glowBoost = near ? 0.45 : 0;
      // The rose light about them strengthens and the prompt appears while they pass closest.
      it.silent = !near;
      it.x = near ? pos.x : west.x;
      it.y = near ? pos.y : west.y;
      return called || st.lovers.mode !== 'circle' || played >= 120_000;
    },
    240_000,
    signal,
  ).then(() => {
    w.removeInteractable(CALL_ID);
    st.lovers.glowBoost = 0;
    if (signal.aborted) return;
    loversCome(level);
    w.emitOnce(EV.calledThem);
  });
}

/** s5.b4 DO[3] (and every beat after it): the wind is silent. */
function windFalls(level: LevelRuntime, fadeMs: number): void {
  const wind = mechanic<WindField>(level, 'wind');
  if (wind && wind.calmLevel < 1) void wind.lull(fadeMs);
}

// ---------------------------------------------------------------------------
// The fall (s7)
// ---------------------------------------------------------------------------

function falters(ctx: BeatHookContext): void {
  const faint = mechanic<Faint>(ctx.level, 'faint');
  if (!faint || ctx.autoplay) return;
  void faint.falter(levelSignal(ctx));
}

function falls(ctx: BeatHookContext): void {
  ext(ctx.level)?.dante.setPose('faint');
}

// ---------------------------------------------------------------------------
// Staging after jumps and continues
// ---------------------------------------------------------------------------

function stage(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w) return;
  const i = beatIndex(ctx, ctx.beat.id);
  const at = (id: string): number => beatIndex(ctx, id);
  // The tail only while Dante crosses the court.
  if (ctx.beat.id !== 'inf05.s2.b2') tailStops(level);
  if (i !== at('inf05.s2.b3')) w.removeInteractable(WATCH_ID);
  // Up from the bench once the court game is over.
  if (i > at('inf05.s2.b4')) riseFromBench(level, false);
  // The line of shades, from the high rock until it has passed.
  if (i > at('inf05.s3.b4') && i < at('inf05.s4.b9')) {
    if (st.line.mode !== 'circle') showLine(level);
  } else if (i >= at('inf05.s4.b9') || i < at('inf05.s3.b4')) {
    lineGone(level);
  }
  // Virgil on the rock's edge through the catalogue; walking with Dante otherwise.
  if (i > at('inf05.s4.b1') && i < at('inf05.s4.b9') && w.companion.mode !== 'hold') {
    virgilHolds(level, w.freeSpot(st.rockEdge.x, st.rockEdge.y));
  } else if ((i >= at('inf05.s4.b9') || i < at('inf05.s4.b1')) && i !== at('inf05.s2.b4') && w.companion.mode === 'hold') {
    sitVirgil(level, false);
    virgilFollows(level);
  }
  // The two who go together.
  if (i >= at('inf05.s5.b1') && i < at('inf05.s5.b3')) {
    if (st.lovers.mode === 'off') loversAppear(level);
  } else if (i >= at('inf05.s5.b3')) {
    if (st.lovers.mode !== 'hover') loversCome(level);
  } else if (st.lovers.mode !== 'off') {
    st.lovers.dismiss();
  }
  // After V 96 the wind stays silent.
  if (i > at('inf05.s5.b4')) windFalls(level, 100);
}

export function createInf05Level() {
  return storyLevel({
    id: 'inf05',
    emits: [EV.watchCourt, EV.twoRight, EV.linePassed, EV.calledThem, EV.falters],
    overrides: { fear: false, wind_field: false },
    build: buildInf05,
    everyBeat: stage,
    hooks: {
      'inf05.s2.b2': hooks(onDo(1, judgedInPassing), onDo(2, tailStarts)),
      'inf05.s2.b3': hooks(onDo(0, benchCheckpoint), onDo(1, watchPrompt)),
      'inf05.s2.b4': hooks(
        onDo(0, sitOnBench),
        onDo(2, soulForward),
        onDo(3, judgeSoul),
        onDo(4, soulForward),
        onDo(5, judgeSoul),
        onDo(6, soulForward),
        onDo(7, judgeSoul),
        onDo(8, courtCloses),
        onDo(10, (ctx) => riseFromBench(ctx.level)),
      ),
      'inf05.s2.b5': onDo(3, tailSlams),
      'inf05.s3.b1': hooks(onDo(1, firstGust), onDo(4, (ctx) => checkpointAt(ctx.level, 'firstRock'))),
      'inf05.s3.b2': onDo(2, (ctx) => checkpointAt(ctx.level, 'shelter')),
      'inf05.s3.b4': onDo(1, (ctx) => showLine(ctx.level)),
      'inf05.s4.b1': hooks(
        onDo(0, virgilPoints),
        onDo(1, (ctx) => ext(ctx.level)?.companion.point('right', 2000)),
        onDo(3, lineGoesRound),
      ),
      'inf05.s4.b9': onStart((ctx) => lineGone(ctx.level)),
      'inf05.s5.b1': onStart((ctx) => loversAppear(ctx.level)),
      'inf05.s5.b2': onDo(1, callThem),
      'inf05.s5.b3': onStart((ctx) => loversCome(ctx.level)),
      'inf05.s5.b4': onDo(3, (ctx) => windFalls(ctx.level, 2500)),
      'inf05.s7.b1': onDo(1, falters),
      'inf05.s7.b2': onDo(0, falls),
    },
  });
}
