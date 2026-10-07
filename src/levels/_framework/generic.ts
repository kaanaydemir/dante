/**
 * The generic fallback level (docs/ENGINE.md §8.2): built from the canto
 * script when no hand-made LevelModule exists, so every script is playable.
 * Places run left to right along a path, themed by their ids, in the canto's
 * palette; talkable NPCs stand where their `talk:` beats happen; silent
 * figures (beasts, guardians, shades) dress the scenes that name them.
 * Generic levels emit no gameplay events: event triggers fall back to the
 * runner (ENGINE.md §5.3).
 *
 * Owner: team D (levels framework).
 */

import { DEPTH, TILE_SIZE, paletteFor } from '../../config';
import type { LevelBuildContext, LevelModule } from '../../runtime/contracts';
import type { CantoId, CantoScript } from '../../story/types';
import { distToPolyline, hashString, rectContains, seededRandom } from '../../world/geometry';
import { worldExtras } from '../../world/extras';
import { decorSolids, GENERIC, planDecor, planGenericLevel, themeAtX, type DecorItem, type GenericLayout } from './layout';
import { buildGround, placeProp, themeTile } from './map';
import type { TileName } from '../../art/scenery';

/** Decor drawn flat under everyone. */
const FLAT = new Set(['grass', 'flower']);

function placeDecor(ctx: LevelBuildContext, item: DecorItem): void {
  switch (item.kind) {
    case 'bench':
      worldExtras(ctx)?.placeBench(item.x, item.y);
      return;
    case 'gate':
      placeProp(ctx, 'prop-gate', item.x, item.y);
      return;
    case 'castle':
      placeProp(ctx, 'prop-castle', item.x, item.y);
      return;
    case 'pillar':
      placeProp(ctx, 'prop-pillar', item.x, item.y);
      return;
    case 'boat':
      placeProp(ctx, 'prop-boat', item.x, item.y);
      return;
    case 'banner': {
      const s = ctx.scene;
      if (!s.textures.exists('prop-banner')) return;
      const b = s.add.sprite(item.x, item.y, 'prop-banner', '0').setOrigin(0.5, 1).setDepth(DEPTH.actors + item.y / 10_000);
      if (s.anims.exists('prop-banner-wave')) b.play('prop-banner-wave');
      return;
    }
    default:
      placeProp(ctx, item.kind, item.x, item.y, { flip: item.flip, flat: FLAT.has(item.kind) });
  }
}

/** Gentle idle life for set-dressing figures: a crowd member mills about its spot. */
function millAbout(seed: number): (npc: import('../../entities/npc').Npc, dt: number) => void {
  const rnd = seededRandom(seed);
  let home: { x: number; y: number } | null = null;
  let waitMs = 600 + rnd() * 2400;
  return (npc, dt) => {
    home ??= { x: npc.x, y: npc.y };
    if (npc.actor.walking) return;
    waitMs -= dt;
    if (waitMs > 0) return;
    waitMs = 1500 + rnd() * 3500;
    const tx = home.x + (rnd() - 0.5) * 24;
    const ty = home.y + (rnd() - 0.5) * 10;
    void npc.actor.moveTo(tx, ty, { speed: 14 + rnd() * 10 });
  };
}

function buildGeneric(ctx: LevelBuildContext, layout: GenericLayout): void {
  const cantoId = ctx.cantoId;
  ctx.setBounds(layout.width, layout.height);
  const decor = planDecor(layout);
  const rnd = seededRandom(hashString(`${cantoId}:ground`));
  const cols = Math.ceil(layout.width / TILE_SIZE);
  const rows = Math.ceil(layout.height / TILE_SIZE);

  // Ground: theme tiles, the path, water with a bank on its upper edge.
  const water = decor.water.map((w) => w.rect);
  const inWater = (x: number, y: number): boolean => water.some((r) => rectContains(r, x, y));
  buildGround(ctx, {
    cols,
    rows,
    tile: (c, r): TileName => {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      if (inWater(x, y)) return inWater(x, y - TILE_SIZE) ? (rnd() < 0.5 ? 'water-0' : 'water-1') : 'shore-n';
      const d = distToPolyline(x, y, layout.path);
      if (d < 9) return rnd() < 0.6 ? 'path-0' : 'path-1';
      if (d < 17) {
        const above = distToPolyline(x, y + TILE_SIZE, layout.path) < d;
        return above ? 'path-edge-n' : 'path-edge-s';
      }
      return themeTile(themeAtX(layout, x), cantoId, rnd);
    },
  });

  // Animate the water (two frames).
  const ext = worldExtras(ctx);
  if (water.length > 0 && ext) {
    // Water shimmer: a few slow glints on the surface.
    for (const w of water) {
      for (let i = 0; i < Math.max(2, Math.round(w.w / 60)); i++) {
        const gx = w.x + rnd() * w.w;
        const gy = w.y + 10 + rnd() * Math.max(4, w.h - 14);
        const g = ctx.scene.add.image(gx, gy, 'fx-pixel').setDepth(DEPTH.groundDecor).setAlpha(0.35).setTint(0xcfe0ff);
        ctx.scene.tweens.add({ targets: g, alpha: 0.05, x: gx + 6, duration: 1400 + rnd() * 1200, yoyo: true, repeat: -1 });
      }
    }
  }

  for (const item of decor.items) placeDecor(ctx, item);
  for (const s of decorSolids(decor)) ctx.addSolid(s);
  for (const p of layout.places) ctx.addPlace(p);
  ctx.setStart(layout.start.x, layout.start.y);

  layout.npcs.forEach((n, i) => {
    ctx.addNpc({ speaker: n.speaker, x: n.x, y: n.y, talkable: n.talkable, facing: n.facing });
    if (n.crowd || (!n.talkable && ['SOUL', 'NEUTRAL', 'SHADE'].includes(n.speaker))) {
      const list = ext?.npcs() ?? [];
      const npc = list[list.length - 1];
      if (npc) npc.behaviour = millAbout(hashString(`${cantoId}:${n.speaker}:${i}`));
    }
  });

  // Weather for storm places (Canto V): wind streaks blowing across, purely visual.
  const stormPlaces = layout.places.filter((p) => layout.themes[p.id] === 'storm');
  if (stormPlaces.length > 0 && ctx.scene.textures.exists('fx-wind')) {
    const first = stormPlaces[0];
    const last = stormPlaces[stormPlaces.length - 1];
    if (first && last) {
      const x0 = first.x - GENERIC.gap;
      const x1 = last.x + last.w + GENERIC.gap;
      ctx.scene.add
        .particles(0, 0, 'fx-wind', {
          x: { min: x0, max: x1 },
          y: { min: 12, max: layout.height - 12 },
          speedX: { min: 160, max: 260 },
          speedY: { min: -10, max: 25 },
          lifespan: 1600,
          frequency: 45,
          alpha: { start: 0.45, end: 0 },
          tint: paletteFor(cantoId).accent2,
        })
        .setDepth(DEPTH.weather);
    }
  }
  // Limbo's meadow: slow golden motes near the fire.
  const meadow = layout.places.filter((p) => layout.themes[p.id] === 'meadow' || layout.themes[p.id] === 'castle');
  if (meadow.length > 0 && ctx.scene.textures.exists('fx-pixel')) {
    const first = meadow[0];
    const last = meadow[meadow.length - 1];
    if (first && last) {
      ctx.scene.add
        .particles(0, 0, 'fx-pixel', {
          x: { min: first.x - 40, max: last.x + last.w + 40 },
          y: { min: 30, max: layout.height - 30 },
          speedY: { min: -8, max: -2 },
          speedX: { min: -3, max: 3 },
          lifespan: 4200,
          frequency: 220,
          scale: 0.5,
          alpha: { start: 0.6, end: 0 },
          tint: paletteFor(cantoId).light,
        })
        .setDepth(DEPTH.weather);
    }
  }
}

/** The generic level for a script (pass a plan to reuse one already computed). */
export function createGenericLevel(script: CantoScript, plan?: GenericLayout): LevelModule {
  const layout = plan ?? planGenericLevel(script);
  return {
    id: `generic:${script.id}`,
    palette: paletteFor(script.id),
    emits: [],
    build: (ctx) => buildGeneric(ctx, layout),
  };
}

/** A canto with no script at all: a quiet strip of ground (the "still being written" page covers it). */
export function emptyLevel(cantoId: CantoId): LevelModule {
  return {
    id: `empty:${cantoId}`,
    palette: paletteFor(cantoId),
    emits: [],
    build: (ctx) => {
      ctx.setBounds(640, 360);
      buildGround(ctx, { cols: 40, rows: 23, tile: () => 'ground-0' });
      ctx.setStart(320, 200);
    },
  };
}
