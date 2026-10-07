/**
 * The Chapter 1 story levels (src/levels/_framework/chapter1): they are what
 * the registry plays for inf01–inf05, they only produce events their scripts
 * name, they cover every `event:` trigger of their canto (so the runner waits
 * for the player instead of firing it), their hooks name real beats, and the
 * Canto V hurricane never walls the way.
 */

import { describe, expect, it } from 'vitest';
import { loadStoryLibrary } from '../../src/story/load';
import { walkStatements } from '../../src/story/ast';
import type { CantoScript } from '../../src/story/types';
import { getLevel } from '../../src/levels/_framework/registry';
import { createChapter1Levels } from '../../src/levels/_framework/chapter1';
import { pathYAt, storySpecOf } from '../../src/levels/_framework/chapter1/common';
import { planHurricane } from '../../src/levels/_framework/chapter1/inf05';
import { decorSolids, planDecor, planGenericLevel } from '../../src/levels/_framework/layout';
import { distToPolyline, reachable, rectContains, walkGrid, type Vec } from '../../src/world/geometry';
import { shelterShadow, windAt } from '../../src/mechanics/logic/wind';

const library = loadStoryLibrary({ includeFixtures: true });

function scriptOf(id: string): CantoScript {
  const s = library.script(id);
  if (!s) throw new Error(`no script ${id}`);
  return s;
}

/** Event ids a script names: DO tags and `event:` triggers. */
function namedEvents(script: CantoScript): { tags: Set<string>; triggers: Set<string> } {
  const tags = new Set<string>();
  const triggers = new Set<string>();
  for (const scene of script.scenes) {
    for (const beat of scene.beats) {
      if (beat.trigger.kind === 'event') triggers.add(beat.trigger.id);
      walkStatements(beat.lines, (st) => {
        if (st.type === 'do') for (const t of st.tags) if (t.kind === 'event') tags.add(t.id);
      });
    }
  }
  return { tags, triggers };
}

describe('Chapter 1 story levels', () => {
  const levels = createChapter1Levels();

  it('are the levels the registry plays for inf01–inf05', () => {
    for (const id of ['inf01', 'inf02', 'inf03', 'inf04', 'inf05']) {
      const level = getLevel(id);
      expect(level?.id).toBe(id);
      expect(storySpecOf(level!)).not.toBeNull();
    }
  });

  for (const level of levels) {
    describe(level.id, () => {
      const script = scriptOf(level.id);
      const { tags, triggers } = namedEvents(script);
      const spec = storySpecOf(level);

      it('only emits events its script names', () => {
        for (const e of level.emits ?? []) expect(tags.has(e) || triggers.has(e), `${e} is not in ${level.id}`).toBe(true);
      });

      it('produces every event its beats wait for', () => {
        const emits = new Set(level.emits ?? []);
        // inf03.banner_turned is the crowd's own (declared by its mechanic), not a trigger.
        for (const t of triggers) expect(emits.has(t), `${t} is never produced`).toBe(true);
      });

      it('hooks only beats of its script', () => {
        const beats = new Set(script.scenes.flatMap((s) => s.beats.map((b) => b.id)));
        for (const id of Object.keys(spec?.hooks ?? {})) expect(beats.has(id), `${id} is not a beat`).toBe(true);
      });
    });
  }
});

describe('Canto V hurricane', () => {
  const layout = planGenericLevel(scriptOf('inf05'));
  const decor = planDecor(layout);
  const storm = planHurricane(layout);
  const solids = [...decorSolids(decor), ...storm.rocks];
  const grid = walkGrid(layout.width, layout.height, solids, 8, { w: 12, h: 8 });

  it('has lanes, four lee rocks, the ruin and the starlings', () => {
    expect(storm.lanes.length).toBeGreaterThanOrEqual(4);
    expect(storm.rocks).toHaveLength(4);
    expect(storm.ruin).not.toBeNull();
    expect(storm.flockArea).not.toBeNull();
  });

  it('keeps the rocks off the path', () => {
    for (const r of storm.rocks) {
      for (const [x, y] of [
        [r.x, r.y + r.h],
        [r.x + r.w, r.y + r.h],
        [r.x + r.w / 2, r.y + r.h],
      ] as const) {
        expect(distToPolyline(x, y, layout.path)).toBeGreaterThan(14);
      }
    }
  });

  it('can still walk from the start to every place', () => {
    for (const p of layout.places) {
      const spawn: Vec = p.spawn ?? { x: p.x + p.w / 2, y: p.y + p.h / 2 };
      expect(reachable(grid, layout.start, spawn), `${p.id} unreachable`).toBe(true);
    }
  });

  it('puts the checkpoints in a rock lee', () => {
    const shelters = storm.rocks.map((r) => shelterShadow(r, { x: -1, y: 0 }));
    for (const spot of [storm.firstRock, storm.shelter]) {
      expect(spot).not.toBeNull();
      expect(shelters.some((s) => rectContains(s, spot!.x, spot!.y))).toBe(true);
      expect(windAt(spot!.x, spot!.y, { lanes: storm.lanes, shelters, calm: 0, time: 0 })).toEqual({ x: 0, y: 0 });
    }
  });

  it('leaves the court, the high rock and its edge without wind', () => {
    for (const id of ['inf05_stair', 'inf05_court', 'inf05_court_bench', 'inf05_lee']) {
      const p = layout.places.find((q) => q.id === id)!;
      const x = p.x + p.w / 2;
      const v = windAt(x, pathYAt(layout.path, x), { lanes: storm.lanes, shelters: [], calm: 0, time: 0 });
      expect(Math.hypot(v.x, v.y), id).toBe(0);
    }
  });

  it('keeps the ruin above the path', () => {
    const r = storm.ruin!;
    const x = r.x + r.w / 2;
    expect(r.y + r.h).toBeLessThan(pathYAt(layout.path, x) - 14);
  });
});
