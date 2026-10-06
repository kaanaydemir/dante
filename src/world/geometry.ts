/**
 * Small geometry kit for the world: rectangles, vectors, axis-separated
 * collision against solid rectangles, and a walkability grid used by tests and
 * by the generic level planner.
 *
 * Owner: team D (world). Pure: no Phaser, no DOM.
 */

import type { Rect } from '../runtime/contracts';

export interface Vec {
  readonly x: number;
  readonly y: number;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function normalize(x: number, y: number): Vec {
  const len = Math.hypot(x, y);
  return len > 1e-9 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectCenter(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Grow (or shrink, with a negative margin) a rectangle on every side. */
export function inflate(r: Rect, margin: number): Rect {
  return { x: r.x - margin, y: r.y - margin, w: r.w + margin * 2, h: r.h + margin * 2 };
}

/** Closest point of `r` to (x, y). */
export function closestPointInRect(r: Rect, x: number, y: number): Vec {
  return { x: clamp(x, r.x, r.x + r.w), y: clamp(y, r.y, r.y + r.h) };
}

/** Distance from (x, y) to the rectangle (0 inside). */
export function distToRect(r: Rect, x: number, y: number): number {
  const p = closestPointInRect(r, x, y);
  return Math.hypot(p.x - x, p.y - y);
}

/** Distance from point P to segment AB. */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 > 0 ? clamp(((px - ax) * vx + (py - ay) * vy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** Distance from P to a polyline. Infinity for an empty line. */
export function distToPolyline(px: number, py: number, line: readonly Vec[]): number {
  if (line.length === 0) return Number.POSITIVE_INFINITY;
  if (line.length === 1) {
    const p = line[0] as Vec;
    return Math.hypot(px - p.x, py - p.y);
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i] as Vec;
    const b = line[i + 1] as Vec;
    best = Math.min(best, distToSegment(px, py, a.x, a.y, b.x, b.y));
  }
  return best;
}

export interface MoveResult {
  readonly x: number;
  readonly y: number;
  /** A solid or the bounds stopped the horizontal / vertical part of the move. */
  readonly blockedX: boolean;
  readonly blockedY: boolean;
}

/**
 * Moves a box (given by its top-left corner and size) by (dx, dy) against solid
 * rectangles and optional bounds, one axis at a time, so it slides along walls.
 * Long moves are split into steps of at most `maxStep` px so thin walls are not
 * tunnelled through. A box that already overlaps a solid may move out of it.
 */
export function moveBox(
  box: Rect,
  dx: number,
  dy: number,
  solids: readonly Rect[],
  bounds: Rect | null,
  maxStep = 4,
): MoveResult {
  let x = box.x;
  let y = box.y;
  let blockedX = false;
  let blockedY = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(0.5, maxStep)));
  const sx = dx / steps;
  const sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0 && !blockedX) {
      const nx = x + sx;
      const hits = newHits({ x: nx, y, w: box.w, h: box.h }, solids, { x, y, w: box.w, h: box.h });
      if (hits.length > 0) {
        // The most restrictive edge among every solid entered (never behind the start).
        let limit = nx;
        for (const s of hits) limit = sx > 0 ? Math.min(limit, s.x - box.w) : Math.max(limit, s.x + s.w);
        x = sx > 0 ? Math.max(x, limit) : Math.min(x, limit);
        blockedX = true;
      } else {
        x = nx;
      }
    }
    if (sy !== 0 && !blockedY) {
      const ny = y + sy;
      const hits = newHits({ x, y: ny, w: box.w, h: box.h }, solids, { x, y, w: box.w, h: box.h });
      if (hits.length > 0) {
        let limit = ny;
        for (const s of hits) limit = sy > 0 ? Math.min(limit, s.y - box.h) : Math.max(limit, s.y + s.h);
        y = sy > 0 ? Math.max(y, limit) : Math.min(y, limit);
        blockedY = true;
      } else {
        y = ny;
      }
    }
  }
  if (bounds) {
    const cx = clamp(x, bounds.x, bounds.x + bounds.w - box.w);
    const cy = clamp(y, bounds.y, bounds.y + bounds.h - box.h);
    if (cx !== x) blockedX = true;
    if (cy !== y) blockedY = true;
    x = cx;
    y = cy;
  }
  return { x, y, blockedX, blockedY };
}

/** Solids the moved box overlaps that the box did not already overlap before the move. */
function newHits(moved: Rect, solids: readonly Rect[], before: Rect): Rect[] {
  const out: Rect[] = [];
  for (const s of solids) {
    if (rectsOverlap(moved, s) && !rectsOverlap(before, s)) out.push(s);
  }
  return out;
}

/** True when the box overlaps any solid. */
export function overlapsAny(box: Rect, solids: readonly Rect[]): boolean {
  for (const s of solids) if (rectsOverlap(box, s)) return true;
  return false;
}

/**
 * Nearest free position for a box centred at (x, y): spirals outward in
 * `step` px rings until the box overlaps no solid (or gives up and returns
 * the start). Used when a teleport lands inside a wall.
 */
export function findFreeSpot(
  x: number,
  y: number,
  w: number,
  h: number,
  solids: readonly Rect[],
  bounds: Rect | null,
  step = 8,
  maxRadius = 160,
): Vec {
  const fits = (cx: number, cy: number): boolean => {
    const b = { x: cx - w / 2, y: cy - h / 2, w, h };
    if (bounds && (b.x < bounds.x || b.y < bounds.y || b.x + b.w > bounds.x + bounds.w || b.y + b.h > bounds.y + bounds.h)) {
      return false;
    }
    return !overlapsAny(b, solids);
  };
  if (fits(x, y)) return { x, y };
  for (let r = step; r <= maxRadius; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cx = Math.round(x + Math.cos(a) * r);
      const cy = Math.round(y + Math.sin(a) * r);
      if (fits(cx, cy)) return { x: cx, y: cy };
    }
  }
  return { x, y };
}

// ---------------------------------------------------------------------------
// Walkability grid (tests, planner checks)
// ---------------------------------------------------------------------------

export interface WalkGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  /** true = blocked. Index: row * cols + col. */
  readonly blocked: readonly boolean[];
}

/** Rasterises solids into a grid; a cell is blocked when a box of `agent` size centred in it would overlap a solid. */
export function walkGrid(width: number, height: number, solids: readonly Rect[], cell = 8, agent = { w: 10, h: 6 }): WalkGrid {
  const cols = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const blocked: boolean[] = new Array<boolean>(cols * rows).fill(false);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cell + cell / 2;
      const cy = r * cell + cell / 2;
      blocked[r * cols + c] = overlapsAny({ x: cx - agent.w / 2, y: cy - agent.h / 2, w: agent.w, h: agent.h }, solids);
    }
  }
  return { cols, rows, cell, blocked };
}

/** Breadth-first reachability between two points on a walk grid. */
export function reachable(grid: WalkGrid, from: Vec, to: Vec): boolean {
  const idx = (p: Vec): number => {
    const c = clamp(Math.floor(p.x / grid.cell), 0, grid.cols - 1);
    const r = clamp(Math.floor(p.y / grid.cell), 0, grid.rows - 1);
    return r * grid.cols + c;
  };
  const start = idx(from);
  const goal = idx(to);
  if (grid.blocked[start] || grid.blocked[goal]) return false;
  const seen = new Uint8Array(grid.cols * grid.rows);
  const queue: number[] = [start];
  seen[start] = 1;
  while (queue.length > 0) {
    const cur = queue.shift() as number;
    if (cur === goal) return true;
    const c = cur % grid.cols;
    const r = (cur - c) / grid.cols;
    const next = [
      c > 0 ? cur - 1 : -1,
      c < grid.cols - 1 ? cur + 1 : -1,
      r > 0 ? cur - grid.cols : -1,
      r < grid.rows - 1 ? cur + grid.cols : -1,
    ];
    for (const n of next) {
      if (n >= 0 && !seen[n] && !grid.blocked[n]) {
        seen[n] = 1;
        queue.push(n);
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Deterministic randomness (level decoration, crowds)
// ---------------------------------------------------------------------------

/** mulberry32: small, fast, deterministic PRNG in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string (seeds per canto / per place). */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
