/**
 * The hand-made moments of Cantos I–III that are pure geometry: the dark wood
 * of Canto I (verses that wait on the way, a thicket the taken word opens) and
 * the banner of Canto III (a line round the island that cuts the way twice and
 * thins where it bends). Playtests found the generic versions unplayable as
 * written (verses opening back to back; a crowd loop that never crossed the
 * way); these tests keep the fixes honest.
 */

import { describe, expect, it } from 'vitest';
import { loadStoryLibrary } from '../../src/story/load';
import type { CantoScript } from '../../src/story/types';
import { planWood } from '../../src/levels/_framework/chapter1/inf01';
import { planBanner } from '../../src/levels/_framework/chapter1/inf03';
import { decorSolids, planDecor, planGenericLevel } from '../../src/levels/_framework/layout';
import { arcDelta, PolyPath, sharpBends } from '../../src/mechanics/logic/path';
import { distToPolyline, reachable, rectContains, walkGrid, type Vec } from '../../src/world/geometry';
import type { Rect } from '../../src/runtime/contracts';

const library = loadStoryLibrary();

function scriptOf(id: string): CantoScript {
  const s = library.script(id);
  if (!s) throw new Error(`no script ${id}`);
  return s;
}

describe('Canto I: the dark wood', () => {
  const layout = planGenericLevel(scriptOf('inf01'));
  const wood = planWood(layout);
  const edge = layout.places.find((p) => p.id === 'inf01_wood_edge')!;

  it('has a plan', () => {
    expect(wood).not.toBeNull();
  });

  it('wakes Dante deep in the wood and puts the verses on the way, in order, before the thicket', () => {
    const w = wood!;
    expect(rectContains(w.wood, w.wood.spawn.x, w.wood.spawn.y)).toBe(true);
    expect(w.wood.spawn.x).toBeLessThan(layout.places[0]!.x);
    expect(w.wood.spawn.x).toBeLessThan(w.pitX);
    expect(w.pitX).toBeLessThan(w.passageX);
    expect(w.passageX).toBeLessThan(w.pavingEndX);
    expect(w.pavingEndX).toBeLessThan(w.thornX);
    expect(w.thornX).toBeLessThan(edge.x);
    // The pit lies across the path; the darkest passage spans it.
    expect(rectContains(w.pit, w.pitX, distToPolylineY(layout.path, w.pitX))).toBe(true);
    expect(w.passage.x).toBeLessThanOrEqual(w.passageX);
    expect(w.passage.x + w.passage.w).toBeGreaterThanOrEqual(w.pavingEndX);
    // Every paving stone is on the path.
    for (const p of w.paving) expect(distToPolyline(p.x, p.y, layout.path)).toBeLessThan(2);
  });

  it('lets Dante reach the end of the paving before the thorns (feet 10 px, thicket 14 px)', () => {
    const w = wood!;
    expect(w.pavingEndX + 5).toBeLessThan(w.thornX - 7);
  });

  it('is closed by the thicket until the word is taken, then open through a gap on the path', () => {
    const w = wood!;
    const solids = decorSolids(planDecor(layout));
    const wall: Rect = { x: w.thornX - 7, y: 0, w: 14, h: layout.height };
    const closed = walkGrid(layout.width, layout.height, [...solids, wall], 4, { w: 10, h: 6 });
    const to: Vec = edge.spawn ?? { x: edge.x + edge.w / 2, y: edge.y + edge.h / 2 };
    expect(reachable(closed, w.wood.spawn, { x: w.pavingEndX, y: distToPolylineY(layout.path, w.pavingEndX) })).toBe(true);
    expect(reachable(closed, w.wood.spawn, to)).toBe(false);
    const gapHalf = 15;
    const opened = walkGrid(
      layout.width,
      layout.height,
      [
        ...solids,
        { x: w.thornX - 7, y: 0, w: 14, h: w.gap.y - gapHalf - 6 },
        { x: w.thornX - 7, y: w.gap.y + gapHalf, w: 14, h: layout.height - w.gap.y - gapHalf },
      ],
      4,
      { w: 10, h: 6 },
    );
    expect(reachable(opened, w.wood.spawn, to)).toBe(true);
  });
});

describe('Canto III: the banner', () => {
  const layout = planGenericLevel(scriptOf('inf03'));
  const plan = planBanner(layout);
  const at = (id: string) => layout.places.find((p) => p.id === id)!;

  it('has a plan', () => {
    expect(plan).not.toBeNull();
  });

  it('runs round the island and cuts the way twice, on the path, before and after the island', () => {
    const b = plan!;
    const north = at('inf03_plain_north');
    const island = at('inf03_island');
    const edge = at('inf03_plain_edge');
    expect(distToPolyline(b.outer.x, b.outer.y, layout.path)).toBeLessThan(2);
    expect(distToPolyline(b.inner.x, b.inner.y, layout.path)).toBeLessThan(2);
    expect(b.outer.x).toBeGreaterThan(north.x + north.w);
    expect(b.outer.x).toBeLessThan(island.x);
    expect(b.inner.x).toBeGreaterThan(island.x + island.w);
    expect(b.inner.x).toBeLessThan(edge.x);
    // The island's spawn (where its beat waits) is inside the loop, the plain's edge outside.
    const xs = b.loop.map((p) => p.x);
    const ys = b.loop.map((p) => p.y);
    const isl = island.spawn!;
    expect(isl.x).toBeGreaterThan(Math.min(...xs));
    expect(isl.x).toBeLessThan(Math.max(...xs));
    expect(isl.y).toBeGreaterThan(Math.min(...ys));
    expect(isl.y).toBeLessThan(Math.max(...ys));
  });

  it('bends sharply where it crosses the way (the line thins there)', () => {
    const b = plan!;
    const path = new PolyPath(b.loop, true);
    const bends = sharpBends(path);
    const arcOf = (p: Vec): number => {
      let s = 0;
      for (let i = 0; i < b.loop.length; i++) {
        const q = b.loop[i]!;
        if (q.x === p.x && q.y === p.y) return s;
        const n = b.loop[(i + 1) % b.loop.length]!;
        s += Math.hypot(n.x - q.x, n.y - q.y);
      }
      return -1;
    };
    for (const crossing of [b.outer, b.inner]) {
      const s = arcOf(crossing);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(bends.some((x) => Math.abs(arcDelta(x, s, path.length)) < 1)).toBe(true);
    }
  });
});

describe('path helpers', () => {
  it('finds the sharp corners of a closed path and measures arc distances round it', () => {
    const square = new PolyPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      true,
    );
    expect(sharpBends(square)).toEqual([0, 10, 20, 30]);
    expect(arcDelta(38, 2, 40)).toBe(4);
    expect(arcDelta(2, 38, 40)).toBe(-4);
    // A gentle polygon has no sharp bends.
    const round = new PolyPath(
      Array.from({ length: 24 }, (_, i) => ({ x: Math.cos((i / 24) * Math.PI * 2) * 50, y: Math.sin((i / 24) * Math.PI * 2) * 50 })),
      true,
    );
    expect(sharpBends(round)).toEqual([]);
  });
});

/** The path's y at x (the generic path is left to right). */
function distToPolylineY(path: readonly Vec[], x: number): number {
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    if (x >= a.x && x <= b.x) return b.x === a.x ? a.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return path[path.length - 1]!.y;
}
