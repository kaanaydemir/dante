/**
 * Procedural pixel painting for nature props (trees, rocks, bushes), effects
 * and vignettes: blobs lit from the upper left, quantised to a few tones with
 * ordered dithering, then outlined. Deterministic (seeded).
 *
 * Owner: team D (art). Pure: no Phaser, no DOM.
 */

import { seededRandom } from '../world/geometry';
import type { PixelTarget } from './bitmap';

/** 4x4 Bayer matrix (0..15) for ordered dithering. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function bayer(x: number, y: number): number {
  return ((BAYER4[((y & 3) << 2) | (x & 3)] as number) + 0.5) / 16;
}

/** Pick one of `tones` (dark -> light) for a light level 0..1, dithered at the boundaries. */
export function ditherTone(tones: readonly number[], level: number, x: number, y: number): number {
  const n = tones.length;
  const v = Math.max(0, Math.min(0.9999, level)) * (n - 1);
  const i = Math.floor(v);
  const frac = v - i;
  const pick = frac > bayer(x, y) ? i + 1 : i;
  return tones[Math.min(n - 1, pick)] as number;
}

export interface Blob {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Vertical squash (1 = round). */
  readonly ry?: number;
}

/**
 * Paints a lumpy mass made of blobs (a canopy, a boulder), shaded by a fake
 * normal toward the light (upper left) and quantised to `tones`.
 */
export function paintMass(
  t: PixelTarget,
  blobs: readonly Blob[],
  tones: readonly number[],
  opts: { readonly light?: { x: number; y: number }; readonly flatBottom?: number; readonly ambient?: number; readonly seed?: number } = {},
): void {
  const light = opts.light ?? { x: -0.6, y: -0.8 };
  const ambient = opts.ambient ?? 0.25;
  const rnd = seededRandom(opts.seed ?? 7);
  const noise: number[] = Array.from({ length: t.w * t.h }, () => rnd());
  for (let y = 0; y < t.h; y++) {
    if (opts.flatBottom !== undefined && y > opts.flatBottom) continue;
    for (let x = 0; x < t.w; x++) {
      let best = -1;
      let nx = 0;
      let ny = 0;
      for (const b of blobs) {
        const ry = b.r * (b.ry ?? 1);
        const dx = (x + 0.5 - b.x) / b.r;
        const dy = (y + 0.5 - b.y) / ry;
        const d = dx * dx + dy * dy;
        if (d <= 1) {
          const inside = 1 - d;
          if (inside > best) {
            best = inside;
            nx = dx;
            ny = dy;
          }
        }
      }
      if (best < 0) continue;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lambert = Math.max(0, -(nx * light.x + ny * light.y) * 0.8 + nz * 0.45);
      const n = (noise[y * t.w + x] as number) * 0.18 - 0.09;
      const level = ambient + lambert * (1 - ambient) + n;
      t.set(x, y, ditherTone(tones, level, x, y), 1);
    }
  }
}

/** Darkens every opaque pixel that touches transparency into an outline of `color`. */
export function outline(t: PixelTarget, color: number): void {
  const edge: Array<[number, number]> = [];
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      if (t.alphaAt(x, y) < 0.5) continue;
      if (
        t.alphaAt(x - 1, y) < 0.5 ||
        t.alphaAt(x + 1, y) < 0.5 ||
        t.alphaAt(x, y - 1) < 0.5 ||
        t.alphaAt(x, y + 1) < 0.5 ||
        x === 0 ||
        y === 0 ||
        x === t.w - 1 ||
        y === t.h - 1
      ) {
        edge.push([x, y]);
      }
    }
  }
  for (const [x, y] of edge) t.set(x, y, color, 1);
}

/** A tapered trunk from (x, yBottom) up to yTop, lit on its left side, with bark streaks. */
export function paintTrunk(
  t: PixelTarget,
  x: number,
  yTop: number,
  yBottom: number,
  wBottom: number,
  wTop: number,
  tones: readonly number[],
  seed = 3,
  lean = 0,
): void {
  const rnd = seededRandom(seed);
  for (let y = yTop; y <= yBottom; y++) {
    const k = (y - yTop) / Math.max(1, yBottom - yTop);
    const w = wTop + (wBottom - wTop) * k * k;
    const cx = x + lean * (1 - k);
    const x0 = Math.round(cx - w / 2);
    const x1 = Math.round(cx + w / 2);
    for (let xx = x0; xx < x1; xx++) {
      const u = (xx - x0) / Math.max(1, x1 - x0);
      let level = 0.75 - u * 0.65;
      if (rnd() < 0.12) level -= 0.25;
      t.set(xx, y, ditherTone(tones, level, xx, y), 1);
    }
  }
  // Roots.
  const yb = yBottom;
  for (const dx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      t.set(Math.round(x + dx * (wBottom / 2 + i)), yb - (i > 1 ? 0 : 1), tones[0] as number, 1);
    }
  }
}

/** A crooked branch (dead trees, bare boughs). */
export function paintBranch(t: PixelTarget, x0: number, y0: number, x1: number, y1: number, color: number, thick = 1): void {
  for (let o = 0; o < thick; o++) t.line(x0 + o, y0, x1 + o, y1, color, 1);
}

/** Radial falloff alpha: 1 at the centre to 0 at radius, with a soft knee. */
export function radialAlpha(d: number, hardness = 0.35): number {
  if (d >= 1) return 0;
  if (d <= hardness) return 1;
  const k = (d - hardness) / (1 - hardness);
  return 1 - k * k * (3 - 2 * k);
}
