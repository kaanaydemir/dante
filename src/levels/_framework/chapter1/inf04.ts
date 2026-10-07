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
 *   s1.b2  Virgil stands at the brink, his back to Dante, head bowed; pressing
 *          on toward the drop for two seconds looks down     -> inf04.looked_down
 *   s2     the plain of sighs: seated shades, faces raised to the empty grey;
 *          each sigh makes the air above a shade tremble, and the trembling
 *          passes to its neighbours (no harm). E beside one: it does not turn
 *   s3.b1  the forest of ghosts: shades as thick as trunks make way for Virgil
 *          and close behind him; strayed far from him, Dante is slow to get through
 *   s5.b1  a Reveal verse on the light road pushes back the dark at the forest's
 *          edge for a moment                                 -> inf04.light_read
 *   s6.b2  the first step onto the stream                    -> inf04.stepped_on_water
 *
 * Owner: team D (levels framework, Chapter 1 moments).
 */

import type { BeatHookContext, LevelBuildContext, MechanicContext, Rect } from '../../../runtime/contracts';
import type { Npc } from '../../../entities/npc';
import { BaseMechanic } from '../../../mechanics/base';
import { lightColumn, waveRing } from '../../../mechanics/visuals';
import { dist, hashString, rectCenter, seededRandom, type Vec } from '../../../world/geometry';
import { placeBands } from '../ambient';
import type { GenericLayout } from '../layout';
import { hooks, onDo, until, verseNear } from '../kit';
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
} as const;

interface Inf04State {
  /** Where Virgil stands at the brink. */
  readonly brinkSpot: Vec;
  /** The forest's edge nearest the light (where the reveal shows the seated shades). */
  readonly forestEdge: Vec;
}

const states = new WeakMap<object, Inf04State>();

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

function buildInf04(ctx: LevelBuildContext, layout: GenericLayout): void {
  const w = ext(ctx);
  if (!w) return;
  const rnd = seededRandom(hashString('inf04:shades'));
  const bounds = { top: 24, bottom: layout.height - 8 };
  const placeRect = (id: string): Rect | null => {
    const p = ctx.place(id);
    return p ? { x: p.x, y: p.y, w: p.w, h: p.h } : null;
  };
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
          onInteract: () => {
            w.dante.actor.face('up');
          },
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
  const brink = placeRect(PLACE.brink);
  states.set(ctx, {
    brinkSpot: brink ? { x: brink.x + brink.w - 26, y: Math.round(pathYAt(layout.path, brink.x + brink.w - 26)) - 4 } : { x: ctx.player.x + 80, y: ctx.player.y },
    forestEdge: forest ? { x: forest.x + forest.w - 10, y: Math.round(pathYAt(layout.path, forest.x + forest.w - 10)) } : { x: ctx.player.x, y: ctx.player.y },
  });
}

/** s1.b2 DO[0]: Virgil at the edge of the drop, his back to Dante, head bowed; he does not move. */
function virgilAtTheBrink(ctx: BeatHookContext): void {
  const st = states.get(ctx.level);
  const w = ext(ctx.level);
  if (!st || !w) return;
  if (!w.companion.visible) w.showVirgil(true, true);
  virgilHolds(ctx.level, st.brinkSpot);
  w.companion.actor.face('right');
}

/** s1.b2 DO[2]: pressing on toward the drop for two seconds at the brink: he looks down into the dark. */
function lookingDown(ctx: BeatHookContext): void {
  const level = ctx.level;
  const w = ext(level);
  if (!w || ctx.autoplay) return;
  const signal = levelSignal(ctx);
  let held = 0;
  let last = w.now();
  void until(
    level,
    () => {
      const t = w.now();
      const dt = Math.min(100, Math.max(0, t - last));
      last = t;
      const input = w.input();
      // Straight down toward the drop, at the brink (walking on down the path is not looking down).
      const down = input.moveY > 0.5 && Math.abs(input.moveX) < 0.3;
      held = down && level.isPlayerIn(PLACE.brink) ? held + dt : Math.max(0, held - dt);
      return held >= 2000;
    },
    180_000,
    signal,
  ).then(async (ok) => {
    if (!ok || signal.aborted) return;
    w.emitOnce(EV.lookedDown);
    const p = level.player;
    await level.camera.panTo(p.x, p.y + 70, 700);
    await level.wait(1400, signal);
    if (!signal.aborted) level.camera.follow(level.player);
  });
}

/** s5.b1 DO[4]: a Reveal verse on the light road draws back the dark at the forest's edge for a moment. */
function lightAtTheEdge(ctx: BeatHookContext): void {
  const level = ctx.level;
  const st = states.get(level);
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

/** Staging (also after jumps and continues): Virgil stands still at the brink until Dante speaks to him. */
function stage(ctx: BeatHookContext): void {
  const w = ext(ctx.level);
  if (!w) return;
  const i = beatIndex(ctx, ctx.beat.id);
  // From the opening page on (the page hides the world), so he is already there when Dante wakes.
  if (i <= beatIndex(ctx, 'inf04.s1.b2') && w.companion.mode !== 'hold') virgilAtTheBrink(ctx);
  else if (i > beatIndex(ctx, 'inf04.s1.b3') && w.companion.mode === 'hold') virgilFollows(ctx.level);
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
      'inf04.s1.b3': onDo(2, (ctx) => virgilFollows(ctx.level)),
      'inf04.s5.b1': onDo(4, lightAtTheEdge),
    },
  });
}
