/**
 * The art catalog: every texture the game generates at boot (as pure bitmaps)
 * and every animation built from them. textures.ts uploads the result.
 *
 * Texture keys (docs/ENGINE.md §8.3):
 *   dante, virgil                       characters (32 x 32 frames)
 *   npc-<speaker lowercase>             panther, lion, she_wolf, charon, minos (48 x 48),
 *                                       soul, shade, neutral, great_refusal, homer, horace, ovid,
 *                                       lucan, francesca, paolo; plus npc-lovers (the pair),
 *                                       npc-limbo_great[_f], npc-windsoul, npc-generic
 *   tileset-<canto>, tile-<canto>-<name> ground tiles per canto palette (16 x 16)
 *   prop-<name>-<canto>                 palette props (tree, rock, bush, reed …)
 *   prop-<name>                         set pieces: bench, gate, castle, pillar, stone, branch,
 *                                       boat, banner, key-e / key-r / key-j / key-q, num-2 … num-9
 *   vignette-<canto>, vignette-generic  96 x 64 engravings for the opening pages
 *   icon-<name>                         flame, drop, tear, pan, scale, card (16 x 16)
 *   fx-<name>                           light, glow, glint, ring, dust, shield, letters, hatch,
 *                                       fog, vignette, wind, shadow, arrow, pixel, birds, wasp
 *
 * Owner: team D (art). Pure: no Phaser.
 */

import { PALETTES, type CantoPalette } from '../config';
import { sheet, image, type AnimDef, type Bitmap } from './bitmap';
import { danteFrames, DANTE_PALETTE } from './figures/dante';
import { virgilFrames, VIRGIL_PALETTE } from './figures/virgil';
import { lionFrames, pantherFrames, wolfFrames, LION_PALETTE, PANTHER_PALETTE, WOLF_PALETTE } from './figures/beasts';
import {
  BANNER_PALETTE,
  BIRD_PALETTE,
  BOAT,
  BOAT_PALETTE,
  CHARON_PALETTE,
  GENERIC_PALETTE,
  GREAT_PALETTE,
  LOVERS_PALETTE,
  MINOS_PALETTE,
  NEUTRAL_PALETTE,
  POET_PALETTES,
  REFUSAL_PALETTE,
  SHADE_PALETTE,
  SOUL_PALETTE,
  WASP_PALETTE,
  WINDSOUL_PALETTE,
  bannerFrames,
  birdFrames,
  charonFrames,
  genericFrames,
  greatFrames,
  loverFrames,
  loversFrames,
  minosFrames,
  neutralFrames,
  poetFrames,
  refusalFrames,
  shadeSheetFrames,
  soulSheetFrames,
  waspFrames,
  windsoulFrames,
} from './figures/people';
import { fxBitmaps } from './fx';
import { iconBitmaps } from './icons';
import { propBitmaps, setPieceBitmaps, tilesetBitmap, TILE, TILE_NAMES } from './scenery';
import { vignetteBitmaps } from './vignettes';

/** Cantos with their own palette (the fixture uses the Dark Wood's). */
export const PALETTE_CANTOS: readonly string[] = ['inf01', 'inf02', 'inf03', 'inf04', 'inf05', 'inf99'];

export function paletteOf(cantoId: string): CantoPalette {
  return (PALETTES as Readonly<Record<string, CantoPalette>>)[cantoId] ?? PALETTES.inf01;
}

const DIRS = ['down', 'up', 'left', 'right'] as const;

function walkAnims(texture: string, dirs: readonly string[], fps = 8): AnimDef[] {
  return dirs.map((dir) => ({
    key: `${texture}-walk-${dir}`,
    texture,
    frames: [`${dir}-1`, `${dir}-0`, `${dir}-2`, `${dir}-0`],
    frameRate: fps,
    repeat: -1,
  }));
}

export interface ArtCatalog {
  readonly bitmaps: readonly Bitmap[];
  readonly anims: readonly AnimDef[];
}

/** Crops the frames of a tileset into single tile images (`tile-<canto>-<name>`). */
function tilesFromSheet(cantoId: string, ts: Bitmap): Bitmap[] {
  return ts.frames.map((f) => {
    const data = new Uint8ClampedArray(TILE * TILE * 4);
    for (let y = 0; y < TILE; y++) {
      const src = ((f.y + y) * ts.width + f.x) * 4;
      data.set(ts.data.subarray(src, src + TILE * 4), y * TILE * 4);
    }
    return { key: `tile-${cantoId}-${f.name}`, width: TILE, height: TILE, data, frames: [] };
  });
}

/** Everything that depends on one canto palette. */
export function cantoBitmaps(cantoId: string): Bitmap[] {
  const p = paletteOf(cantoId);
  const ts = tilesetBitmap(cantoId, p);
  return [ts, ...tilesFromSheet(cantoId, ts), ...propBitmaps(cantoId, p)];
}

export function buildCatalog(cantos: readonly string[] = PALETTE_CANTOS): ArtCatalog {
  const C = 32;
  const bitmaps: Bitmap[] = [
    sheet('dante', danteFrames(), C, C, DANTE_PALETTE),
    sheet('virgil', virgilFrames(), C, C, VIRGIL_PALETTE),
    sheet('npc-panther', pantherFrames(), C, C, PANTHER_PALETTE),
    sheet('npc-lion', lionFrames(), C, C, LION_PALETTE),
    sheet('npc-she_wolf', wolfFrames(), C, C, WOLF_PALETTE),
    sheet('npc-charon', charonFrames(), C, C, CHARON_PALETTE),
    sheet('npc-minos', minosFrames(), 48, 48, MINOS_PALETTE, 6),
    sheet('npc-soul', soulSheetFrames(), C, C, SOUL_PALETTE),
    sheet('npc-shade', shadeSheetFrames(), C, C, SHADE_PALETTE),
    sheet('npc-neutral', neutralFrames(), C, C, NEUTRAL_PALETTE),
    sheet('npc-great_refusal', refusalFrames(), C, C, REFUSAL_PALETTE),
    sheet('npc-limbo_great', greatFrames(false), C, C, GREAT_PALETTE),
    sheet('npc-limbo_great_f', greatFrames(true), C, C, GREAT_PALETTE),
    sheet('npc-homer', poetFrames(true), C, C, POET_PALETTES.homer),
    sheet('npc-horace', poetFrames(false), C, C, POET_PALETTES.horace),
    sheet('npc-ovid', poetFrames(false), C, C, POET_PALETTES.ovid),
    sheet('npc-lucan', poetFrames(false), C, C, POET_PALETTES.lucan),
    sheet('npc-lovers', loversFrames(), C, C, LOVERS_PALETTE),
    sheet('npc-francesca', loverFrames('francesca'), C, C, LOVERS_PALETTE),
    sheet('npc-paolo', loverFrames('paolo'), C, C, LOVERS_PALETTE),
    sheet('npc-windsoul', windsoulFrames(), 24, 12, WINDSOUL_PALETTE),
    sheet('npc-generic', genericFrames(), C, C, GENERIC_PALETTE),
    sheet('fx-birds', birdFrames(), 16, 8, BIRD_PALETTE),
    sheet('fx-wasp', waspFrames(), 8, 8, WASP_PALETTE),
    sheet('prop-banner', bannerFrames(), 16, 24, BANNER_PALETTE),
    image('prop-boat', BOAT, BOAT_PALETTE),
    ...setPieceBitmaps(),
    ...fxBitmaps(),
    ...iconBitmaps(),
    ...vignetteBitmaps(PALETTES.inf01.ink, PALETTES.inf01.paper),
  ];
  for (const id of cantos) bitmaps.push(...cantoBitmaps(id));

  const anims: AnimDef[] = [
    ...walkAnims('dante', DIRS),
    ...walkAnims('virgil', DIRS),
    ...walkAnims('npc-panther', ['left', 'right'], 10),
    ...walkAnims('npc-lion', ['left', 'right'], 8),
    ...walkAnims('npc-she_wolf', ['left', 'right'], 6),
    ...walkAnims('npc-soul', ['down'], 6),
    ...walkAnims('npc-shade', ['down'], 5),
    ...walkAnims('npc-generic', ['down'], 7),
    { key: 'npc-neutral-run-right', texture: 'npc-neutral', frames: ['right-1', 'right-2'], frameRate: 8, repeat: -1 },
    { key: 'npc-neutral-run-left', texture: 'npc-neutral', frames: ['left-1', 'left-2'], frameRate: 8, repeat: -1 },
    ...(['homer', 'horace', 'ovid', 'lucan'] as const).flatMap((poet) =>
      (['left', 'right'] as const).map((dir) => ({
        key: `npc-${poet}-walk-${dir}`,
        texture: `npc-${poet}`,
        frames: [`${dir}-1`, `${dir}-0`],
        frameRate: 6,
        repeat: -1,
      })),
    ),
    { key: 'npc-lovers-drift', texture: 'npc-lovers', frames: ['down-0', 'down-1'], frameRate: 2, repeat: -1 },
    { key: 'npc-francesca-drift', texture: 'npc-francesca', frames: ['down-0', 'down-1'], frameRate: 2, repeat: -1 },
    { key: 'npc-paolo-drift', texture: 'npc-paolo', frames: ['down-0', 'down-1'], frameRate: 2, repeat: -1 },
    { key: 'npc-charon-idle', texture: 'npc-charon', frames: ['down-0', 'down-1'], frameRate: 2, repeat: -1 },
    { key: 'npc-windsoul-fly-right', texture: 'npc-windsoul', frames: ['right-0', 'right-1'], frameRate: 6, repeat: -1 },
    { key: 'npc-windsoul-fly-left', texture: 'npc-windsoul', frames: ['left-0', 'left-1'], frameRate: 6, repeat: -1 },
    { key: 'fx-birds-starling', texture: 'fx-birds', frames: ['starling-0', 'starling-1'], frameRate: 10, repeat: -1 },
    { key: 'fx-birds-crane', texture: 'fx-birds', frames: ['crane-0', 'crane-1'], frameRate: 4, repeat: -1 },
    { key: 'fx-wasp-buzz', texture: 'fx-wasp', frames: ['0', '1', '2', '1'], frameRate: 20, repeat: -1 },
    { key: 'prop-banner-wave', texture: 'prop-banner', frames: ['0', '1', '2', '3'], frameRate: 6, repeat: -1 },
    { key: 'fx-glint-twinkle', texture: 'fx-glint', frames: ['0', '1', '2', '3', '2', '1'], frameRate: 8, repeat: -1 },
    { key: 'fx-dust-puff', texture: 'fx-dust', frames: ['0', '1', '2'], frameRate: 12, repeat: 0 },
  ];
  return { bitmaps, anims };
}

/** Tile names, re-exported for level code. */
export { TILE_NAMES };
