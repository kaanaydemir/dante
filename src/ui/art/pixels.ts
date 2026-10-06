/**
 * Tiny pixel-art toolkit for procedural engravings and portraits: a tone map
 * (0 = paper, 1 = ink) rendered with Doré-like hatching, plus ASCII pixel maps.
 * No Phaser; draws into ImageData.
 *
 * Owner: team C (presentation).
 */

import { rng } from './paint';

export class ToneMap {
  readonly data: Float32Array;

  constructor(
    readonly w: number,
    readonly h: number,
    initial = 0,
  ) {
    this.data = new Float32Array(w * h).fill(initial);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x] ?? 0;
  }

  set(x: number, y: number, v: number): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    this.data[yi * this.w + xi] = Math.max(0, Math.min(1, v));
  }

  /** Apply `f(x, y, current)` to every pixel. */
  map(f: (x: number, y: number, v: number) => number): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        this.data[i] = Math.max(0, Math.min(1, f(x, y, this.data[i] ?? 0)));
      }
    }
  }

  /** Vertical gradient from `top` to `bottom` tone. */
  vertical(top: number, bottom: number): void {
    this.map((_x, y) => top + (bottom - top) * (y / Math.max(1, this.h - 1)));
  }

  rect(x0: number, y0: number, w: number, h: number, v: number): void {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y0 + h)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x0 + w)); x++) this.data[y * this.w + x] = v;
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, v: number | ((d: number) => number)): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1) this.data[y * this.w + x] = typeof v === 'function' ? v(Math.sqrt(d)) : v;
      }
    }
  }

  /** Scanline polygon fill. */
  polygon(points: readonly (readonly [number, number])[], v: number): void {
    if (points.length < 3) return;
    const ys = points.map((p) => p[1]);
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i] as readonly [number, number];
        const b = points[(i + 1) % points.length] as readonly [number, number];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
          xs.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil((xs[k] as number) - 0.5)); x <= Math.min(this.w - 1, Math.floor((xs[k + 1] as number) - 0.5)); x++) {
          this.data[y * this.w + x] = v;
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, v: number, width = 1): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      for (let k = 0; k < width; k++) this.set(x + k, y, v);
    }
  }

  /** Add seeded noise (±amount) to break flat areas. */
  noise(amount: number, seed: number): void {
    const r = rng(seed);
    this.map((_x, _y, v) => v + (r() - 0.5) * 2 * amount);
  }
}

/**
 * Render a tone map as an engraving: solid ink for the darkest tones, then
 * cross-hatching, diagonal hatching, sparse strokes and stipple, paper for
 * light. `ink` / `paper` are 0xRRGGBB.
 */
export function engrave(tone: ToneMap, ink: number, paper: number, seed = 1): ImageData {
  const { w, h } = tone;
  const img = new ImageData(w, h);
  const r = rng(seed);
  const ir = (ink >> 16) & 0xff;
  const ig = (ink >> 8) & 0xff;
  const ib = ink & 0xff;
  const pr = (paper >> 16) & 0xff;
  const pg = (paper >> 8) & 0xff;
  const pb = paper & 0xff;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = tone.get(x, y);
      const d1 = (x + y) % 2 === 0; // main diagonal lines, 2px period
      const d2 = (x - y + 1024) % 2 === 0;
      const d3 = (x + y) % 3 === 0;
      const d4 = (x + y) % 4 === 0;
      let isInk: boolean;
      if (t > 0.9) isInk = true;
      else if (t > 0.75) isInk = d1 || d2 ? (x % 2 === 0 || y % 2 === 0) : true;
      else if (t > 0.6) isInk = d1 || (d2 && y % 2 === 0);
      else if (t > 0.45) isInk = d1 && y % 2 === 0 ? true : d3;
      else if (t > 0.3) isInk = d3;
      else if (t > 0.18) isInk = d4 && r() < 0.85;
      else if (t > 0.08) isInk = r() < t * 0.35;
      else isInk = false;
      const i = (y * w + x) * 4;
      img.data[i] = isInk ? ir : pr;
      img.data[i + 1] = isInk ? ig : pg;
      img.data[i + 2] = isInk ? ib : pb;
      img.data[i + 3] = 255;
    }
  }
  return img;
}

/** Draw solid ink pixels over an engraving (silhouettes and outlines). */
export function stamp(img: ImageData, pixels: readonly (readonly [number, number])[], color: number): void {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  for (const [x, y] of pixels) {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
    const i = (y * img.width + x) * 4;
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = 255;
  }
}

/** ASCII pixel map + palette -> ImageData. Unknown chars and '.' are transparent; rows are padded to `w`. */
export function fromAscii(rows: readonly string[], palette: Readonly<Record<string, number>>, w: number, h: number): ImageData {
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = (rows[y] ?? '').padEnd(w, '.');
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      const color = palette[ch];
      if (color === undefined) continue;
      const i = (y * w + x) * 4;
      img.data[i] = (color >> 16) & 0xff;
      img.data[i + 1] = (color >> 8) & 0xff;
      img.data[i + 2] = color & 0xff;
      img.data[i + 3] = 255;
    }
  }
  return img;
}

/** A small human figure (Dante or Virgil) as ink pixels, standing at (x, y) = feet. */
export function figurePixels(x: number, y: number, kind: 'standing' | 'seated' | 'fallen' = 'standing'): [number, number][] {
  const px: [number, number][] = [];
  if (kind === 'standing') {
    px.push([x, y - 6], [x - 1, y - 5], [x, y - 5], [x + 1, y - 5]);
    for (let k = 4; k >= 1; k--) px.push([x - 1, y - k], [x, y - k], [x + 1, y - k]);
    px.push([x - 1, y], [x + 1, y]);
  } else if (kind === 'seated') {
    px.push([x, y - 4], [x - 1, y - 3], [x, y - 3], [x + 1, y - 3], [x - 1, y - 2], [x, y - 2], [x + 1, y - 2], [x + 1, y - 1], [x + 2, y - 1], [x + 2, y]);
  } else {
    for (let k = -3; k <= 3; k++) px.push([x + k, y]);
    px.push([x + 4, y - 1]);
  }
  return px;
}
