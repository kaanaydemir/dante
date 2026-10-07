/**
 * Canto IV's level plans (src/levels/_framework/chapter1/inf04.ts): the drop
 * below the brink never walls the way, its rim is where Dante can stand and
 * look down, the great spirits stand where their beats are played, Saladin
 * stands apart, and the hedge sends the way to the inner gate over the rise
 * (so the philosophers' beat, s7.b6, always plays before the gate).
 */

import { describe, expect, it } from 'vitest';
import { loadStoryLibrary } from '../../src/story/load';
import type { CantoScript } from '../../src/story/types';
import { placeBand, planBrinkGate, planDrop, planMeadow, rimAt } from '../../src/levels/_framework/chapter1/inf04';
import { pathYAt } from '../../src/levels/_framework/chapter1/common';
import { decorSolids, planDecor, planGenericLevel } from '../../src/levels/_framework/layout';
import { dist, reachable, rectContains, walkGrid, type Vec } from '../../src/world/geometry';
import type { Rect } from '../../src/runtime/contracts';

const library = loadStoryLibrary({ includeFixtures: true });
const script = library.script('inf04') as CantoScript;
const layout = planGenericLevel(script);
const decor = decorSolids(planDecor(layout));
const drop = planDrop(layout);
const meadow = planMeadow(layout);
const place = (id: string): Rect => layout.places.find((p) => p.id === id) as Rect;
const spawnOf = (id: string): Vec => {
  const p = layout.places.find((q) => q.id === id);
  return p?.spawn ?? { x: (p?.x ?? 0) + (p?.w ?? 0) / 2, y: (p?.y ?? 0) + (p?.h ?? 0) / 2 };
};

describe('Canto IV: the abysmal valley', () => {
  it('lies below the path at the brink and the descent', () => {
    expect(drop).not.toBeNull();
    const d = drop!;
    expect(d.x1).toBeGreaterThan(place('inf04_brink').x + place('inf04_brink').w);
    for (const col of d.solids) expect(col.y).toBeGreaterThan(pathYAt(layout.path, col.x + col.w / 2) + 20);
  });

  it('keeps the start, the brink and the descent above its rim', () => {
    const d = drop!;
    for (const p of [layout.start, spawnOf('inf04_brink'), spawnOf('inf04_descent')]) {
      const top = rimAt(d, p.x);
      if (top !== null) expect(p.y).toBeLessThan(top - 8);
    }
  });

  it('never walls the way: every place can still be reached from the start', () => {
    const grid = walkGrid(layout.width, layout.height, [...decor, ...drop!.solids, ...meadow!.hedge], 8, { w: 12, h: 8 });
    for (const p of layout.places) expect(reachable(grid, layout.start, spawnOf(p.id)), `${p.id} unreachable`).toBe(true);
  });
});

describe('Canto IV: the places', () => {
  it('are bands across the level, crossed one after another in the order of the poem', () => {
    const bands = layout.places.map((p) => placeBand(p, layout.height));
    bands.forEach((b, i) => {
      expect(b.y).toBe(0);
      expect(b.h).toBe(layout.height);
      expect(b.spawn).toEqual(layout.places[i]!.spawn);
      const next = bands[i + 1];
      if (next) expect(next.x).toBeGreaterThanOrEqual(b.x + b.w);
    });
  });
});

describe('Canto IV: the head of the path (s1)', () => {
  const gate = planBrinkGate(layout, drop!);
  const solids = [...decor, ...drop!.solids, ...meadow!.hedge, gate!.spur];

  it('is closed while Virgil stands in it: the plain cannot be reached before he is spoken to', () => {
    const closed = walkGrid(layout.width, layout.height, [...solids, gate!.block], 8, { w: 12, h: 8 });
    expect(reachable(closed, spawnOf('inf04_brink'), spawnOf('inf04_sighs'))).toBe(false);
  });

  it('opens when he steps out of it', () => {
    const open = walkGrid(layout.width, layout.height, solids, 8, { w: 12, h: 8 });
    for (const id of ['inf04_descent', 'inf04_sighs', 'inf04_dark_edge']) expect(reachable(open, spawnOf('inf04_brink'), spawnOf(id)), id).toBe(true);
  });

  it('lets Dante come close enough to speak to him and to stand at the rim', () => {
    const g = gate!;
    const grid = walkGrid(layout.width, layout.height, [...solids, g.block], 8, { w: 12, h: 8 });
    const beside = { x: g.block.x - 10, y: g.spot.y };
    expect(reachable(grid, spawnOf('inf04_brink'), beside)).toBe(true);
    expect(dist(beside.x, beside.y, g.spot.x, g.spot.y)).toBeLessThan(30);
    expect(rimAt(drop!, beside.x)! - beside.y).toBeLessThan(24);
  });
});

describe('Canto IV: the meadow', () => {
  it('puts every great spirit inside the place its beat is played in', () => {
    const m = meadow!;
    for (const s of ['HECTOR', 'AENEAS', 'CAMILLA', 'SALADIN', 'ELECTRA', 'CAESAR']) expect(rectContains(place('inf04_heroes'), m.figures[s]!.x, m.figures[s]!.y), s).toBe(true);
    for (const s of ['ARISTOTLE', 'SOCRATES', 'PLATO', 'ORPHEUS', 'AVICENNA', 'AVERROES']) {
      expect(rectContains(place('inf04_philosophers'), m.figures[s]!.x, m.figures[s]!.y), s).toBe(true);
    }
  });

  it('sets Saladin alone, apart (IV 129)', () => {
    const m = meadow!;
    const saladin = m.figures.SALADIN!;
    for (const s of ['HECTOR', 'AENEAS', 'CAMILLA', 'ELECTRA', 'CAESAR']) expect(dist(saladin.x, saladin.y, m.figures[s]!.x, m.figures[s]!.y), s).toBeGreaterThan(56);
  });

  it('keeps the figures far enough apart to tell whom Dante speaks to', () => {
    const m = meadow!;
    const all = Object.entries(m.figures);
    for (const [a, p] of all) for (const [b, q] of all) if (a < b) expect(dist(p.x, p.y, q.x, q.y), `${a}–${b}`).toBeGreaterThan(24);
  });

  it('sends the way to the inner gate over the rise (s7.b6 always plays first)', () => {
    const solids = [...decor, ...drop!.solids, ...meadow!.hedge];
    const from = spawnOf('inf04_heroes');
    const gate = spawnOf('inf04_meadow_gate');
    expect(reachable(walkGrid(layout.width, layout.height, solids, 8, { w: 12, h: 8 }), from, gate)).toBe(true);
    // With the rise itself closed, the gate cannot be reached: every way to it crosses the rise.
    const closed = walkGrid(layout.width, layout.height, [...solids, place('inf04_philosophers')], 8, { w: 12, h: 8 });
    expect(reachable(closed, from, gate)).toBe(false);
  });
});
