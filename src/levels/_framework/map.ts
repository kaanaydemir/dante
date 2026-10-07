/**
 * Map-building helpers for levels (the generic level and the per-canto levels
 * of the next phase): a ground tilemap in the canto's tileset, props standing
 * on the ground (y-sorted, optionally solid), and themed ground tiles.
 *
 *   const ground = buildGround(ctx, { cols, rows, tile: (c, r) => 'ground-0' });
 *   placeProp(ctx, 'tree', 120, 200, { solid: { x: 115, y: 194, w: 10, h: 6 } });
 *
 * Owner: team D (levels framework).
 */

import type * as Phaser from 'phaser';
import { DEPTH, TILE_SIZE, actorDepth } from '../../config';
import type { LevelBuildContext, Rect } from '../../runtime/contracts';
import { tileIndex, TILE_NAMES, type TileName } from '../../art/scenery';
import { ensureCantoTextures } from '../../art/textures';
import { seededRandom } from '../../world/geometry';
import type { PlaceTheme } from './layout';

export interface GroundOptions {
  readonly cols: number;
  readonly rows: number;
  /** The tile for a cell (null leaves it empty: the sky colour shows). */
  readonly tile: (col: number, row: number) => TileName | null;
  readonly depth?: number;
}

/** A ground layer of 16 x 16 tiles from `tileset-<canto>`. */
export function buildGround(ctx: LevelBuildContext, opts: GroundOptions): Phaser.Tilemaps.TilemapLayer | null {
  const scene = ctx.scene;
  const key = `tileset-${ctx.cantoId}`;
  ensureCantoTextures(scene, ctx.cantoId);
  if (!scene.textures.exists(key)) return null;
  const map = scene.make.tilemap({ tileWidth: TILE_SIZE, tileHeight: TILE_SIZE, width: opts.cols, height: opts.rows });
  const tileset = map.addTilesetImage(key, key, TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) return null;
  const layer = map.createBlankLayer('ground', tileset, 0, 0, opts.cols, opts.rows);
  if (!layer) return null;
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const name = opts.tile(c, r);
      if (name) layer.putTileAt(tileIndex(name), c, r);
    }
  }
  layer.setDepth(opts.depth ?? DEPTH.ground);
  return layer;
}

export interface PropOptions {
  readonly flip?: boolean;
  /** Impassable footprint (added to the level's solids). */
  readonly solid?: Rect | null;
  /** Flat props (grass, flowers) lie under everyone. */
  readonly flat?: boolean;
  readonly alpha?: number;
  readonly tint?: number;
}

/**
 * A prop standing with its base (bottom centre) at (x, y). `kind` is a palette
 * prop (`tree` -> `prop-tree-<canto>`) or a set piece texture (`prop-gate`).
 */
export function placeProp(ctx: LevelBuildContext, kind: string, x: number, y: number, opts: PropOptions = {}): Phaser.GameObjects.Image | null {
  const scene = ctx.scene;
  const candidates = kind.startsWith('prop-') ? [kind] : [`prop-${kind}-${ctx.cantoId}`, `prop-${kind}`];
  const key = candidates.find((k) => scene.textures.exists(k));
  if (!key) return null;
  const img = scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 1);
  img.setDepth(opts.flat ? DEPTH.groundDecor : actorDepth(y));
  if (opts.flip) img.setFlipX(true);
  if (opts.alpha !== undefined) img.setAlpha(opts.alpha);
  if (opts.tint !== undefined) img.setTint(opts.tint);
  if (opts.solid) ctx.addSolid(opts.solid);
  return img;
}

/** Ground tile for a themed cell (seeded variation). */
export function themeTile(theme: PlaceTheme, cantoId: string, rnd: () => number): TileName {
  const r = rnd();
  switch (theme) {
    case 'slope':
    case 'brink':
      return r < 0.45 ? 'slope-0' : r < 0.75 ? 'slope-1' : 'ground-2';
    case 'gate':
    case 'plain':
      return cantoId === 'inf03' ? (r < 0.7 ? 'ash-0' : 'ash-1') : r < 0.7 ? 'ground-0' : 'ground-2';
    case 'meadow':
    case 'castle':
      return r < 0.7 ? 'meadow-0' : 'meadow-1';
    case 'storm':
      return r < 0.7 ? 'storm-0' : 'storm-1';
    case 'court':
      return r < 0.85 ? 'floor-0' : 'storm-0';
    default:
      return r < 0.55 ? 'ground-0' : r < 0.72 ? 'ground-1' : r < 0.9 ? 'ground-2' : 'ground-3';
  }
}

/** Deterministic randomness for a level's decoration. */
export function levelRandom(seed: number): () => number {
  return seededRandom(seed);
}

export { TILE_NAMES };
