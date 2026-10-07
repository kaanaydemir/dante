/**
 * The infernal hurricane (Canto V; GDD 4.3, `WindField`): wind lanes push the
 * player; rocks cast a wind shadow downwind (`shelter`); the wind can be
 * stilled for a while (`wind_lull`, V 96) or calmed by a Still verse.
 *
 * Owner: team D (mechanics). Pure: no Phaser.
 */

import type { Rect } from '../../runtime/contracts';
import { normalize, rectContains, type Vec } from '../../world/geometry';

export interface WindLane {
  readonly rect: Rect;
  /** Direction the wind blows (normalised by the field). */
  readonly dir: Vec;
  /** Push in px per second at full strength. */
  readonly strength: number;
  /** Optional gusts: strength swings by ±gust over `gustMs`. */
  readonly gust?: number;
  readonly gustMs?: number;
}

/** The sheltered area behind a rock: a box downwind of it, as wide as the rock. */
export function shelterShadow(rock: Rect, dir: Vec, length = 56): Rect {
  const d = normalize(dir.x, dir.y);
  if (Math.abs(d.x) >= Math.abs(d.y)) {
    return d.x >= 0
      ? { x: rock.x + rock.w, y: rock.y - 6, w: length, h: rock.h + 12 }
      : { x: rock.x - length, y: rock.y - 6, w: length, h: rock.h + 12 };
  }
  return d.y >= 0
    ? { x: rock.x - 6, y: rock.y + rock.h, w: rock.w + 12, h: length }
    : { x: rock.x - 6, y: rock.y - length, w: rock.w + 12, h: length };
}

export interface WindQuery {
  readonly lanes: readonly WindLane[];
  /** Sheltered rectangles (rock shadows). */
  readonly shelters: readonly Rect[];
  /** 0 = full wind, 1 = completely still (lull or a Still verse). */
  readonly calm: number;
  /** Time in ms (for gusts). */
  readonly time: number;
}

/** Wind velocity (px/s) acting at a point. */
export function windAt(x: number, y: number, q: WindQuery): Vec {
  for (const s of q.shelters) if (rectContains(s, x, y)) return { x: 0, y: 0 };
  let vx = 0;
  let vy = 0;
  const calm = Math.max(0, Math.min(1, q.calm));
  for (const lane of q.lanes) {
    if (!rectContains(lane.rect, x, y)) continue;
    const d = normalize(lane.dir.x, lane.dir.y);
    const gust = lane.gust && lane.gustMs ? lane.gust * Math.sin((q.time / lane.gustMs) * Math.PI * 2) : 0;
    const s = Math.max(0, lane.strength + gust) * (1 - calm);
    vx += d.x * s;
    vy += d.y * s;
  }
  return { x: vx, y: vy };
}

/** Is a point inside any lane (whatever the calm)? */
export function inWind(x: number, y: number, lanes: readonly WindLane[], shelters: readonly Rect[]): boolean {
  for (const s of shelters) if (rectContains(s, x, y)) return false;
  return lanes.some((l) => rectContains(l.rect, x, y));
}

/** Eases `current` calm toward `target` at `perSecond` (lulls fade in and out). */
export function approachCalm(current: number, target: number, dtMs: number, perSecond = 0.8): number {
  const step = (perSecond * dtMs) / 1000;
  if (Math.abs(target - current) <= step) return target;
  return current + Math.sign(target - current) * step;
}

/** How braced Dante is (bible §7.5 "keep low": pushed, not swept away). */
export interface WindBrace {
  /** Standing still this long (ms), he braces (default 450). */
  readonly afterMs?: number;
  /** The share of the push that still reaches him then (default 0.15). */
  readonly factor?: number;
}

/** The wind's push multiplier after standing still for `stillMs` (1 = the full push; no brace: always 1). */
export function braceFactor(stillMs: number, brace: WindBrace | null | undefined): number {
  if (!brace) return 1;
  const after = brace.afterMs ?? 450;
  return stillMs >= after ? Math.max(0, Math.min(1, brace.factor ?? 0.15)) : 1;
}
