/**
 * Canto IV — Limbo (bible §7.4, docs/script/inferno-04.md).
 *
 * Canto IV has no gameplay gates: every beat is reached by walking or by
 * talking, and its events are only remembered. The generic layout (the brink
 * -> the descent -> the plain of sighs -> the hollow -> the forest of ghosts ->
 * the rise -> the fire's edge -> the poets -> the castle and its stream -> the
 * meadow -> the gates -> the dark edge), its darkness and its walkable stream,
 * with:
 *
 *   s1     the abysmal valley: a black drop below the brink and the descent,
 *          its rim a step from the path (Dante cannot cross it); the ledge ends
 *          in a rock spur, and Virgil stands in the one narrow passage beside it
 *          until Dante speaks to him (the way on is always through s1.b3)
 *   s1.b2  Virgil stands at the rim, head bowed over the valley; Dante at the
 *          rim pressing on toward the drop leans out and looks down
 *                                                            -> inf04.looked_down
 *   s2     the plain of sighs: seated shades, faces raised to the empty grey;
 *          each sigh makes the air above a shade tremble, and the trembling
 *          passes to its neighbours (no harm). E beside one: it does not turn;
 *          Dante looks up where it looks, and finds nothing
 *   s3.b1  the forest of ghosts: shades as thick as trunks make way for Virgil
 *          and close behind him; strayed far from him, Dante is slow to get through
 *   s4–s8  the four poets come from the castle, stand about Dante, walk with the
 *          company to the light, over the stream and through the gates, wait on
 *          the open height and at the inner gate, and turn back at the castle gate
 *   s5.b1  on the way their balloons open and close, empty; E beside a poet:
 *          Dante's balloon is empty too, and so is the answer (IV 104)
 *          a Reveal verse on the light road pushes back the dark at the forest's
 *          edge for a moment                                 -> inf04.light_read
 *   s6.b2  the first step onto the stream                    -> inf04.stepped_on_water
 *   all    every place is a band across the level's height: the walk crosses
 *          each one in the poem's order, so no beat is passed by going round it
 *   s7     the meadow: the heroes apart from one another, Saladin alone at the
 *          far edge; the philosophers sit in a ring on the rise and answer only
 *          once Dante has climbed it (s7.b6); a hedge closes the meadow, so the
 *          way to the inner gate crosses the rise (s7.b6 always plays)
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../../../config';
import type { BeatHookContext, LevelBuildContext, LevelRuntime, MechanicContext, PlaceDef, Rect } from '../../../runtime/contracts';
import type { SpeakerId } from '../../../story/types';
import type { Npc } from '../../../entities/npc';
import { BaseMechanic } from '../../../mechanics/base';
import { lightColumn, waveRing } from '../../../mechanics/visuals';
import type { Interactable } from '../../../world/extras';
import { dist, hashString, rectCenter, seededRandom, type Vec } from '../../../world/geometry';
import { placeBands } from '../ambient';
import type { GenericLayout } from '../layout';
import { placeProp } from '../map';
import { hooks, onDo, onEnd, onStart, until, verseNear } from '../kit';
import { beatIndex, ext, levelSignal, pathYAt, storyLevel, virgilFollows, virgilHolds } from './common';

const EV = {
  lookedDown: 'inf04.looked_down',
  lightRead: 'inf04.light_read',
  steppedOnWater: 'inf04.stepped_on_water',
} as const;

const PLACE = {
  brink: 'inf04_brink',
  descent: 'inf04_descent',
  sighs: 'inf04_sighs',
  hollow: 'inf04_hollow',
  forest: 'inf04_ghost_forest',
  poets: 'inf04_poets_meeting',
  meadow: 'inf04_meadow',
  opening: 'inf04_opening',
  heroes: 'inf04_heroes',
  philosophers: 'inf04_philosophers',
  meadowGate: 'inf04_meadow_gate',
} as const;

/** The four poets of IV 85–90, Homer first. */
const POETS: readonly SpeakerId[] = ['HOMER', 'HORACE', 'OVID', 'LUCAN'];
/** The great spirits who sit on the rise (s7.b6 names them before they answer). */
const PHILOSOPHERS: readonly SpeakerId[] = ['ARISTOTLE', 'SOCRATES', 'PLATO', 'ORPHEUS', 'AVICENNA', 'AVERROES'];

/** The rim of the valley lies this far below the path's middle (the path is drawn about 17 px either side). */
const RIM_BELOW_PATH = 30;
/** Width of the solid columns that make the rim. */
const RIM_STEP = 16;
/** Pressing on toward the drop at the rim this long (game ms) is looking down. */
const LOOK_DOWN_MS = 1000;

// ---------------------------------------------------------------------------
// Pure plans (unit-tested)
// ---------------------------------------------------------------------------

/** The abysmal valley (IV 7–12) beside the path below the brink and the descent. */
export interface Drop {
  readonly x0: number;
  readonly x1: number;
  /** Solid columns from the rim down to the bottom of the level. */
  readonly solids: readonly Rect[];
}

export function planDrop(layout: GenericLayout): Drop | null {
  const brink = layout.places.find((p) => p.id === PLACE.brink);
  const descent = layout.places.find((p) => p.id === PLACE.descent);
  if (!brink || !descent) return null;
  const x0 = 0;
  // The drop ends where the path has gone down into the first circle: its rim falls away there to the bottom.
  const x1 = Math.round(descent.x + descent.w * 0.45);
  const taper = 112;
  const rimEnd = Math.round(pathYAt(layout.path, x1 - taper)) + RIM_BELOW_PATH;
  const solids: Rect[] = [];
  for (let x = x0; x < x1; x += RIM_STEP) {
    const w = Math.min(RIM_STEP, x1 - x);
    const mid = x + w / 2;
    const below = pathYAt(layout.path, mid) + RIM_BELOW_PATH;
    const y = Math.round(mid > x1 - taper ? Math.max(below, rimEnd + ((mid - (x1 - taper)) / taper) * (layout.height - 24 - rimEnd)) : below);
    solids.push({ x, y, w, h: Math.max(1, layout.height - y) });
  }
  return { x0, x1, solids };
}

/** The rim's height at x (the top of its solid column), or null outside the drop. */
export function rimAt(drop: Drop, x: number): number | null {
  if (x < drop.x0 || x >= drop.x1) return null;
  const col = drop.solids[Math.floor((x - drop.x0) / RIM_STEP)];
  return col ? col.y : null;
}

/**
 * The head of the path down (s1): the ledge of the brink ends in a rock spur;
 * between the spur and the rim there is one narrow passage, and Virgil stands
 * in it, his back to Dante, until Dante speaks to him (s1.b3). So the way on
 * is always through him: the canto's first words are never walked past.
 */
export interface BrinkGate {
  /** The rock spur from the top of the level down to the passage (solid). */
  readonly spur: Rect;
  /** The passage itself: solid while Virgil stands in it. */
  readonly block: Rect;
  /** Where Virgil stands (his feet). */
  readonly spot: Vec;
}

export function planBrinkGate(layout: GenericLayout, drop: Drop): BrinkGate | null {
  const brink = layout.places.find((p) => p.id === PLACE.brink);
  if (!brink) return null;
  const x = Math.round(brink.x + brink.w - 26);
  const rim = rimAt(drop, x);
  if (rim === null) return null;
  const top = Math.round(pathYAt(layout.path, x)) - 14;
  return {
    spur: { x: x - 8, y: 0, w: 16, h: top },
    block: { x: x - 8, y: top, w: 16, h: rim - top },
    spot: { x, y: Math.round((top + rim) / 2) + 6 },
  };
}

/** A place stretched into a band across the level's height (same x range, same spawn). */
export function placeBand(p: PlaceDef, height: number): PlaceDef {
  return { ...p, y: 0, h: height };
}

/** Where the great spirits of the meadow stand (s7), and the hedge that closes it beyond the rise. */
export interface MeadowPlan {
  readonly figures: Readonly<Record<string, Vec>>;
  /** Solids: the hedge above and below the philosophers' rise. */
  readonly hedge: readonly Rect[];
}

export function planMeadow(layout: GenericLayout): MeadowPlan | null {
  const heroes = layout.places.find((p) => p.id === PLACE.heroes);
  const rise = layout.places.find((p) => p.id === PLACE.philosophers);
  if (!heroes || !rise) return null;
  const hy = (x: number): number => Math.round(pathYAt(layout.path, x));
  const figures: Record<string, Vec> = {};
  // The heroes (IV 121–129): Hector beside Aeneas above the way, Camilla on the other side, Saladin alone, apart, at the far edge.
  const hx = heroes.x + heroes.w * 0.42;
  figures.HECTOR = { x: Math.round(hx), y: hy(hx) - 38 };
  figures.AENEAS = { x: Math.round(hx + 34), y: hy(hx + 34) - 44 };
  figures.CAMILLA = { x: Math.round(hx + 20), y: hy(hx + 20) + 40 };
  figures.SALADIN = { x: Math.round(heroes.x + heroes.w - 14), y: Math.max(heroes.y + 4, hy(heroes.x + heroes.w) - 70) };
  // Electra among her company at the near side, Caesar in arms below the way, watching (silent: they are only seen).
  figures.ELECTRA = { x: Math.round(heroes.x + 20), y: hy(heroes.x + 20) - 40 };
  figures.CAESAR = { x: Math.round(heroes.x + 30), y: hy(heroes.x + 30) + 38 };
  // The philosophic family on the rise, below the way: the master in the middle of a ring, Socrates and Plato nearest him.
  const c = { x: Math.round(rise.x + rise.w * 0.58), y: Math.round(rise.y + rise.h * 0.72) };
  const ring = (deg: number): Vec => ({ x: Math.round(c.x + 62 * Math.cos((deg * Math.PI) / 180)), y: Math.round(c.y + 28 * Math.sin((deg * Math.PI) / 180)) });
  figures.ARISTOTLE = c;
  figures.SOCRATES = ring(215);
  figures.PLATO = ring(325);
  figures.ORPHEUS = ring(160);
  figures.AVICENNA = ring(90);
  figures.AVERROES = ring(20);
  // A hedge beyond the rise, above and below it: the way on to the inner gate crosses the rise.
  const hedgeX = rise.x + rise.w + 4;
  const hedge: Rect[] = [
    { x: hedgeX, y: 0, w: 12, h: rise.y },
    { x: hedgeX, y: rise.y + rise.h, w: 12, h: Math.max(1, layout.height - (rise.y + rise.h)) },
  ];
  return { figures, hedge };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type CompanyMode = 'hidden' | 'arrive' | 'front' | 'ring' | 'walk' | 'opening' | 'gate' | 'leave';

interface Inf04State {
  /** Where Virgil stands at the brink. */
  readonly brinkSpot: Vec;
  /** The forest's edge nearest the light (where the reveal shows the seated shades). */
  readonly forestEdge: Vec;
  readonly drop: Drop | null;
  /** Opens the passage at the head of the path (Virgil steps out of it). */
  openPassage: (() => void) | null;
  readonly balloons: EmptyBalloons | null;
  /** The places as the layout drew them (the tracker holds them as bands across the level). */
  readonly rects: ReadonlyMap<string, Rect>;
  company: CompanyMode;
}

const states = new WeakMap<object, Inf04State>();

function stateOf(level: LevelRuntime): Inf04State | null {
  return states.get(level) ?? null;
}

// ---------------------------------------------------------------------------
// Mechanics of the canto (visual only)
// ---------------------------------------------------------------------------

/** The sighs of the plain (IV 26–27): air trembling over a seated shade, passing to its neighbours. */
class Sighs extends BaseMechanic {
  private untilNext = 1500;
  private readonly rnd = seededRandom(hashString('inf04:sighs'));

  constructor(
    ctx: MechanicContext,
    private readonly shades: readonly Npc[],
  ) {
    super('sighs', ctx, 'sighs');
  }

  protected override step(dt: number): void {
    this.untilNext -= dt;
    if (this.untilNext > 0) return;
    this.untilNext = 2200 + this.rnd() * 1800;
    const p = this.player;
    const near = this.shades.filter((n) => n.actor.sprite.visible && dist(n.x, n.y, p.x, p.y) < 170);
    if (near.length === 0) return;
    const s = near[Math.floor(this.rnd() * near.length)] as Npc;
    waveRing(this.scene, s.x, s.y - 12, { color: 0xd8d4c8, radius: 16, ms: 1000, alpha: 0.35 });
    const others = near
      .filter((n) => n !== s)
      .sort((a, b) => dist(a.x, a.y, s.x, s.y) - dist(b.x, b.y, s.x, s.y))
      .slice(0, 2);
    others.forEach((o, i) => {
      this.scene.time.delayedCall(260 * (i + 1), () => {
        if (!this.destroyed) waveRing(this.scene, o.x, o.y - 12, { color: 0xd8d4c8, radius: 11, ms: 800, alpha: 0.25 });
      });
    });
  }
}

interface Balloon {
  readonly g: Phaser.GameObjects.Graphics;
  readonly at: () => Vec | null;
  age: number;
  readonly life: number;
}

/**
 * IV 104: "Things saying 'tis becoming to keep silent". Over the poets'
 * heads balloons open and close while they walk, and every one is empty;
 * E beside a poet opens Dante's balloon, empty too, and the poet's answer.
 */
class EmptyBalloons extends BaseMechanic {
  /** The poets are talking among themselves (s5). */
  talking = false;
  private untilNext = 900;
  private last = -1;
  private readonly list: Balloon[] = [];
  private answers: Interactable[] = [];
  private readonly rnd = seededRandom(hashString('inf04:balloons'));

  constructor(
    ctx: MechanicContext,
    private readonly speakers: () => readonly Npc[],
  ) {
    super('balloons', ctx, 'balloons');
  }

  /** An empty balloon over someone's head (follows them), for `life` ms. */
  show(at: () => Vec | null, life = 1700): void {
    const g = this.own(this.scene.add.graphics().setDepth(DEPTH.fx + 1));
    g.setAlpha(0);
    drawBalloon(g);
    this.list.push({ g, at, age: 0, life });
  }

  /** E beside a poet answers with empty balloons (until `silence`). */
  answer(): void {
    const w = this.w;
    if (!w || this.answers.length > 0) return;
    this.speakers().forEach((npc, k) => {
      const it = w.addInteractable({
        id: `inf04-poet-${k}`,
        x: npc.x,
        y: npc.y,
        radius: 22,
        onInteract: () => {
          if (!npc.actor.sprite.visible) return;
          w.dante.actor.faceToward(npc.x, npc.y);
          this.show(() => ({ x: this.player.x, y: this.player.y }), 1300);
          this.scene.time.delayedCall(700, () => {
            if (!this.destroyed && npc.actor.sprite.visible) this.show(() => (npc.actor.sprite.visible ? { x: npc.x, y: npc.y } : null), 1400);
          });
        },
      });
      this.answers.push(it);
    });
  }

  /** From the castle on they are silent. */
  silence(): void {
    this.talking = false;
    for (const it of this.answers) this.w?.removeInteractable(it.id);
    this.answers = [];
  }

  protected override step(dt: number): void {
    const poets = this.speakers();
    if (this.talking) {
      this.untilNext -= dt;
      if (this.untilNext <= 0) {
        this.untilNext = 1100 + this.rnd() * 1500;
        const shown = poets.filter((n) => n.actor.sprite.visible);
        if (shown.length > 0) {
          let k = Math.floor(this.rnd() * shown.length);
          if (k === this.last && shown.length > 1) k = (k + 1) % shown.length;
          this.last = k;
          const npc = shown[k] as Npc;
          this.show(() => (npc.actor.sprite.visible ? { x: npc.x, y: npc.y } : null), 1300 + this.rnd() * 900);
        }
      }
    }
    // The answer prompts follow the poets as they walk.
    if (this.answers.length > 0) {
      poets.forEach((npc, k) => {
        const it = this.answers[k];
        if (!it) return;
        it.x = npc.x;
        it.y = npc.y;
        it.enabled = npc.actor.sprite.visible;
      });
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i] as Balloon;
      b.age += dt;
      const at = b.at();
      if (!at || b.age >= b.life || !b.g.active) {
        if (b.g.active) b.g.destroy();
        this.list.splice(i, 1);
        continue;
      }
      const fadeIn = Math.min(1, b.age / 160);
      const fadeOut = Math.min(1, (b.life - b.age) / 260);
      b.g.setAlpha(Math.min(fadeIn, fadeOut));
      b.g.setPosition(Math.round(at.x), Math.round(at.y - 38));
    }
  }

  override destroy(): void {
    this.silence();
    super.destroy();
  }
}

/** A small speech balloon with nothing in it (drawn about its tail's tip at 0, 0). */
function drawBalloon(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(0xf4ecd8, 0.92);
  g.lineStyle(1, 0x3a3226, 0.9);
  g.fillRoundedRect(-9, -11, 18, 10, 3);
  g.strokeRoundedRect(-9, -11, 18, 10, 3);
  g.fillTriangle(-2, -2, 2, -2, 0, 2);
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

/** The black drop below the rim, its rock lip and a few ledges falling away into the dark. */
function drawDrop(ctx: LevelBuildContext, drop: Drop, height: number): void {
  const scene = ctx.scene;
  const rnd = seededRandom(hashString('inf04:drop'));
  const lip: Vec[] = [];
  for (const col of drop.solids) {
    lip.push({ x: col.x, y: col.y - 1 + Math.round(rnd() * 2) });
    lip.push({ x: col.x + col.w / 2, y: col.y + Math.round(rnd() * 2) });
  }
  const last = drop.solids[drop.solids.length - 1];
  if (last) lip.push({ x: last.x + last.w, y: last.y });
  const g = scene.add.graphics().setDepth(DEPTH.groundDecor + 1);
  g.fillStyle(0x040506, 1);
  g.beginPath();
  g.moveTo(drop.x0, height);
  for (const p of lip) g.lineTo(p.x, p.y);
  g.lineTo(drop.x1, height);
  g.closePath();
  g.fillPath();
  // The rock's lip, and the first fall of the rock below it.
  g.lineStyle(3, 0x161a1b, 1);
  g.beginPath();
  lip.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y + 3) : g.lineTo(p.x, p.y + 3)));
  g.strokePath();
  g.lineStyle(2, 0x56604f, 0.95);
  g.beginPath();
  lip.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  g.strokePath();
  for (let i = 0; i < 26; i++) {
    const x = drop.x0 + 6 + rnd() * (drop.x1 - drop.x0 - 12);
    const top = rimAt(drop, x);
    if (top === null) continue;
    const y = top + 10 + rnd() * 70;
    g.lineStyle(1, 0x1b2022, 0.5 + rnd() * 0.3);
    g.lineBetween(x, y, x + 5 + rnd() * 16, y + rnd() * 3);
  }
  for (const s of drop.solids) ctx.addSolid(s);
  // Decoration that fell inside the drop goes (props stand on their base point).
  for (const obj of [...scene.children.list]) {
    const o = obj as unknown as { type?: string; x: number; y: number; texture?: { key: string }; setVisible?: (v: boolean) => unknown };
    if (o.type !== 'Image' || !o.texture?.key.startsWith('prop-')) continue;
    const top = rimAt(drop, o.x);
    if (top !== null && o.y > top - 2) o.setVisible?.(false);
  }
}

/** A row of trees (with a solid hedge under them) closing the meadow above and below the rise. */
function plantHedge(ctx: LevelBuildContext, hedge: readonly Rect[]): void {
  for (const h of hedge) {
    ctx.addSolid(h);
    for (let y = h.y + 10; y <= h.y + h.h; y += 15) placeProp(ctx, 'tree', h.x + 6, y);
  }
}

function buildInf04(ctx: LevelBuildContext, layout: GenericLayout): void {
  const w = ext(ctx);
  if (!w) return;
  const rnd = seededRandom(hashString('inf04:shades'));
  const bounds = { top: 24, bottom: layout.height - 8 };
  const placeRect = (id: string): Rect | null => {
    const p = ctx.place(id);
    return p ? { x: p.x, y: p.y, w: p.w, h: p.h } : null;
  };

  // A walk he has already made is not walked again: a later play beat whose place he has crossed leaves him where he is.
  w.setKeepAhead(true);

  // The abysmal valley below the brink, and the narrow head of the path where Virgil stands.
  const drop = planDrop(layout);
  if (drop) drawDrop(ctx, drop, layout.height);
  const gate = drop ? planBrinkGate(layout, drop) : null;
  let openPassage: (() => void) | null = null;
  if (gate) {
    ctx.addSolid(gate.spur);
    for (let y = gate.spur.y + gate.spur.h; y > 30; y -= 13) placeProp(ctx, 'rock_big', gate.spur.x + gate.spur.w / 2 + ((y / 13) % 2 === 0 ? -3 : 3), y);
    openPassage = w.addSolid(gate.block);
  }

  let n = 0;
  const spawn = (x: number, y: number, scale = 1): Npc => {
    n += 1;
    const npc = w.spawnActor({ id: `inf04-shade-${n}`, speaker: 'SHADE', texture: 'npc-shade', x: Math.round(x), y: Math.round(y), facing: 'up' });
    if (scale !== 1) npc.actor.sprite.setScale(scale);
    return npc;
  };
  // Seated shades on the plain of sighs and around the hollow, off the path, faces raised.
  const seated: Npc[] = [];
  const seat = (id: string, count: number, children: number): void => {
    const r = placeRect(id);
    if (!r) return;
    for (let i = 0; i < count; i++) {
      const x = r.x + 12 + rnd() * (r.w - 24);
      const side = rnd() < 0.5 ? -1 : 1;
      const y = Math.max(bounds.top, Math.min(bounds.bottom, pathYAt(layout.path, x) + side * (30 + rnd() * 44)));
      seated.push(spawn(x, y, i < children ? 0.72 : 1));
    }
  };
  seat(PLACE.sighs, 9, 0);
  seat(PLACE.hollow, 8, 5);
  ctx.addMechanic(new Sighs({ level: ctx }, seated));
  // E beside one of the nearest: it does not turn; Dante looks up where it looks, and finds nothing (s2.b1).
  const sighs = placeRect(PLACE.sighs);
  if (sighs) {
    const c = rectCenter(sighs);
    seated
      .filter((s) => s.x >= sighs.x && s.x <= sighs.x + sighs.w)
      .sort((a, b) => dist(a.x, a.y, c.x, pathYAt(layout.path, a.x)) - dist(b.x, b.y, c.x, pathYAt(layout.path, b.x)))
      .slice(0, 3)
      .forEach((s, i) => {
        w.addInteractable({
          id: `inf04-sigh-${i}`,
          x: s.x,
          y: s.y + 4,
          radius: 18,
          onInteract: () => void lookUpWith(ctx, s),
        });
      });
  }
  // The forest of ghosts: standing shades as thick as trunks, on the way and around it.
  const forest = placeBands(layout)[layout.places.findIndex((p) => p.id === PLACE.forest)] ?? null;
  const forestPlace = placeRect(PLACE.forest);
  if (forest && forestPlace) {
    for (let i = 0; i < 20; i++) {
      const x = forest.x + 20 + rnd() * (forest.w - 40);
      const y = Math.max(bounds.top, Math.min(bounds.bottom, pathYAt(layout.path, x) + (rnd() - 0.5) * 84));
      spawn(x, y);
    }
    ctx.createMechanic('hub', {
      id: 'forest',
      part: true,
      partForVirgil: true,
      crowd: ['SHADE'],
      partRadius: 26,
      area: forest,
      strayDistance: 48,
      straySlow: 0.6,
    });
  }

  // The meadow (s7): the great spirits where the poem sees them, the philosophers silent until Dante has climbed the rise.
  const meadow = planMeadow(layout);
  if (meadow) {
    for (const [speaker, at] of Object.entries(meadow.figures)) {
      const npc = w.npcOf(speaker);
      if (npc) npc.actor.teleport(at.x, at.y);
    }
    for (const s of PHILOSOPHERS) {
      const npc = w.npcOf(s);
      if (npc) npc.talkable = false;
    }
    plantHedge(ctx, meadow.hedge);
  }
  // A little of each one's colour, so the eye can tell them apart (one drawing serves them all).
  const tints: Readonly<Record<string, number>> = {
    HECTOR: 0xe8c9a0,
    AENEAS: 0xc8d4e8,
    CAMILLA: 0xd8e8c8,
    SALADIN: 0xe8dcb0,
    ARISTOTLE: 0xfff4d8,
    SOCRATES: 0xe0d0c0,
    PLATO: 0xd0d8f0,
    ORPHEUS: 0xf0d0d8,
    AVICENNA: 0xd8f0e0,
    AVERROES: 0xf0e0c0,
  };
  for (const [speaker, tint] of Object.entries(tints)) w.npcOf(speaker)?.actor.sprite.setTint(tint);

  // The four poets wait out of sight until they come from the castle (s4.b1).
  for (const s of POETS) w.npcOf(s)?.setVisible(false);
  const balloons = ctx.addMechanic(new EmptyBalloons({ level: ctx }, () => POETS.map((s) => w.npcOf(s)).filter((x): x is Npc => x !== null)));

  const brink = placeRect(PLACE.brink);
  const brinkX = brink ? brink.x + brink.w - 26 : ctx.player.x + 80;
  states.set(ctx, {
    brinkSpot: gate ? gate.spot : { x: brinkX, y: Math.round(pathYAt(layout.path, brinkX)) - 4 },
    forestEdge: forest ? { x: forest.x + forest.w - 10, y: Math.round(pathYAt(layout.path, forest.x + forest.w - 10)) } : { x: ctx.player.x, y: ctx.player.y },
    drop,
    openPassage,
    balloons,
    rects: new Map(layout.places.map((p) => [p.id, { x: p.x, y: p.y, w: p.w, h: p.h }])),
    company: 'hidden',
  });
  // Every place is a band across the whole height of the level: the way runs through each of them, so
  // no beat can be passed by going round its place (which would leave the beats before it unplayed).
  for (const p of layout.places) ctx.addPlace(placeBand(p, layout.height));
}

// ---------------------------------------------------------------------------
// The brink (s1)
// ---------------------------------------------------------------------------

/** s1.b2 DO[0]: Virgil at the rim of the drop, head bowed over the valley; he does not move. */
function virgilAtTheBrink(ctx: BeatHookContext): void {
  const st = stateOf(ctx.level);
  const w = ext(ctx.level);
  if (!st || !w) return;
  if (!w.companion.visible) w.showVirgil(true, true);
  virgilHolds(ctx.level);
  const a = w.companion.actor;
  a.teleport(st.brinkSpot.x, st.brinkSpot.y);
  a.poseLocked = false;
  a.face('down');
  if (a.pose('bow')) a.poseLocked = true;
}

/** Virgil steps out of the passage at the head of the path: the way down is open. */
function openThePassage(level: LevelRuntime): void {
  const st = stateOf(level);
  if (!st?.openPassage) return;
  st.openPassage();
  st.openPassage = null;
}

/** s4.b3: the four close about Dante; Virgil stands outside the ring, a step behind (IV 100–102). */
function virgilOutsideTheRing(level: LevelRuntime): void {
  const w = ext(level);
  if (!w) return;
  virgilHolds(level);
  const p = level.player;
  const spot = w.freeSpot(p.x - 34, p.y + 6);
  const a = w.companion.actor;
  a.poseLocked = false;
  void a.moveTo(spot.x, spot.y, { speed: 50, signal: w.levelSignal }).then(() => a.faceToward(p.x + 40, p.y));
}

/** s1.b3: Virgil turns to Dante. */
function virgilTurns(ctx: BeatHookContext): void {
  openThePassage(ctx.level);
  const w = ext(ctx.level);
  if (!w) return;
  const a = w.companion.actor;
  a.poseLocked = false;
  a.faceToward(ctx.level.player.x, ctx.level.player.y);
}

/** s1.b2 DO[2]: at the rim, pressing on toward the drop: he leans out and looks down into the dark. */
function lookingDown(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  const drop = st?.drop ?? null;
  if (!w || !drop || ctx.autoplay) return;
  const signal = levelSignal(ctx);
  let held = 0;
  let touched = false;
  let last = w.now();
  void until(
    level,
    () => {
      const t = w.now();
      const dt = Math.min(100, Math.max(0, t - last));
      last = t;
      const p = level.player;
      const top = rimAt(drop, p.x);
      const atRim = top !== null && p.y >= top - 6;
      if (atRim && !touched && w.playable()) {
        // The first time he reaches the rim, the view dips toward the valley.
        touched = true;
        void level.camera.panTo(p.x, p.y + 40, 500).then(() => {
          if (!signal.aborted && held < LOOK_DOWN_MS) level.camera.follow(level.player);
        });
      }
      const input = w.input();
      const down = input.moveY > 0.5 && Math.abs(input.moveX) < 0.6;
      held = down && atRim ? held + dt : Math.max(0, held - dt / 2);
      return held >= LOOK_DOWN_MS;
    },
    240_000,
    signal,
  ).then(async (ok) => {
    if (!ok || signal.aborted) return;
    w.emitOnce(EV.lookedDown);
    const unlock = w.lock('look-down');
    try {
      w.dante.actor.face('down');
      const p = level.player;
      await level.camera.panTo(p.x, p.y + 100, 900);
      await level.wait(1600, signal);
    } finally {
      unlock();
      if (!signal.aborted) level.camera.follow(level.player);
    }
  });
}

// ---------------------------------------------------------------------------
// The plain of sighs (s2)
// ---------------------------------------------------------------------------

/** E beside a seated shade: it does not turn; Dante looks up where it looks, at the empty grey. */
async function lookUpWith(level: LevelRuntime, shade: Npc): Promise<void> {
  const w = ext(level);
  if (!w || !w.playable()) return;
  const signal = w.levelSignal;
  waveRing(level.scene, shade.x, shade.y - 12, { color: 0xd8d4c8, radius: 14, ms: 900, alpha: 0.4 });
  w.dante.actor.face('up');
  const unlock = w.lock('look-up');
  try {
    const p = level.player;
    await level.camera.panTo(p.x, p.y - 80, 700);
    await level.wait(900, signal);
  } finally {
    unlock();
    if (!signal.aborted) level.camera.follow(level.player);
  }
}

// ---------------------------------------------------------------------------
// The light road (s5)
// ---------------------------------------------------------------------------

/** s5.b1 DO[4]: a Reveal verse on the light road draws back the dark at the forest's edge for a moment. */
function lightAtTheEdge(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = stateOf(level);
  const w = ext(level);
  if (!st || !w || ctx.autoplay) return;
  const signal = levelSignal(ctx);
  void verseNear(level, level.player, 100_000, ['Reveal'], 240_000, signal).then((ok) => {
    if (!ok || signal.aborted) return;
    const at = st.forestEdge;
    const col = lightColumn(level.scene, at.x, at.y, 0xfff0c0);
    waveRing(level.scene, at.x, at.y, { color: 0xfff0c0, radius: 90, ms: 1400, alpha: 0.4 });
    if (col) level.scene.tweens.add({ targets: col, alpha: 0, duration: 1800, delay: 600, onComplete: () => col.destroy() });
    w.emitOnce(EV.lightRead);
  });
}

/** s5.b1 DO[2]: the poets talk on the way, and their balloons are empty. */
function poetsTalk(ctx: BeatHookContext): void {
  const st = stateOf(ctx.level);
  if (st?.balloons && !ctx.autoplay) st.balloons.talking = true;
}

/** s5.b1 DO[3]: E beside a poet: Dante's balloon opens empty, and so does the poet's answer. */
function emptyAnswers(ctx: BeatHookContext): void {
  const st = stateOf(ctx.level);
  if (st?.balloons && !ctx.autoplay) st.balloons.answer();
}

// ---------------------------------------------------------------------------
// The company of poets (s4–s8)
// ---------------------------------------------------------------------------

/** Where each poet keeps while the six walk (relative to Dante; the road runs east): Homer ahead, the others a step behind. */
const WALK_SLOTS: readonly Vec[] = [
  { x: 40, y: -10 },
  { x: -30, y: -18 },
  { x: -32, y: 16 },
  { x: -56, y: -2 },
];
/** The half ring about Dante (IV 100–102); Virgil stays outside it, a step behind. */
const RING_SLOTS: readonly Vec[] = [
  { x: 34, y: -4 },
  { x: 22, y: -26 },
  { x: 22, y: 20 },
  { x: 4, y: 32 },
];

function poets(level: LevelRuntime): Npc[] {
  const w = ext(level);
  if (!w) return [];
  return POETS.map((s) => w.npcOf(s)).filter((n): n is Npc => n !== null);
}

/** Step an NPC toward a point (walking frames), catching up at once after a cut; idle and facing `face` on arrival. */
function stepToward(npc: Npc, tx: number, ty: number, dt: number, speed: number, face: Vec | null): void {
  const dx = tx - npc.x;
  const dy = ty - npc.y;
  const d = Math.hypot(dx, dy);
  if (d > 260) {
    npc.actor.setPosition(tx, ty);
    return;
  }
  if (d < 3) {
    if (npc.actor.sprite.anims.isPlaying) {
      npc.actor.playIdle();
      if (face) npc.actor.faceToward(face.x, face.y);
    }
    return;
  }
  const step = Math.min(d, (speed * (d > 70 ? 1.7 : 1) * dt) / 1000);
  npc.actor.setPosition(npc.x + (dx / d) * step, npc.y + (dy / d) * step);
  npc.actor.playWalk(dx, dy);
}

/**
 * The poets keep their slots about Dante (walking with him, or standing about
 * him). One Dante walks up to stops and waits for him, facing him, until he
 * moves on (so he can be spoken to: s5.b1).
 */
function keepAbout(level: LevelRuntime, slots: readonly Vec[], speed: number): void {
  poets(level).forEach((npc, k) => {
    const slot = slots[k] ?? { x: -20 * k, y: 0 };
    let waiting = false;
    npc.setVisible(true);
    npc.actor.stopWalk();
    npc.behaviour = (n, dt) => {
      const p = level.player;
      const d = dist(n.x, n.y, p.x, p.y);
      if (!waiting && d < 34) {
        waiting = true;
        n.actor.playIdle();
        n.actor.faceToward(p.x, p.y);
      } else if (waiting && d > 72) {
        waiting = false;
      }
      if (!waiting) stepToward(n, p.x + slot.x, p.y + slot.y, dt, speed, { x: p.x, y: p.y });
    };
  });
}

/** The poets go to fixed spots and stay there (the open height, the inner gate). */
function standAt(level: LevelRuntime, spots: readonly Vec[], speed: number): void {
  poets(level).forEach((npc, k) => {
    const spot = spots[k] ?? spots[0];
    if (!spot) return;
    npc.setVisible(true);
    npc.actor.stopWalk();
    npc.behaviour = (n, dt) => stepToward(n, spot.x, spot.y, dt, speed, { x: level.player.x, y: level.player.y });
  });
}

function placeSpots(level: LevelRuntime, id: string, dx = 0): Vec[] {
  const p = stateOf(level)?.rects.get(id) ?? level.place(id);
  if (!p) return [];
  const c = { x: p.x + p.w * 0.5 + dx, y: p.y + p.h * 0.5 };
  return [
    { x: c.x + 18, y: c.y - 22 },
    { x: c.x - 6, y: c.y - 30 },
    { x: c.x + 40, y: c.y - 30 },
    { x: c.x + 62, y: c.y - 18 },
  ].map((v) => ({ x: Math.round(v.x), y: Math.round(v.y) }));
}

function setCompany(level: LevelRuntime, mode: CompanyMode, autoplay = false): void {
  const st = stateOf(level);
  if (!st) return;
  const prev = st.company;
  st.company = mode;
  const list = poets(level);
  switch (mode) {
    case 'hidden':
      for (const n of list) {
        n.behaviour = null;
        n.actor.stopWalk();
        n.setVisible(false);
      }
      return;
    case 'arrive': {
      // From the castle's side, four tall figures walking toward them (IV 82–84).
      const p = level.player;
      list.forEach((n, k) => {
        n.behaviour = null;
        n.setVisible(true);
        const slot = RING_SLOTS[k] ?? { x: 30, y: 0 };
        const from = { x: p.x + 150 + k * 14, y: p.y + slot.y };
        const to = { x: p.x + 46 + Math.abs(slot.y) * 0.3, y: p.y + slot.y };
        if (autoplay || prev !== 'hidden') n.actor.teleport(to.x, to.y);
        else {
          n.actor.teleport(from.x, from.y);
          void n.actor.moveTo(to.x, to.y, { speed: 34 }).then(() => n.actor.faceToward(level.player.x, level.player.y));
        }
      });
      return;
    }
    case 'front': {
      const p = level.player;
      list.forEach((n, k) => {
        const slot = RING_SLOTS[k] ?? { x: 30, y: 0 };
        n.setVisible(true);
        n.behaviour = null;
        if (dist(n.x, n.y, p.x, p.y) > 120 || prev === 'hidden') n.actor.teleport(p.x + 46 + Math.abs(slot.y) * 0.3, p.y + slot.y);
        n.actor.faceToward(p.x, p.y);
      });
      return;
    }
    case 'ring':
      keepAbout(level, RING_SLOTS, 40);
      return;
    case 'walk':
      keepAbout(level, WALK_SLOTS, 72);
      return;
    case 'opening':
      standAt(level, placeSpots(level, PLACE.opening, 40), 60);
      return;
    case 'gate':
      standAt(level, placeSpots(level, PLACE.meadowGate, -10), 64);
      return;
    case 'leave': {
      // They turn and walk back toward the castle, and are gone.
      const signal = ext(level)?.levelSignal;
      list.forEach((n, k) => {
        n.behaviour = null;
        n.setVisible(true);
        const to = { x: n.x - 150 - k * 10, y: n.y + (k % 2 === 0 ? -6 : 6) };
        void n.actor.moveTo(to.x, to.y, { speed: 40, signal }).then(() => {
          if (stateOf(level)?.company === 'leave') n.setVisible(false);
        });
      });
      return;
    }
  }
}

/** s8.b1: at the castle gate the four stand a step behind; then they go back (DO[1]). */
function poetsAtTheCastleGate(ctx: BeatHookContext): void {
  const level = ctx.level;
  const p = level.player;
  poets(level).forEach((n, k) => {
    n.behaviour = null;
    n.setVisible(true);
    n.actor.teleport(p.x - 40 - k * 16, p.y + (k % 2 === 0 ? -10 : 10));
    n.actor.faceToward(p.x, p.y);
  });
  const st = stateOf(level);
  if (st) st.company = 'front';
}

// ---------------------------------------------------------------------------
// The meadow (s7)
// ---------------------------------------------------------------------------

/** s7.b5: Dante stops a few steps from Saladin, and does not go nearer (IV 129). */
function aFewStepsAway(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  const saladin = w?.npcOf('SALADIN');
  if (!w || !saladin) return;
  const p = level.player;
  const d = dist(p.x, p.y, saladin.x, saladin.y);
  if (d >= 30) return;
  const k = 34 / Math.max(1, d);
  const spot = w.freeSpot(saladin.x + (p.x - saladin.x) * k - (d < 1 ? 34 : 0), saladin.y + (p.y - saladin.y) * k + 6);
  if (ctx.autoplay) w.dante.actor.teleport(spot.x, spot.y);
  else void w.dante.actor.moveTo(spot.x, spot.y, { speed: 40, signal: ctx.signal }).then(() => w.dante.actor.faceToward(saladin.x, saladin.y));
}

/** s7.b6: once Dante has climbed the rise and Virgil has named them, the philosophers answer. */
function philosophersAnswer(level: LevelRuntime): void {
  const w = ext(level);
  if (!w) return;
  for (const s of PHILOSOPHERS) {
    const npc = w.npcOf(s);
    if (npc) npc.talkable = true;
  }
}

// ---------------------------------------------------------------------------
// Staging (also after jumps and continues)
// ---------------------------------------------------------------------------

function stage(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  const st = stateOf(level);
  if (!w || !st) return;
  const i = beatIndex(ctx, ctx.beat.id);
  const at = (id: string): number => beatIndex(ctx, id);
  // Virgil stands still at the brink until Dante speaks to him (from the opening page on: he is there when Dante wakes);
  // while the poets stand about Dante he waits outside their ring, a step behind (s4.b3–b4); else he walks with Dante.
  if (i > at('inf04.s1.b2')) openThePassage(level);
  if (i <= at('inf04.s1.b2')) {
    if (w.companion.mode !== 'hold') virgilAtTheBrink(ctx);
  } else if (i >= at('inf04.s4.b3') && i < at('inf04.s5.b1')) {
    if (w.companion.mode !== 'hold') virgilOutsideTheRing(level);
  } else if (i > at('inf04.s1.b3') && w.companion.mode === 'hold') {
    w.companion.actor.poseLocked = false;
    virgilFollows(level);
  }
  // The philosophers answer once the rise has been climbed.
  if (i > at('inf04.s7.b6')) philosophersAnswer(level);
  // On the light road the poets talk; before it and from the castle on they are silent.
  if (i < at('inf04.s5.b1') || i >= at('inf04.s6.b1')) st.balloons?.silence();
  // The company of poets: where they are at each beat (their own moves happen inside the beats).
  let mode: CompanyMode | null;
  if (i < at('inf04.s4.b1')) mode = 'hidden';
  else if (i === at('inf04.s4.b1')) mode = 'arrive';
  else if (i === at('inf04.s4.b2')) mode = 'front';
  else if (i < at('inf04.s5.b1')) mode = 'ring';
  else if (i <= at('inf04.s6.b4')) mode = st.company === 'opening' ? 'opening' : 'walk';
  else if (i < at('inf04.s7.b6')) mode = 'opening';
  else if (i < at('inf04.s8.b1')) mode = 'gate';
  else if (i === at('inf04.s8.b1')) mode = null;
  else mode = st.company === 'leave' ? null : 'hidden';
  if (i === at('inf04.s8.b1')) poetsAtTheCastleGate(ctx);
  else if (mode && mode !== st.company) setCompany(level, mode, ctx.autoplay);
}

export function createInf04Level() {
  return storyLevel({
    id: 'inf04',
    emits: [EV.lookedDown, EV.lightRead, EV.steppedOnWater],
    overrides: { walk_on_water: { event: EV.steppedOnWater } },
    build: buildInf04,
    everyBeat: stage,
    hooks: {
      'inf04.s1.b2': hooks(onDo(0, virgilAtTheBrink), onDo(2, lookingDown)),
      'inf04.s1.b3': hooks(onStart(virgilTurns), onDo(2, (ctx) => virgilFollows(ctx.level))),
      // After "Try it." the company sets out: Virgil leads on to the light road while the poets keep about Dante.
      'inf04.s4.b4': onEnd((ctx) => {
        const w = ext(ctx.level);
        if (w && w.companion.mode === 'hold') virgilFollows(ctx.level);
      }),
      'inf04.s5.b1': hooks(onDo(2, poetsTalk), onDo(3, emptyAnswers), onDo(4, lightAtTheEdge)),
      'inf04.s6.b4': onDo(2, (ctx) => setCompany(ctx.level, 'opening', ctx.autoplay)),
      'inf04.s7.b5': onStart(aFewStepsAway),
      'inf04.s7.b6': onDo(2, (ctx) => philosophersAnswer(ctx.level)),
      'inf04.s8.b1': onDo(1, (ctx) => setCompany(ctx.level, 'leave', ctx.autoplay)),
    },
  });
}
