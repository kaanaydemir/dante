/**
 * The procedural art catalog (team D): every texture the world and the book
 * rely on is generated, no pixel map uses a colour its palette lacks (unknown
 * characters rasterise as magenta), and every animation names real frames.
 */

import { describe, expect, it } from 'vitest';
import { buildCatalog, cantoBitmaps, PALETTE_CANTOS } from '../../src/art/catalog';
import { TILE_NAMES } from '../../src/art/scenery';
import type { Bitmap } from '../../src/art/bitmap';

const catalog = buildCatalog(PALETTE_CANTOS);
const byKey = new Map<string, Bitmap>(catalog.bitmaps.map((b) => [b.key, b]));

function hasMagenta(b: Bitmap): boolean {
  for (let i = 0; i < b.data.length; i += 4) {
    if (b.data[i] === 255 && b.data[i + 1] === 0 && b.data[i + 2] === 255 && (b.data[i + 3] ?? 0) > 0) return true;
  }
  return false;
}

describe('art catalog', () => {
  it('has unique keys', () => {
    expect(byKey.size).toBe(catalog.bitmaps.length);
  });

  it('draws every character and creature the chapter needs', () => {
    for (const key of [
      'dante',
      'virgil',
      'npc-panther',
      'npc-lion',
      'npc-she_wolf',
      'npc-charon',
      'npc-minos',
      'npc-soul',
      'npc-shade',
      'npc-neutral',
      'npc-great_refusal',
      'npc-homer',
      'npc-horace',
      'npc-ovid',
      'npc-lucan',
      'npc-francesca',
      'npc-paolo',
      'npc-limbo_great',
      'npc-limbo_great_f',
      'npc-windsoul',
      'npc-generic',
      'fx-wasp',
      'fx-birds',
      'prop-banner',
      'prop-boat',
      'prop-bench',
      'prop-gate',
      'prop-castle',
      'prop-stone',
      'vignette-generic',
    ]) {
      expect(byKey.has(key), key).toBe(true);
    }
  });

  it('gives Dante four directions, a walk, a dash, a cast and the poses', () => {
    const frames = new Set(byKey.get('dante')!.frames.map((f) => f.name));
    for (const dir of ['down', 'up', 'left', 'right']) {
      for (const n of [0, 1, 2]) expect(frames.has(`${dir}-${n}`)).toBe(true);
      expect(frames.has(`dash-${dir}`)).toBe(true);
      expect(frames.has(`cast-${dir}`)).toBe(true);
    }
    for (const pose of ['sit', 'faint', 'faint-left']) expect(frames.has(pose)).toBe(true);
  });

  it('gives Minos his tail: idle, snarl and nine coils', () => {
    const frames = new Set(byKey.get('npc-minos')!.frames.map((f) => f.name));
    expect(frames.has('idle')).toBe(true);
    for (let n = 1; n <= 9; n++) expect(frames.has(`coil-${n}`)).toBe(true);
  });

  it('has a tileset and a vignette for every canto palette', () => {
    for (const id of ['inf01', 'inf02', 'inf03', 'inf04', 'inf05']) {
      expect(byKey.has(`tileset-${id}`)).toBe(true);
      expect(byKey.has(`vignette-${id}`)).toBe(true);
      for (const name of TILE_NAMES) expect(byKey.has(`tile-${id}-${name}`), `tile-${id}-${name}`).toBe(true);
    }
  });

  it('generates tiles for later cantos on demand', () => {
    const later = cantoBitmaps('inf06');
    expect(later.some((b) => b.key === 'tileset-inf06')).toBe(true);
  });

  it('never uses a colour missing from a palette', () => {
    const bad = catalog.bitmaps.filter(hasMagenta).map((b) => b.key);
    expect(bad).toEqual([]);
  });

  it('animates only frames that exist', () => {
    for (const a of catalog.anims) {
      const tex = byKey.get(a.texture);
      expect(tex, a.key).toBeDefined();
      const names = new Set(tex!.frames.map((f) => f.name));
      for (const f of a.frames) expect(names.has(f), `${a.key}: ${f}`).toBe(true);
    }
  });

  it('keeps every frame inside its sheet', () => {
    for (const b of catalog.bitmaps) {
      expect(b.data.length).toBe(b.width * b.height * 4);
      for (const f of b.frames) {
        expect(f.x + f.w).toBeLessThanOrEqual(b.width);
        expect(f.y + f.h).toBeLessThanOrEqual(b.height);
      }
    }
  });
});
