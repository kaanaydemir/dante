/**
 * Scenery per canto palette: 16 x 16 ground tiles (one tileset per canto) and
 * nature props (trees, rocks, bushes, reeds …), painted procedurally in the
 * canto's Doré-like palette (strong darks, few lights), plus the
 * palette-independent set pieces (the gate, the castle, Virgil's bench,
 * pillars) drawn as pixel maps.
 *
 * Texture keys: `tileset-<canto>` (frames named by tile), `tile-<canto>-<name>`,
 * `prop-<name>-<canto>` for palette props, `prop-<name>` for set pieces.
 *
 * Owner: team D (art). Pure: no Phaser.
 */

import type { CantoPalette } from '../config';
import { seededRandom, hashString } from '../world/geometry';
import { painted, paintedSheet, image, type Bitmap, type PixelTarget } from './bitmap';
import { ditherTone, outline, paintBranch, paintMass, paintTrunk, type Blob } from './paint';
import { darken, lighten, mix, rows, symmetric, type Palette } from './pixelmap';

export const TILE = 16;

/** Tile names in tileset order (the tile index is the position in this list). */
export const TILE_NAMES = [
  'ground-0',
  'ground-1',
  'ground-2',
  'ground-3',
  'path-0',
  'path-1',
  'path-edge-n',
  'path-edge-s',
  'slope-0',
  'slope-1',
  'water-0',
  'water-1',
  'shore-n',
  'shore-s',
  'meadow-0',
  'meadow-1',
  'storm-0',
  'storm-1',
  'wall-0',
  'wall-top',
  'dark',
  'ash-0',
  'ash-1',
  'floor-0',
] as const;
export type TileName = (typeof TILE_NAMES)[number];

export function tileIndex(name: TileName): number {
  return TILE_NAMES.indexOf(name);
}

/** Tones of a palette (dark -> light) for the painters. */
export function tones(p: CantoPalette) {
  return {
    ground: [darken(p.ground, 0.55), darken(p.ground, 0.3), p.ground, p.groundAlt, lighten(p.groundAlt, 0.1)],
    path: [darken(p.path, 0.45), darken(p.path, 0.2), p.path, lighten(p.path, 0.15)],
    water: [darken(p.water, 0.45), darken(p.water, 0.2), p.water, lighten(p.water, 0.2)],
    foliage: [p.shadow, darken(p.mid, 0.45), darken(p.mid, 0.15), p.mid, mix(p.mid, p.accent, 0.55)],
    bark: [p.shadow, darken(p.near, 0.2), p.near, mix(p.near, p.groundAlt, 0.6)],
    stone: [p.shadow, darken(p.far, 0.25), p.far, mix(p.far, p.mid, 0.5), mix(p.mid, p.light, 0.25)],
    meadow: [darken(p.ground, 0.35), darken(p.ground, 0.12), p.ground, p.groundAlt, lighten(p.groundAlt, 0.14)],
  };
}

/** Periodic value noise (wraps every `period` px) for seamless tiles. */
function periodicNoise(seed: number, period: number, cells: number): (x: number, y: number) => number {
  const rnd = seededRandom(seed);
  const grid = Array.from({ length: cells * cells }, () => rnd());
  const at = (i: number, j: number): number => grid[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)] as number;
  return (x: number, y: number): number => {
    const fx = (x / period) * cells;
    const fy = (y / period) * cells;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = fx - i;
    const v = fy - j;
    const su = u * u * (3 - 2 * u);
    const sv = v * v * (3 - 2 * v);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * su;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su;
    return a + (b - a) * sv;
  };
}

function fillNoise(t: PixelTarget, toneList: readonly number[], seed: number, base = 0.5, amp = 0.35): void {
  const low = periodicNoise(seed, TILE, 4);
  const rnd = seededRandom(seed ^ 0x9e37);
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const level = base + (low(x, y) - 0.5) * amp + (rnd() - 0.5) * 0.12;
      t.set(x, y, ditherTone(toneList, level, x, y), 1);
    }
  }
}

function paintTile(t: PixelTarget, name: TileName, p: CantoPalette, seed: number): void {
  const tn = tones(p);
  const rnd = seededRandom(seed);
  switch (name) {
    case 'ground-0':
      fillNoise(t, tn.ground, seed, 0.48);
      break;
    case 'ground-1': {
      fillNoise(t, tn.ground, seed, 0.48);
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(rnd() * 12);
        const y = 4 + Math.floor(rnd() * 10);
        t.set(x, y, p.accent, 1);
        t.set(x - 1, y - 1, darken(p.accent, 0.2), 1);
        t.set(x + 1, y - 1, darken(p.accent, 0.2), 1);
        t.set(x, y + 1, darken(p.ground, 0.4), 1);
      }
      break;
    }
    case 'ground-2': {
      fillNoise(t, tn.ground, seed, 0.46);
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(rnd() * 12);
        const y = 2 + Math.floor(rnd() * 12);
        t.set(x, y, lighten(p.groundAlt, 0.22), 1);
        t.set(x + 1, y, p.groundAlt, 1);
        t.set(x, y + 1, darken(p.ground, 0.55), 1);
        t.set(x + 1, y + 1, darken(p.ground, 0.55), 1);
      }
      break;
    }
    case 'ground-3': {
      fillNoise(t, tn.ground, seed, 0.44);
      let x = Math.floor(rnd() * 16);
      for (let y = 0; y < 16; y++) {
        t.set(x, y, darken(p.ground, 0.5), 1);
        if (rnd() < 0.4) x += rnd() < 0.5 ? -1 : 1;
        x = (x + 16) % 16;
      }
      break;
    }
    case 'path-0':
    case 'path-1': {
      fillNoise(t, tn.path, seed, 0.55, 0.3);
      const n = name === 'path-0' ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const x = 1 + Math.floor(rnd() * 14);
        const y = 1 + Math.floor(rnd() * 14);
        t.set(x, y, lighten(p.path, 0.25), 1);
        t.set(x, y + 1, darken(p.path, 0.4), 1);
      }
      break;
    }
    case 'path-edge-n':
    case 'path-edge-s': {
      const low = periodicNoise(seed, TILE, 4);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const edge = 8 + (low(x, 0) - 0.5) * 6;
          const onPath = name === 'path-edge-n' ? y >= edge : y < 16 - edge;
          const list = onPath ? tn.path : tn.ground;
          t.set(x, y, ditherTone(list, 0.5 + (low(x, y) - 0.5) * 0.3, x, y), 1);
        }
      }
      break;
    }
    case 'slope-0':
    case 'slope-1': {
      fillNoise(t, tn.ground, seed, 0.42, 0.25);
      const off = name === 'slope-0' ? 0 : 5;
      for (let i = -16; i < 32; i += 6) {
        for (let x = 0; x < 16; x++) {
          const y = Math.floor(i + off + x * 0.35) % 16;
          if (y >= 0 && y < 16) {
            t.set(x, y, darken(p.ground, 0.5), 1);
            if (y + 1 < 16) t.set(x, y + 1, lighten(p.groundAlt, 0.1), 1);
          }
        }
      }
      break;
    }
    case 'water-0':
    case 'water-1': {
      fillNoise(t, tn.water, seed, 0.45, 0.25);
      const phase = name === 'water-0' ? 0 : 3;
      for (let row = 2; row < 16; row += 5) {
        const x0 = (row * 3 + phase) % 16;
        for (let k = 0; k < 4; k++) t.set((x0 + k) % 16, row, lighten(p.water, 0.3), 1);
        t.set((x0 + 4) % 16, row + 1, darken(p.water, 0.3), 1);
      }
      break;
    }
    case 'shore-n':
    case 'shore-s': {
      // shore-n: ground above, water below (the bank seen from the land).
      const low = periodicNoise(seed, TILE, 4);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const edge = 7 + (low(x, 3) - 0.5) * 4;
          const yy = name === 'shore-n' ? y : 15 - y;
          let c: number;
          if (yy < edge - 1) c = ditherTone(tn.ground, 0.45 + (low(x, y) - 0.5) * 0.3, x, y);
          else if (yy < edge + 1) c = mix(p.path, p.light, 0.15);
          else if (yy < edge + 2) c = lighten(p.water, 0.35);
          else c = ditherTone(tn.water, 0.4 + (low(x, y) - 0.5) * 0.3, x, y);
          t.set(x, y, c, 1);
        }
      }
      break;
    }
    case 'meadow-0':
    case 'meadow-1': {
      fillNoise(t, tn.meadow, seed, 0.55, 0.3);
      const n = name === 'meadow-0' ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const x = 1 + Math.floor(rnd() * 14);
        const y = 2 + Math.floor(rnd() * 13);
        t.set(x, y, lighten(p.groundAlt, 0.25), 1);
        t.set(x, y - 1, lighten(p.groundAlt, 0.12), 1);
      }
      if (name === 'meadow-1') {
        const x = 3 + Math.floor(rnd() * 10);
        const y = 4 + Math.floor(rnd() * 8);
        t.set(x, y, p.light, 1);
        t.set(x + 1, y, mix(p.light, p.accent, 0.5), 1);
        t.set(x, y + 1, darken(p.ground, 0.3), 1);
      }
      break;
    }
    case 'storm-0':
    case 'storm-1': {
      fillNoise(t, tn.stone, seed, 0.32, 0.3);
      let x = Math.floor(rnd() * 16);
      let y = 0;
      while (y < 16) {
        t.set(x, y, p.shadow, 1);
        if (name === 'storm-1' && rnd() < 0.3) t.set(x + 1, y, mix(p.light, p.far, 0.6), 1);
        y += 1;
        if (rnd() < 0.5) x += rnd() < 0.5 ? -1 : 1;
        if (x < 0 || x > 15) break;
      }
      break;
    }
    case 'wall-0': {
      const mortar = darken(p.far, 0.55);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const course = Math.floor(y / 4);
          const offset = course % 2 === 0 ? 0 : 4;
          const isMortar = y % 4 === 3 || (x + offset) % 8 === 7;
          const lit = y % 4 === 0;
          t.set(x, y, isMortar ? mortar : lit ? lighten(p.far, 0.18) : ditherTone(tn.stone.slice(1, 4), 0.5 + ((x * 7 + y * 3) % 5) / 20, x, y), 1);
        }
      }
      break;
    }
    case 'wall-top': {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const merlon = y < 5 && x % 8 >= 5;
          if (merlon) continue;
          const c = y < 5 ? (x % 8 === 4 || x % 8 === 0 ? darken(p.far, 0.5) : lighten(p.far, 0.12)) : y === 5 ? lighten(p.far, 0.25) : darken(p.far, 0.15);
          t.set(x, y, c, 1);
        }
      }
      break;
    }
    case 'dark':
      fillNoise(t, [p.shadow, darken(p.near, 0.3), p.near], seed, 0.25, 0.2);
      break;
    case 'ash-0':
    case 'ash-1': {
      const ash = [darken(p.ground, 0.4), p.ground, mix(p.ground, p.accent2, 0.35), mix(p.groundAlt, p.accent2, 0.5)];
      fillNoise(t, ash, seed, 0.45, 0.3);
      if (name === 'ash-1') {
        for (let i = 0; i < 2; i++) {
          const x = 2 + Math.floor(rnd() * 12);
          const y = 2 + Math.floor(rnd() * 12);
          t.set(x, y, p.shadow, 1);
          t.set(x + 1, y, darken(p.ground, 0.3), 1);
        }
      }
      break;
    }
    case 'floor-0': {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const seam = y === 0 || x === 0 || (y === 8 && x < 8) || (x === 8 && y > 8);
          t.set(x, y, seam ? darken(p.far, 0.45) : ditherTone(tn.stone.slice(1), 0.45 + ((x ^ y) % 4) / 30, x, y), 1);
        }
      }
      break;
    }
  }
}

/** The canto's tileset (one row of 16 x 16 tiles; frames named by tile). */
export function tilesetBitmap(cantoId: string, p: CantoPalette): Bitmap {
  return paintedSheet(
    `tileset-${cantoId}`,
    TILE_NAMES,
    TILE,
    TILE,
    (t, i, name) => paintTile(t, name as TileName, p, hashString(`${cantoId}:${name}`) + i),
    TILE_NAMES.length,
  );
}

/** Individual tile textures `tile-<canto>-<name>` (the ENGINE.md convention), for levels that place tiles as images. */
export function tileBitmaps(cantoId: string, p: CantoPalette): Bitmap[] {
  return TILE_NAMES.map((name, i) =>
    painted(`tile-${cantoId}-${name}`, TILE, TILE, (t) => paintTile(t, name, p, hashString(`${cantoId}:${name}`) + i)),
  );
}

// ---------------------------------------------------------------------------
// Nature props (per palette)
// ---------------------------------------------------------------------------

export const PALETTE_PROPS = [
  'tree',
  'tree_dead',
  'ghost_tree',
  'bush',
  'rock',
  'rock_big',
  'storm_rock',
  'shelter_rock',
  'grass',
  'flower',
  'reed',
] as const;
export type PaletteProp = (typeof PALETTE_PROPS)[number];

/** Size of each palette prop (the base point is the bottom centre). */
export const PROP_SIZE: Readonly<Record<PaletteProp, { w: number; h: number }>> = {
  tree: { w: 32, h: 48 },
  tree_dead: { w: 32, h: 40 },
  ghost_tree: { w: 32, h: 44 },
  bush: { w: 20, h: 14 },
  rock: { w: 16, h: 12 },
  rock_big: { w: 32, h: 22 },
  storm_rock: { w: 32, h: 34 },
  shelter_rock: { w: 48, h: 32 },
  grass: { w: 8, h: 6 },
  flower: { w: 8, h: 6 },
  reed: { w: 8, h: 14 },
};

function paintProp(t: PixelTarget, prop: PaletteProp, p: CantoPalette, seed: number): void {
  const tn = tones(p);
  const rnd = seededRandom(seed);
  const outlineColor = p.shadow;
  switch (prop) {
    case 'tree': {
      paintTrunk(t, 16, 22, 46, 7, 4, tn.bark, seed, (rnd() - 0.5) * 3);
      paintBranch(t, 14, 26, 8, 20, tn.bark[1] as number);
      paintBranch(t, 18, 25, 25, 18, tn.bark[1] as number);
      const blobs: Blob[] = [];
      for (let i = 0; i < 7; i++) {
        blobs.push({ x: 8 + rnd() * 16, y: 9 + rnd() * 14, r: 5 + rnd() * 5, ry: 0.85 });
      }
      blobs.push({ x: 16, y: 13, r: 10, ry: 0.8 });
      paintMass(t, blobs, tn.foliage, { seed, ambient: 0.18 });
      outline(t, outlineColor);
      break;
    }
    case 'tree_dead': {
      paintTrunk(t, 16, 12, 38, 6, 3, tn.bark, seed, (rnd() - 0.5) * 4);
      const c = tn.bark[1] as number;
      paintBranch(t, 15, 18, 6, 8, c);
      paintBranch(t, 6, 8, 3, 3, c);
      paintBranch(t, 17, 16, 27, 6, c);
      paintBranch(t, 27, 6, 29, 1, c);
      paintBranch(t, 16, 24, 9, 19, c);
      paintBranch(t, 17, 22, 24, 17, c);
      outline(t, outlineColor);
      break;
    }
    case 'ghost_tree': {
      const pale = [darken(p.accent2, 0.5), darken(p.accent2, 0.25), p.accent2, lighten(p.accent2, 0.2)];
      paintTrunk(t, 16, 20, 42, 6, 3, pale, seed);
      const blobs: Blob[] = [];
      for (let i = 0; i < 6; i++) blobs.push({ x: 9 + rnd() * 14, y: 9 + rnd() * 12, r: 5 + rnd() * 4, ry: 0.9 });
      paintMass(t, blobs, [darken(p.mid, 0.3), p.mid, mix(p.mid, p.accent2, 0.5), lighten(p.accent2, 0.1)], { seed, ambient: 0.3 });
      outline(t, darken(p.mid, 0.6));
      break;
    }
    case 'bush': {
      const blobs: Blob[] = [
        { x: 6, y: 9, r: 5 },
        { x: 11, y: 7, r: 6 },
        { x: 15, y: 9, r: 4.5 },
      ];
      paintMass(t, blobs, tn.foliage, { seed, flatBottom: 12, ambient: 0.2 });
      outline(t, outlineColor);
      break;
    }
    case 'rock': {
      paintMass(t, [{ x: 8, y: 8, r: 7, ry: 0.75 }, { x: 6, y: 7, r: 4 }], tn.stone, { seed, flatBottom: 10, ambient: 0.22 });
      outline(t, outlineColor);
      break;
    }
    case 'rock_big': {
      paintMass(
        t,
        [
          { x: 13, y: 13, r: 11, ry: 0.75 },
          { x: 21, y: 15, r: 9, ry: 0.7 },
          { x: 9, y: 16, r: 7, ry: 0.7 },
        ],
        tn.stone,
        { seed, flatBottom: 20, ambient: 0.2 },
      );
      t.line(14, 9, 17, 16, darken(p.far, 0.5), 1);
      outline(t, outlineColor);
      break;
    }
    case 'storm_rock': {
      // A jagged, tall spur lit by lightning on its left edge.
      for (let y = 0; y < 34; y++) {
        const k = y / 33;
        const half = 3 + k * 12 + Math.sin(y * 1.7 + seed) * 1.5;
        const cx = 16 + Math.sin(y * 0.4) * 2;
        for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
          const u = (x - (cx - half)) / (2 * half);
          const level = 0.65 - u * 0.6 + (rnd() - 0.5) * 0.1;
          t.set(x, y, ditherTone(tn.stone, level, x, y), 1);
        }
      }
      for (let y = 4; y < 30; y += 7) t.line(12, y, 18, y + 4, darken(p.far, 0.6), 1);
      outline(t, outlineColor);
      break;
    }
    case 'shelter_rock': {
      paintMass(
        t,
        [
          { x: 20, y: 18, r: 17, ry: 0.72 },
          { x: 32, y: 21, r: 13, ry: 0.68 },
          { x: 11, y: 22, r: 10, ry: 0.65 },
        ],
        tn.stone,
        { seed, flatBottom: 30, ambient: 0.2 },
      );
      t.line(22, 8, 26, 20, darken(p.far, 0.5), 1);
      t.line(30, 14, 33, 24, darken(p.far, 0.5), 1);
      outline(t, outlineColor);
      break;
    }
    case 'grass': {
      const c = darken(p.accent, 0.1);
      t.set(1, 5, c);
      t.set(2, 3, c);
      t.set(2, 4, c);
      t.set(3, 5, p.accent);
      t.set(4, 2, p.accent);
      t.set(4, 3, c);
      t.set(4, 4, c);
      t.set(5, 5, c);
      t.set(6, 3, c);
      t.set(6, 4, c);
      break;
    }
    case 'flower': {
      const c = darken(p.accent, 0.15);
      t.set(2, 4, c);
      t.set(2, 5, c);
      t.set(5, 5, c);
      t.set(5, 4, c);
      t.set(2, 2, p.light);
      t.set(1, 3, mix(p.light, p.accent2, 0.3));
      t.set(3, 3, mix(p.light, p.accent2, 0.3));
      t.set(5, 2, lighten(p.accent2, 0.3));
      break;
    }
    case 'reed': {
      const c = mix(p.accent, p.path, 0.4);
      for (let y = 2; y < 14; y++) t.set(2, y, c);
      for (let y = 5; y < 14; y++) t.set(5, y, darken(c, 0.2));
      for (let y = 0; y < 4; y++) t.set(2, y, darken(p.path, 0.3));
      t.set(6, 4, c);
      t.set(1, 6, c);
      break;
    }
  }
}

export function propBitmaps(cantoId: string, p: CantoPalette): Bitmap[] {
  return PALETTE_PROPS.map((prop, i) => {
    const { w, h } = PROP_SIZE[prop];
    return painted(`prop-${prop}-${cantoId}`, w, h, (t) => paintProp(t, prop, p, hashString(`${cantoId}:${prop}`) + i));
  });
}

// ---------------------------------------------------------------------------
// Set pieces (palette independent)
// ---------------------------------------------------------------------------

const STONE: Palette = {
  k: 0x0e0c0a,
  s: 0x3a342c,
  S: 0x544c40,
  m: 0x6e6656,
  l: 0x8e8670,
  L: 0xaaa28a,
  d: 0x060504,
  g: 0xb89848,
  G: 0x7a6430,
  b: 0x2a2018,
  w: 0x4a6a5a,
};

/** Virgil's stone bench (GDD 2.4): the checkpoint. */
export const BENCH = rows(`
.kkkkkkkkkkkkkkkkkkkkkk.
kLLLLLLLLLLLLLLLLLLLLLLk
kllllllllllllllllllllllk
kmmmmmmmmmmmmmmmmmmmmmmk
kSSSSSSSSSSSSSSSSSSSSSSk
.kkkkkkkkkkkkkkkkkkkkkk.
..kmmSk..........kmmSk..
..kmmSk..........kmmSk..
..kmmSk..........kmmSk..
..kSSSk..........kSSSk..
..kkkkk..........kkkkk..
`);

/** The gate of Hell (III 1–9): a dark arch under a slab with the inscription cut in gold. */
function gateMap(): string[] {
  const w = 64;
  const h = 64;
  const cx = 31.5;
  const cy = 30;
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const r = Math.hypot(dx, y - cy);
      const slab = y >= 2 && y < 14 && x >= 4 && x < 60;
      const pillar = y >= 14 && (x < 13 || x >= 51) && x >= 2 && x < 62;
      const archStone = y < cy + 1 && r <= 29 && r > 19 && y >= 10;
      const doorway = (y >= cy && Math.abs(dx) < 19) || (y < cy + 1 && r <= 19 && y >= 11);
      let ch = '.';
      if (slab) {
        const edge = y === 2 || y === 13 || x === 4 || x === 59;
        const letters = y >= 5 && y <= 10 && x >= 8 && x < 56 && (y === 6 || y === 9) && (x * 7 + y * 3) % 5 < 3;
        ch = edge ? 'k' : letters ? (y === 6 ? 'g' : 'G') : y < 5 ? 'L' : 'l';
      } else if (doorway && y >= 11) {
        ch = 'd';
      } else if (archStone || pillar) {
        const outer = pillar ? x === 2 || x === 61 || x === 12 || x === 51 : r > 28.2 || r < 19.8;
        if (outer || y === h - 1) ch = 'k';
        else if (pillar) ch = x < 13 ? (x < 5 ? 'L' : x < 9 ? 'l' : 'm') : x > 58 ? 'S' : x > 55 ? 'm' : 'l';
        else ch = dx < 0 ? 'l' : 'm';
        if (!outer && (y % 6 === 0 || (archStone && Math.round(Math.atan2(y - cy, dx) * 6) % 2 === 0 && r > 27))) ch = 'S';
      }
      row += ch;
    }
    out.push(row);
  }
  return out;
}

/** A stretch of the noble castle's walls (IV 106–108) with a tower and a gate. */
function castleMap(): string[] {
  const out: string[] = [];
  const w = 96;
  const h = 64;
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const tower = x >= 36 && x < 60;
      const top = tower ? 0 : 18;
      if (y < top) {
        row += '.';
        continue;
      }
      const ly = y - top;
      const merlon = ly < 4 && ((x - (tower ? 36 : 0)) % 6 >= 3);
      if (merlon) {
        row += '.';
        continue;
      }
      if (ly === 0 || x === 0 || x === w - 1 || (tower && (x === 36 || x === 59)) || y === h - 1) {
        row += 'k';
        continue;
      }
      const door = tower && x >= 42 && x < 54 && y > 40;
      const doorArch = tower && x >= 42 && x < 54 && y > 36 && Math.hypot(x - 47.5, y - 41) < 6.5;
      if (door || doorArch) {
        row += x === 42 || x === 53 ? 'S' : 'd';
        continue;
      }
      const window = tower && y > 14 && y < 20 && (x === 44 || x === 51);
      if (window) {
        row += 'g';
        continue;
      }
      const course = Math.floor(ly / 4);
      const mortar = ly % 4 === 3 || (x + (course % 2) * 3) % 6 === 5;
      row += mortar ? 'S' : ly % 4 === 0 ? 'L' : tower ? 'l' : 'm';
    }
    out.push(row);
  }
  return out;
}

const PILLAR = rows(`
.kkkkkkkkkkkkkk.
kLLLLLLLLLLLLLLk
kkkkkkkkkkkkkkkk
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
..kLlmmmmmmSk...
.kkkkkkkkkkkkkk.
kLLLLLLLLLLLLLLk
kSSSSSSSSSSSSSSk
kkkkkkkkkkkkkkkk
`);

/** A rolling stone and a fallen branch: obstacles a Force verse moves (II s6, fixture s4). */
const STONE_BLOCK = rows(`
....kkkkkkkk....
..kkLLLlllllkk..
.kLLlllllmmmmSk.
kLLlllllmmmmmSSk
kLllllmmmmmmmSSk
kLlllmmmmmmmSSSk
kllmmmmmmmmSSSSk
kSmmmmmmmmSSSSSk
.kSSmmmmSSSSSSk.
..kkSSSSSSSSkk..
....kkkkkkkk....
`);

const BRANCH = rows(`
..........kk..........
.........kbbk...kk....
..kk....kbbk...kbbk...
.kbbkkkkbbkkkkkbbkk...
kbbbbbbbbbbbbbbbbbbbkk
.kkbbbbbbbbbbbbbbbbbbbk
...kkkkkkkkkkkkkkkkkkk.
`);

export function setPieceBitmaps(): Bitmap[] {
  return [
    image('prop-bench', BENCH, STONE),
    image('prop-gate', gateMap(), STONE),
    image('prop-castle', castleMap(), STONE),
    image('prop-pillar', PILLAR, STONE),
    image('prop-stone', STONE_BLOCK, STONE),
    image('prop-branch', BRANCH, { ...STONE, b: 0x4a3420 }),
  ];
}
