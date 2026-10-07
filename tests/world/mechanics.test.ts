/**
 * Pure logic behind the mechanics library (team D) and the registry's
 * coverage of the bible's §7.0 mechanic vocabulary.
 */

import { describe, expect, it } from 'vitest';
import { MECHANIC_NAMES } from '../../src/story/types';
import { libraryMechanicNames, NON_LEVEL_MECHANICS } from '../../src/mechanics/index';
import { ellipseLoop, PolyPath } from '../../src/mechanics/logic/path';
import { angleDelta, DEFAULT_FLOW, flowAngle, headingIndex, turnedBetween } from '../../src/mechanics/logic/crowd';
import { circleNumeral, DEFAULT_CONFESSIONS, JudgementGame, pickConfessions, RIGHT_NEEDED } from '../../src/mechanics/logic/judgement';
import { CueWatch, StillTimer } from '../../src/mechanics/logic/stillness';
import { approachCalm, braceFactor, inWind, shelterShadow, windAt, type WindLane } from '../../src/mechanics/logic/wind';

describe('mechanics registry', () => {
  it('covers every §7.0 mechanic: a library class, or an ability of the world or the book', () => {
    const lib = new Set<string>(libraryMechanicNames());
    for (const name of MECHANIC_NAMES) {
      expect(lib.has(name) || NON_LEVEL_MECHANICS.includes(name), `${name} is not covered`).toBe(true);
    }
  });

  it('has the level mechanics of Chapter 1', () => {
    const lib = libraryMechanicNames();
    for (const name of [
      'fear',
      'darkness',
      'look_back',
      'chase',
      'hold_ground',
      'push_back',
      'crowd_flow',
      'swarm',
      'guardian',
      'quake',
      'faint',
      'inscription',
      'hub',
      'walk_on_water',
      'wind_field',
      'shelter',
      'wind_lull',
      'judgement_game',
    ] as const) {
      expect(lib).toContain(name);
    }
  });
});

describe('PolyPath', () => {
  const square = new PolyPath(
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
    true,
  );

  it('walks a closed loop by arc length and wraps', () => {
    expect(square.length).toBe(40);
    expect(square.at(5)).toMatchObject({ x: 5, y: 0, tx: 1, ty: 0, segment: 0 });
    expect(square.at(15)).toMatchObject({ x: 10, y: 5, segment: 1 });
    expect(square.at(45)).toMatchObject({ x: 5, y: 0 });
    expect(square.at(-5)).toMatchObject({ x: 0, y: 5, segment: 3 });
  });

  it('clamps open paths and survives degenerate input', () => {
    const line = new PolyPath([{ x: 0, y: 0 }, { x: 10, y: 0 }], false);
    expect(line.at(99)).toMatchObject({ x: 10, y: 0 });
    expect(new PolyPath([], true).at(3)).toMatchObject({ x: 0, y: 0 });
  });

  it('builds ellipse loops', () => {
    const loop = ellipseLoop(100, 50, 20, 10, 8);
    expect(loop).toHaveLength(8);
    expect(loop[0]).toEqual({ x: 120, y: 50 });
  });
});

describe('crowd flow schedule', () => {
  it('turns on schedule and eases through the turn', () => {
    expect(headingIndex(DEFAULT_FLOW, 0)).toBe(0);
    expect(headingIndex(DEFAULT_FLOW, DEFAULT_FLOW.everyMs + 1)).toBe(1);
    expect(flowAngle(DEFAULT_FLOW, 10)).toBe(DEFAULT_FLOW.angles[0]);
    const mid = flowAngle(DEFAULT_FLOW, DEFAULT_FLOW.everyMs + DEFAULT_FLOW.turnMs / 2);
    expect(mid).not.toBe(DEFAULT_FLOW.angles[1]);
    expect(turnedBetween(DEFAULT_FLOW, DEFAULT_FLOW.everyMs - 1, DEFAULT_FLOW.everyMs + 1)).toBe(true);
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
  });
});

describe("Minos's court", () => {
  it('needs two right answers', () => {
    const game = new JudgementGame([
      { text: 'a', circle: 2 },
      { text: 'b', circle: 3 },
      { text: 'c', circle: 9 },
    ]);
    expect(game.guess(2)?.correct).toBe(true);
    expect(game.guess(5)?.correct).toBe(false);
    expect(game.passed).toBe(false);
    const last = game.guess(12);
    expect(last).toMatchObject({ guess: 9, correct: true, done: true });
    expect(game.passed).toBe(true);
    expect(game.rightCount).toBe(RIGHT_NEEDED);
    expect(game.guess(4)).toBeNull();
  });

  it('picks distinct confessions deterministically', () => {
    const a = pickConfessions(42);
    const b = pickConfessions(42);
    expect(a).toEqual(b);
    expect(new Set(a.map((c) => c.circle)).size).toBe(3);
    expect(DEFAULT_CONFESSIONS.map((c) => c.circle)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(circleNumeral(9)).toBe('IX');
  });
});

describe('stillness', () => {
  it('a cue holds while the player stays put', () => {
    const cue = new CueWatch(3);
    cue.begin(10, 10);
    cue.sample(11, 10, false);
    expect(cue.holding).toBe(true);
    expect(cue.end()).toBe(true);
    cue.begin(10, 10);
    cue.sample(10, 10, true);
    expect(cue.end()).toBe(false);
  });

  it('counts the time spent standing still', () => {
    const t = new StillTimer();
    t.sample(0, 0, 16);
    t.sample(0, 0, 500);
    t.sample(50, 0, 100);
    expect(t.total).toBe(500);
  });
});

describe('wind', () => {
  const lane: WindLane = { rect: { x: 0, y: 0, w: 100, h: 100 }, dir: { x: -1, y: 0 }, strength: 30 };
  const rock = { x: 40, y: 40, w: 20, h: 10 };
  const lee = shelterShadow(rock, lane.dir, 30);

  it('pushes inside a lane, not in the lee, not when calm', () => {
    expect(windAt(80, 80, { lanes: [lane], shelters: [lee], calm: 0, time: 0 }).x).toBeCloseTo(-30);
    expect(windAt(lee.x + 5, lee.y + 5, { lanes: [lane], shelters: [lee], calm: 0, time: 0 })).toEqual({ x: 0, y: 0 });
    expect(windAt(80, 80, { lanes: [lane], shelters: [], calm: 1, time: 0 }).x).toBeCloseTo(0);
    expect(inWind(150, 50, [lane], [])).toBe(false);
  });

  it('a braced Dante (standing still) is pushed, not swept away', () => {
    expect(braceFactor(10_000, null)).toBe(1);
    expect(braceFactor(0, { afterMs: 450, factor: 0.15 })).toBe(1);
    expect(braceFactor(449, { afterMs: 450, factor: 0.15 })).toBe(1);
    expect(braceFactor(450, { afterMs: 450, factor: 0.15 })).toBeCloseTo(0.15);
    expect(braceFactor(5000, {})).toBeCloseTo(0.15);
  });

  it('the lee lies downwind of the rock', () => {
    expect(lee.x + lee.w).toBe(rock.x);
    expect(approachCalm(0, 1, 500, 1)).toBeCloseTo(0.5);
    expect(approachCalm(0.9, 1, 500, 1)).toBe(1);
  });
});
