/**
 * Ambient mechanics for the generic level (docs/ENGINE.md §8.2): each canto's
 * front matter lists its mechanics (bible §7.0); the generic level dresses
 * itself with the ones that make sense without a hand-made level — darkness,
 * fear hollows, the hurricane's lanes and lee rocks, the runners behind the
 * banner and their wasps, a walkable stream, a carved inscription. They are
 * gentle by design (Resolve floors, no events), so a canto played on the
 * generic level always feels like itself and can never trap the reader.
 * Story moments that measure play (held ground, waited dawn …) belong to the
 * hand-made levels.
 *
 * Owner: team D (levels framework). Pure: no Phaser (unit-tested).
 */

import type { Rect } from '../../runtime/contracts';
import { rectCenter, type Vec } from '../../world/geometry';
import type { WindLane } from '../../mechanics/logic/wind';
import { ellipseLoop } from '../../mechanics/logic/path';
import type { DecorPlan, GenericLayout, PlaceTheme } from './layout';

export interface AmbientPlan {
  readonly darkness: { readonly zones: readonly { readonly rect: Rect; readonly alpha: number }[]; readonly radius: number } | null;
  readonly fear: { readonly zones: readonly Rect[]; readonly floor: number } | null;
  readonly wind: { readonly lanes: readonly WindLane[]; readonly rocks: readonly Rect[]; readonly flock: boolean } | null;
  readonly crowd: { readonly path: readonly Vec[] } | null;
  readonly swarm: { readonly count: number } | null;
  readonly water: readonly Rect[];
  readonly inscription: { readonly area: Rect; readonly at: Vec; readonly width: number } | null;
}

/** Darkness of a theme in a canto (0 = lit). Cantos III and V are dark everywhere (III 22, V 28). */
export function darknessFor(cantoId: string, theme: PlaceTheme): number {
  if (cantoId === 'inf03') return theme === 'rest' ? 0.55 : 0.72;
  if (cantoId === 'inf05') return theme === 'court' || theme === 'rest' ? 0.3 : theme === 'gate' ? 0.5 : 0.76;
  switch (theme) {
    case 'forest':
      return 0.78;
    case 'brink':
    case 'storm':
      return 0.72;
    case 'valley':
    case 'plain':
    case 'gate':
    case 'shore':
    case 'island':
      return 0.6;
    case 'forest_edge':
      return 0.5;
    default:
      return 0;
  }
}

/** Themes whose ground breeds fear (hollows where no light enters). */
const FEARFUL: ReadonlySet<PlaceTheme> = new Set<PlaceTheme>(['forest', 'valley', 'brink', 'storm', 'plain', 'gate', 'shore']);

/** Vertical bands, one per place, meeting halfway between neighbouring places. */
export function placeBands(layout: GenericLayout): Rect[] {
  const centres = layout.places.map((p) => p.x + p.w / 2);
  return layout.places.map((_, i) => {
    const left = i === 0 ? 0 : Math.round(((centres[i - 1] as number) + (centres[i] as number)) / 2);
    const right = i === centres.length - 1 ? layout.width : Math.round(((centres[i] as number) + (centres[i + 1] as number)) / 2);
    return { x: left, y: 0, w: right - left, h: layout.height };
  });
}

export function planAmbience(layout: GenericLayout, decor: DecorPlan): AmbientPlan {
  const has = (m: string): boolean => layout.mechanics.includes(m);
  const bands = placeBands(layout);
  const themeOf = (i: number): PlaceTheme => layout.themes[layout.places[i]?.id ?? ''] ?? 'plain';

  // Darkness: per place band.
  let darkness: AmbientPlan['darkness'] = null;
  if (has('darkness')) {
    const zones = bands
      .map((rect, i) => ({ rect, alpha: darknessFor(layout.cantoId, themeOf(i)) }))
      .filter((z) => z.alpha > 0);
    if (zones.length > 0) darkness = { zones, radius: 84 };
  }

  // Fear: a hollow beside the way in every other fearful place.
  let fear: AmbientPlan['fear'] = null;
  if (has('fear')) {
    const zones: Rect[] = [];
    let k = 0;
    layout.places.forEach((p, i) => {
      if (!FEARFUL.has(themeOf(i))) return;
      if (k++ % 2 === 1) return;
      zones.push({ x: p.x + p.w - 84, y: Math.max(8, p.y - 34), w: 76, h: 44 });
    });
    if (zones.length > 0) fear = { zones, floor: 2 };
  }

  // Wind: a headwind over every storm place, a lee rock on the way in each.
  let wind: AmbientPlan['wind'] = null;
  if (has('wind_field')) {
    const lanes: WindLane[] = [];
    const rocks: Rect[] = [];
    layout.places.forEach((p, i) => {
      if (themeOf(i) !== 'storm') return;
      const band = bands[i] as Rect;
      lanes.push({ rect: { ...band }, dir: { x: -1, y: i % 2 === 0 ? 0.25 : -0.25 }, strength: 34, gust: 12, gustMs: 2600 });
      const c = rectCenter(p);
      rocks.push({ x: Math.round(c.x + 24), y: Math.round(c.y - 18), w: 40, h: 12 });
    });
    if (lanes.length > 0) wind = { lanes, rocks, flock: lanes.length >= 2 };
  }

  // The runners behind the banner: one loop crossing the way twice.
  let crowd: AmbientPlan['crowd'] = null;
  let swarm: AmbientPlan['swarm'] = null;
  if (has('crowd_flow')) {
    const plains = layout.places.filter((p) => (layout.themes[p.id] ?? 'plain') === 'plain');
    const host = plains[1] ?? plains[0] ?? layout.places[Math.floor(layout.places.length / 2)];
    if (host) {
      const c = rectCenter(host);
      const ry = Math.min(110, Math.max(40, Math.min(c.y - 20, layout.height - c.y - 20)));
      crowd = { path: ellipseLoop(c.x, c.y, 150, ry, 18) };
    }
    if (has('swarm') && crowd) swarm = { count: 3 };
  } else if (has('swarm')) {
    swarm = { count: 2 };
  }

  // Shallow water that holds whoever walks on it.
  const water = has('walk_on_water') ? decor.fords.map((f) => ({ ...f.rect })) : [];

  // The words over the gate.
  let inscription: AmbientPlan['inscription'] = null;
  if (has('inscription')) {
    const gate = layout.places.find((p) => layout.themes[p.id] === 'gate');
    if (gate) {
      const c = rectCenter(gate);
      // The gate prop stands at (c.x + 8, gate.y + 18), 64 px high: its lintel's letters are 36–41 px above the place.
      inscription = { area: { x: Math.round(c.x - 60), y: gate.y, w: 120, h: gate.h }, at: { x: Math.round(c.x + 8), y: gate.y - 41 }, width: 46 };
    }
  }

  return { darkness, fear, wind, crowd, swarm, water, inscription };
}
