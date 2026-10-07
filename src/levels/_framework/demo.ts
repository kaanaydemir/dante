/**
 * The demo level of the engine fixture (canto `inf99`, tests/fixtures/
 * test-canto.md): the generic layout plus a hand-made layer that shows how a
 * per-canto level uses the mechanics library and beat hooks.
 *
 * - The test wood is dark (darkness) with a fear hollow on the way.
 * - In the clearing, holding R looks back at the pass (look_back ->
 *   `inf99.looked_back`, an optional beat).
 * - On the ascent the panther keeps between Dante and the glade (chase,
 *   block mode) while the dawn comes down the hill; standing still for eight
 *   seconds brings it sooner (`inf99.waited_dawn`); when the light reaches
 *   her she goes (`inf99.panther_gone`). Slipping past her ends it too.
 * - On the road, a fallen branch: a Force verse sweeps it aside.
 *
 * Every moment ends by itself: the dawn comes after at most 20 seconds.
 *
 * Owner: team D (levels framework). Registered for `inf99` by the registry
 * unless a level in src/levels/inf99/ replaces it.
 */

import { DEPTH, paletteFor } from '../../config';
import type { LevelBuildContext, LevelModule, LevelRuntime } from '../../runtime/contracts';
import type { Chase } from '../../mechanics/chase';
import { worldExtras } from '../../world/extras';
import { dist, rectCenter } from '../../world/geometry';
import { buildGenericInto, emptyLevel } from './generic';
import { onDo, onDoEvent, stillFor, until } from './kit';
import { placeBands } from './ambient';
import { planGenericLevel } from './layout';

export const DEMO_EVENTS = ['inf99.looked_back', 'inf99.waited_dawn', 'inf99.panther_gone'] as const;

/** The dawn reaches the panther after this long, or sooner if Dante waits. */
const DAWN_MS = 20_000;
const WAIT_MS = 8_000;

function buildDemo(ctx: LevelBuildContext): void {
  const script = ctx.script;
  if (!script) {
    void emptyLevel('inf99').build(ctx);
    return;
  }
  const layout = planGenericLevel(script);
  buildGenericInto(ctx, layout, { ambient: false });
  const bands = placeBands(layout);
  const woodIndex = layout.places.findIndex((p) => p.id === 'inf99_wood');
  const clearingIndex = layout.places.findIndex((p) => p.id === 'inf99_clearing');

  // The dark wood, lighter in the clearing.
  const zones = [];
  if (woodIndex >= 0) zones.push({ rect: bands[woodIndex]!, alpha: 0.8 });
  if (clearingIndex >= 0) zones.push({ rect: bands[clearingIndex]!, alpha: 0.45 });
  if (zones.length > 0) ctx.createMechanic('darkness', { zones, radius: 72, virgilGlow: 28 });

  // A fear hollow right on the way through the wood (it slows the reader, never fells him).
  const wood = ctx.place('inf99_wood');
  if (wood) {
    const c = rectCenter(wood);
    ctx.createMechanic('fear', { zones: [{ x: c.x + 20, y: c.y - 28, w: 56, h: 44 }], floor: 1 });
  }

  // Looking back at the pass from the clearing.
  if (ctx.place('inf99_clearing')) ctx.createMechanic('look_back', { event: 'inf99.looked_back', where: 'inf99_clearing', dir: 'left' });

  // The panther waits on the ascent, still until her beat starts.
  const glade = ctx.place('inf99_glade');
  const goal = glade ? { x: glade.x + glade.w / 2, y: glade.y + glade.h / 2 } : { x: layout.width - 64, y: layout.height / 2 };
  const ascent = ctx.place('inf99_ascent');
  const panther = ctx.createMechanic('chase', {
    mode: 'block',
    actor: 'PANTHER',
    goal,
    gap: 36,
    speed: 90,
    damage: 0.3,
    ...(ascent ? { area: { x: ascent.x - 40, y: ascent.y - 30, w: ascent.w + 140, h: ascent.h + 60 } } : {}),
  });
  if (panther) panther.enabled = false;
}

/** The dawn comes down the hill; the panther holds the way until it reaches her. Never blocks the story. */
function dawnOnTheAscent(level: LevelRuntime, signal: AbortSignal): void {
  const w = worldExtras(level);
  const panther = level.mechanic<Chase>('chase');
  if (panther) panther.enabled = true;
  const glade = level.place('inf99_glade');
  const scene = level.scene;
  // A broad golden light moving down the slope toward her.
  const light = scene.textures.exists('fx-glow')
    ? scene.add
        .image(glade ? glade.x + glade.w : level.player.x + 400, level.player.y - 40, 'fx-glow')
        .setDepth(DEPTH.weather)
        .setTint(level.palette.light)
        .setDisplaySize(260, 380)
        .setAlpha(0.22)
    : null;
  let waited = false;
  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    if (panther) {
      panther.stand();
      // She turns to the light and is gone up the slope.
      const npc = w?.npcOf('PANTHER');
      if (npc) {
        npc.actor.face('right');
        void npc.actor.moveTo(npc.x + 220, npc.y - 60, { speed: 110 }).then(() => npc.setVisible(false));
      }
    }
    if (light) scene.tweens.add({ targets: light, alpha: 0, duration: 1500, onComplete: () => light.destroy() });
    level.emit('inf99.panther_gone');
  };
  // Waiting eight seconds brings the dawn sooner (and is remembered).
  void stillFor(level, WAIT_MS, DAWN_MS, signal).then((still) => {
    if (still && !done) {
      waited = true;
      level.emit('inf99.waited_dawn');
      finish();
    }
  });
  // Slipping past her ends it as well.
  void until(
    level,
    () => {
      const p = level.player;
      const c = panther ? panther.position : null;
      if (light && c) light.x += (c.x - light.x) * 0.004;
      return glade !== null && dist(p.x, p.y, glade.x + glade.w / 2, glade.y + glade.h / 2) < glade.w / 2;
    },
    DAWN_MS,
    signal,
  ).then(() => {
    if (!waited && !signal.aborted) finish();
  });
}

/** A fallen branch on the road; a Force verse sweeps it aside (II s6's lesson in small). */
function branchOnTheRoad(level: LevelRuntime): void {
  const w = worldExtras(level);
  const scene = level.scene;
  if (!w || !scene.textures.exists('prop-branch')) return;
  const p = level.player;
  const x = p.x + 64;
  const y = p.y + 4;
  const branch = scene.add.image(x, y, 'prop-branch').setOrigin(0.5, 1).setDepth(DEPTH.actors + y / 10_000);
  const off = w.onVerse((cast) => {
    if (cast.category !== 'Force' || dist(cast.x, cast.y, x, y) > 120) return;
    off();
    scene.tweens.add({ targets: branch, x: x + 40, y: y + 30, angle: 70, alpha: 0, duration: 700, onComplete: () => branch.destroy() });
  });
}

export function createDemoLevel(): LevelModule {
  return {
    id: 'inf99',
    palette: paletteFor('inf99'),
    emits: DEMO_EVENTS,
    build: buildDemo,
    beatHooks: {
      'inf99.s2.b1': onDoEvent('inf99.panther_gone', (ctx) => {
        // The moment outlives the DO line (the runner waits for the event meanwhile): bind it to the level.
        const signal = worldExtras(ctx.level)?.levelSignal ?? ctx.signal;
        dawnOnTheAscent(ctx.level, signal);
      }),
      'inf99.s4.b2': onDo(1, (ctx) => branchOnTheRoad(ctx.level)),
    },
  };
}
