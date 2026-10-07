/**
 * The generic fallback level (docs/ENGINE.md §8.2) for every real script and
 * the fixture: every place exists and can be reached on foot, every `talk:`
 * speaker stands somewhere reachable, ambient mechanics never wall the way.
 */

import { describe, expect, it } from 'vitest';
import { loadStoryLibrary } from '../../src/story/load';
import type { CantoScript } from '../../src/story/types';
import { decorSolids, planDecor, planGenericLevel, themeForPlace, virgilOnStage, placesOfBeat } from '../../src/levels/_framework/layout';
import { darknessFor, planAmbience, placeBands } from '../../src/levels/_framework/ambient';
import { reachable, rectContains, walkGrid, type Vec } from '../../src/world/geometry';
import { shelterShadow } from '../../src/mechanics/logic/wind';

const library = loadStoryLibrary({ includeFixtures: true });
const scripts: CantoScript[] = library.cantoIds.map((id) => library.script(id)).filter((s): s is CantoScript => s !== null);

describe('generic layout', () => {
  it('has the five chapter scripts and the fixture', () => {
    const ids = scripts.map((s) => s.id);
    for (const id of ['inf01', 'inf02', 'inf03', 'inf04', 'inf05', 'inf99']) expect(ids).toContain(id);
  });

  for (const script of scripts) {
    describe(script.id, () => {
      const layout = planGenericLevel(script);
      const decor = planDecor(layout);
      const ambient = planAmbience(layout, decor);
      const solids = [...decorSolids(decor), ...(ambient.wind?.rocks ?? [])];
      const grid = walkGrid(layout.width, layout.height, solids, 8, { w: 12, h: 8 });

      it('lays out every @place and enter: place of the script', () => {
        const ids = new Set(layout.places.map((p) => p.id));
        for (const scene of script.scenes) for (const beat of scene.beats) for (const p of placesOfBeat(beat)) expect(ids.has(p)).toBe(true);
      });

      it('can walk from the start to every place', () => {
        for (const p of layout.places) {
          const spawn: Vec = p.spawn ?? { x: p.x + p.w / 2, y: p.y + p.h / 2 };
          expect(reachable(grid, layout.start, spawn), `${p.id} unreachable`).toBe(true);
        }
      });

      it('puts every talk: speaker in the world where Dante can reach them', () => {
        for (const scene of script.scenes) {
          for (const beat of scene.beats) {
            const t = beat.trigger;
            if (t.kind !== 'talk' || t.speaker === 'VIRGIL' || t.speaker === 'DANTE') continue;
            const npc = layout.npcs.find((n) => n.speaker === t.speaker && n.talkable);
            expect(npc, `${t.speaker} missing`).toBeDefined();
            // Dante talks from beside them: some spot within talking reach is walkable.
            const near = [
              { x: npc!.x - 18, y: npc!.y },
              { x: npc!.x + 18, y: npc!.y },
              { x: npc!.x, y: npc!.y + 14 },
              { x: npc!.x, y: npc!.y - 14 },
            ];
            expect(near.some((q) => reachable(grid, layout.start, q)), `${t.speaker} out of reach`).toBe(true);
          }
        }
      });

      it('keeps solids off the place spawns', () => {
        for (const p of layout.places) {
          const s = p.spawn ?? { x: p.x + p.w / 2, y: p.y + p.h / 2 };
          expect(solids.some((r) => rectContains(r, s.x, s.y)), `${p.id} spawn is inside a solid`).toBe(false);
        }
      });

      it('keeps fear hollows off the spawns', () => {
        for (const z of ambient.fear?.zones ?? []) {
          for (const p of layout.places) {
            const s = p.spawn ?? { x: p.x + p.w / 2, y: p.y + p.h / 2 };
            expect(rectContains(z, s.x, s.y)).toBe(false);
          }
        }
      });

      it('has a scene home for every scene after the opening page', () => {
        for (const scene of script.scenes.slice(1)) expect(scene.id in layout.sceneHome).toBe(true);
      });
    });
  }
});

describe('Chapter 1 specifics', () => {
  const byId = (id: string): CantoScript => {
    const s = scripts.find((x) => x.id === id);
    if (!s) throw new Error(id);
    return s;
  };

  it('themes places by their words', () => {
    expect(themeForPlace('inf01_wood_edge', 'inf01')).toBe('forest_edge');
    expect(themeForPlace('inf03_plain_edge', 'inf03')).toBe('plain');
    expect(themeForPlace('inf05_lee_edge', 'inf05')).toBe('storm');
    expect(themeForPlace('inf04_rivulet', 'inf04')).toBe('ford');
    expect(themeForPlace('inf03_shore', 'inf03')).toBe('shore');
    expect(themeForPlace('inf01_slope_lower', 'inf01')).toBe('slope');
  });

  it('keeps Virgil away in Canto I until the shade appears', () => {
    const layout = planGenericLevel(byId('inf01'));
    expect(layout.virgilFrom).toBe('inf01.s6.b1');
    expect(virgilOnStage(layout, 'inf01.s3.b1')).toBe(false);
    expect(virgilOnStage(layout, 'inf01.s6.b1')).toBe(true);
    expect(virgilOnStage(layout, 'inf01.s8.b2')).toBe(true);
  });

  it('places the beasts where the poem shows them', () => {
    const layout = planGenericLevel(byId('inf01'));
    const at = (s: string): string | null => layout.npcs.find((n) => n.speaker === s)?.place ?? null;
    expect(at('PANTHER')).toBe('inf01_slope_lower');
    expect(at('LION')).toBe('inf01_slope_upper');
    expect(at('SHE_WOLF')).toBe('inf01_slope_upper');
  });

  it('shows Aeneas in Canto II only as a vision (no body on the hillside)', () => {
    const layout = planGenericLevel(byId('inf02'));
    expect(layout.npcs.some((n) => n.speaker === 'AENEAS')).toBe(false);
  });

  it('puts the souls of Canto III on the shore and the Neutrals on the plain', () => {
    const layout = planGenericLevel(byId('inf03'));
    expect(layout.npcs.find((n) => n.speaker === 'SOUL')?.place).toBe('inf03_shore');
    expect(layout.themes[layout.npcs.find((n) => n.speaker === 'NEUTRAL')?.place ?? '']).toBe('plain');
    expect(layout.npcs.find((n) => n.speaker === 'CHARON')?.place).toBe('inf03_shore');
  });

  it('dresses each canto with its ambient mechanics', () => {
    const a1 = planAmbience(planGenericLevel(byId('inf01')), planDecor(planGenericLevel(byId('inf01'))));
    expect(a1.darkness).not.toBeNull();
    expect(a1.fear).not.toBeNull();
    expect(a1.wind).toBeNull();
    const l3 = planGenericLevel(byId('inf03'));
    const a3 = planAmbience(l3, planDecor(l3));
    expect(a3.crowd).not.toBeNull();
    expect(a3.swarm).not.toBeNull();
    expect(a3.inscription).not.toBeNull();
    const l4 = planGenericLevel(byId('inf04'));
    const a4 = planAmbience(l4, planDecor(l4));
    expect(a4.water.length).toBe(1);
    const l5 = planGenericLevel(byId('inf05'));
    const a5 = planAmbience(l5, planDecor(l5));
    expect(a5.wind).not.toBeNull();
    expect(a5.wind!.rocks.length).toBeGreaterThan(0);
  });

  it('gives every wind rock a lee', () => {
    const l5 = planGenericLevel(byId('inf05'));
    const a5 = planAmbience(l5, planDecor(l5));
    for (const rock of a5.wind?.rocks ?? []) {
      const lee = shelterShadow(rock, { x: -1, y: 0 });
      expect(lee.x + lee.w).toBe(rock.x);
    }
  });

  it('bands cover the whole map without gaps', () => {
    const layout = planGenericLevel(byId('inf04'));
    const bands = placeBands(layout);
    expect(bands[0]!.x).toBe(0);
    for (let i = 1; i < bands.length; i++) expect(bands[i]!.x).toBe(bands[i - 1]!.x + bands[i - 1]!.w);
    expect(bands[bands.length - 1]!.x + bands[bands.length - 1]!.w).toBe(layout.width);
  });

  it('keeps Limbo lit and the Second Circle dark', () => {
    expect(darknessFor('inf04', 'meadow')).toBe(0);
    expect(darknessFor('inf05', 'storm')).toBeGreaterThan(0.5);
    expect(darknessFor('inf03', 'slope')).toBeGreaterThan(0.5);
  });
});
