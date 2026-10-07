/**
 * World geometry, places, companion following and CAM readings (team D).
 */

import { describe, expect, it } from 'vitest';
import {
  distToPolyline,
  findFreeSpot,
  moveBox,
  overlapsAny,
  reachable,
  seededRandom,
  walkGrid,
} from '../../src/world/geometry';
import { PlaceTracker, placeSpawn } from '../../src/world/places';
import { followStep, Trail, FOLLOW_TELEPORT_DISTANCE } from '../../src/world/follow';
import { camIntent, speakerInText, zoomFor } from '../../src/world/camcues';
import { virgilFollowDistance } from '../../src/config';

describe('moveBox', () => {
  const wall = { x: 20, y: 0, w: 10, h: 100 };

  it('slides along a wall and never tunnels through it', () => {
    const r = moveBox({ x: 0, y: 10, w: 10, h: 6 }, 200, 5, [wall], null);
    expect(r.x).toBeLessThanOrEqual(10);
    expect(r.blockedX).toBe(true);
    expect(r.y).toBeCloseTo(15);
  });

  it('respects bounds', () => {
    const r = moveBox({ x: 5, y: 5, w: 10, h: 6 }, -50, -50, [], { x: 0, y: 0, w: 100, h: 100 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it('lets a box that starts inside a solid move out', () => {
    const r = moveBox({ x: 22, y: 10, w: 4, h: 4 }, 30, 0, [wall], null);
    expect(r.x).toBeGreaterThan(22);
  });
});

describe('findFreeSpot', () => {
  it('returns the point itself when free, else the nearest free spot', () => {
    expect(findFreeSpot(50, 50, 10, 6, [], null)).toEqual({ x: 50, y: 50 });
    const solid = { x: 40, y: 40, w: 20, h: 20 };
    const p = findFreeSpot(50, 50, 10, 6, [solid], null);
    expect(overlapsAny({ x: p.x - 5, y: p.y - 3, w: 10, h: 6 }, [solid])).toBe(false);
  });
});

describe('walk grid', () => {
  it('finds a way round a wall and none through a closed one', () => {
    const open = walkGrid(100, 100, [{ x: 45, y: 0, w: 10, h: 80 }]);
    expect(reachable(open, { x: 10, y: 10 }, { x: 90, y: 10 })).toBe(true);
    const closed = walkGrid(100, 100, [{ x: 45, y: 0, w: 10, h: 100 }]);
    expect(reachable(closed, { x: 10, y: 10 }, { x: 90, y: 10 })).toBe(false);
  });

  it('measures distance to a polyline', () => {
    expect(distToPolyline(5, 5, [{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBeCloseTo(5);
    expect(distToPolyline(0, 0, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it('seeded randomness is deterministic', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('PlaceTracker', () => {
  const tracker = new PlaceTracker([
    { id: 'inf99_a', x: 0, y: 0, w: 50, h: 50 },
    { id: 'inf99_b', x: 40, y: 0, w: 50, h: 50, spawn: { x: 70, y: 30 } },
  ]);

  it('reports entered and exited places in place order', () => {
    expect(tracker.update(10, 10)).toEqual({ entered: ['inf99_a'], exited: [] });
    expect(tracker.update(45, 10)).toEqual({ entered: ['inf99_b'], exited: [] });
    expect(tracker.update(80, 10)).toEqual({ entered: [], exited: ['inf99_a'] });
    expect(tracker.update(80, 12).entered).toEqual([]);
    expect(tracker.current()).toEqual(['inf99_b']);
  });

  it('spawns at the spawn point, else the centre', () => {
    expect(placeSpawn(tracker.get('inf99_b')!)).toEqual({ x: 70, y: 30 });
    expect(placeSpawn(tracker.get('inf99_a')!)).toEqual({ x: 25, y: 25 });
  });
});

describe('Virgil follows', () => {
  it('walks behind along the trail at the trust distance', () => {
    const trail = new Trail(2, 400);
    for (let x = 0; x <= 100; x += 2) trail.push(x, 50);
    const step = followStep({ companion: { x: 0, y: 50 }, player: { x: 100, y: 50 }, facing: { x: 1, y: 0 }, trust: 10, trail });
    expect(step.teleport).toBe(false);
    expect(step.target).not.toBeNull();
    expect(step.target!.x).toBeCloseTo(100 - virgilFollowDistance(10), 0);
  });

  it('stands still when close enough, and reappears when lost', () => {
    const trail = new Trail();
    trail.reset(10, 10);
    expect(followStep({ companion: { x: 10, y: 20 }, player: { x: 10, y: 10 }, facing: { x: 1, y: 0 }, trust: 4, trail }).target).toBeNull();
    const far = followStep({ companion: { x: 0, y: 0 }, player: { x: FOLLOW_TELEPORT_DISTANCE + 10, y: 0 }, facing: { x: 1, y: 0 }, trust: 4, trail });
    expect(far.teleport).toBe(true);
  });

  it('a Wayward Dante finds Virgil a step ahead', () => {
    const trail = new Trail();
    trail.reset(50, 50);
    const step = followStep({ companion: { x: 0, y: 50 }, player: { x: 50, y: 50 }, facing: { x: 1, y: 0 }, trust: 1, trail });
    expect(step.target!.x).toBeGreaterThan(50);
  });
});

describe('CAM verbs in the world', () => {
  it('reads who a pan looks at, and when it returns to Dante', () => {
    expect(camIntent('pan', 'kamera Dante’ye geri döner')).toEqual({ kind: 'pan', target: { kind: 'player' } });
    expect(camIntent('pan', 'iki alev halkası: Kharon')).toEqual({ kind: 'pan', target: { kind: 'speaker', speaker: 'CHARON' } });
    expect(camIntent('pan', 'yamaç boyunca yukarı')).toEqual({ kind: 'pan', target: { kind: 'ahead' } });
    expect(speakerInText('kurdun gözleri')).toBe('SHE_WOLF');
    expect(speakerInText('Vergilius onu kurtarır')).toBe('VIRGIL');
  });

  it('leaves the presenter verbs alone', () => {
    for (const verb of ['fade-in', 'fade-out', 'white-out', 'page-turn'] as const) expect(camIntent(verb, '')).toEqual({ kind: 'none' });
    expect(camIntent('engrave', '')).toEqual({ kind: 'engrave', on: true });
    expect(camIntent('unengrave', '')).toEqual({ kind: 'engrave', on: false });
  });

  it('zooms in and out around the base zoom', () => {
    expect(zoomFor('in', 2, 2)).toBe(3);
    expect(zoomFor('out', 3, 2)).toBe(2);
    expect(zoomFor('out', 2, 2)).toBe(1.5);
  });
});
