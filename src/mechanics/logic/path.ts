/**
 * Polyline paths walked by arc length: the banner's loop (crowd_flow), swarm
 * patrols, a line of shades circling a rock. Closed paths wrap around.
 *
 * Owner: team D (mechanics). Pure: no Phaser.
 */

import type { Vec } from '../../world/geometry';

export interface PathPoint {
  readonly x: number;
  readonly y: number;
  /** Unit tangent (direction of travel). */
  readonly tx: number;
  readonly ty: number;
  /** Index of the segment the point lies on. */
  readonly segment: number;
}

export class PolyPath {
  readonly points: readonly Vec[];
  readonly closed: boolean;
  /** Cumulative length at the start of each segment. */
  private readonly starts: number[] = [];
  private readonly lengths: number[] = [];
  readonly length: number;

  constructor(points: readonly Vec[], closed = true) {
    const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    this.points = pts.length > 0 ? pts : [{ x: 0, y: 0 }];
    this.closed = closed && this.points.length > 2;
    let total = 0;
    const n = this.segmentCount;
    for (let i = 0; i < n; i++) {
      const a = this.points[i] as Vec;
      const b = this.points[(i + 1) % this.points.length] as Vec;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.starts.push(total);
      this.lengths.push(len);
      total += len;
    }
    this.length = total;
  }

  get segmentCount(): number {
    const n = this.points.length;
    if (n < 2) return 0;
    return this.closed ? n : n - 1;
  }

  /** The point at arc length `s` (wrapped on closed paths, clamped on open ones). */
  at(s: number): PathPoint {
    const n = this.segmentCount;
    if (n === 0 || this.length <= 0) {
      const p = this.points[0] as Vec;
      return { x: p.x, y: p.y, tx: 1, ty: 0, segment: 0 };
    }
    let d = s;
    if (this.closed) d = ((d % this.length) + this.length) % this.length;
    else d = Math.max(0, Math.min(this.length, d));
    // Binary search the segment.
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((this.starts[mid] as number) <= d) lo = mid;
      else hi = mid - 1;
    }
    const i = lo;
    const a = this.points[i] as Vec;
    const b = this.points[(i + 1) % this.points.length] as Vec;
    const len = this.lengths[i] as number;
    const t = len > 0 ? (d - (this.starts[i] as number)) / len : 0;
    const tx = len > 0 ? (b.x - a.x) / len : 1;
    const ty = len > 0 ? (b.y - a.y) / len : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx, ty, segment: i };
  }
}

/** A closed loop approximating an ellipse (crowd loops, circling shades). */
export function ellipseLoop(cx: number, cy: number, rx: number, ry: number, steps = 16, startAngle = 0): Vec[] {
  const out: Vec[] = [];
  const n = Math.max(3, Math.round(steps));
  for (let i = 0; i < n; i++) {
    const a = startAngle + (i / n) * Math.PI * 2;
    out.push({ x: Math.round(cx + Math.cos(a) * rx), y: Math.round(cy + Math.sin(a) * ry) });
  }
  return out;
}
