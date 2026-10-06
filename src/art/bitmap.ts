/**
 * Bitmaps: the pure output of the art pipeline. Every texture of the game is
 * first built here as an RGBA buffer (from pixel maps or procedural painters),
 * then uploaded to Phaser by textures.ts. Keeping this step pure lets tests
 * check sizes and frames, and lets the art be previewed outside the browser.
 *
 * Owner: team D (art). Pure: no Phaser, no DOM.
 */

import { rasterize, sheetLayout, type Palette, type SheetFrame } from './pixelmap';

export interface Bitmap {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  /** Named frames (sprite sheets). Empty for single images. */
  readonly frames: readonly SheetFrame[];
}

export interface AnimDef {
  readonly key: string;
  readonly texture: string;
  readonly frames: readonly string[];
  readonly frameRate: number;
  /** -1 loops. */
  readonly repeat: number;
}

export function blank(key: string, width: number, height: number): Bitmap {
  return { key, width, height, data: new Uint8ClampedArray(width * height * 4), frames: [] };
}

/** A sprite sheet from named frames (pixel maps already sized fw x fh) sharing one palette. */
export function sheet(
  key: string,
  frames: ReadonlyArray<readonly [string, readonly string[]]>,
  fw: number,
  fh: number,
  palette: Palette,
  perRow = 8,
): Bitmap {
  const layout = sheetLayout(
    frames.map(([n]) => n),
    fw,
    fh,
    perRow,
  );
  const data = new Uint8ClampedArray(layout.width * layout.height * 4);
  frames.forEach(([, map], i) => {
    const f = layout.frames[i] as SheetFrame;
    rasterize(map, palette, { data, width: layout.width, x: f.x, y: f.y });
  });
  return { key, width: layout.width, height: layout.height, data, frames: layout.frames };
}

/** A single image from one pixel map. */
export function image(key: string, map: readonly string[], palette: Palette): Bitmap {
  const width = map.reduce((m, r) => Math.max(m, r.length), 0);
  const height = map.length;
  const data = new Uint8ClampedArray(width * height * 4);
  rasterize(map, palette, { data, width, x: 0, y: 0 });
  return { key, width, height, data, frames: [] };
}

/** A sheet whose frames are painted by a function (procedural effects). */
export function paintedSheet(
  key: string,
  names: readonly string[],
  fw: number,
  fh: number,
  paint: (bmp: PixelTarget, frame: number, name: string) => void,
  perRow = 8,
): Bitmap {
  const layout = sheetLayout(names, fw, fh, perRow);
  const data = new Uint8ClampedArray(layout.width * layout.height * 4);
  layout.frames.forEach((f, i) => {
    paint(new PixelTarget(data, layout.width, layout.height, f.x, f.y, fw, fh), i, f.name);
  });
  return { key, width: layout.width, height: layout.height, data, frames: layout.frames };
}

/** A single painted image. */
export function painted(key: string, w: number, h: number, paint: (t: PixelTarget) => void): Bitmap {
  const data = new Uint8ClampedArray(w * h * 4);
  paint(new PixelTarget(data, w, h, 0, 0, w, h));
  return { key, width: w, height: h, data, frames: [] };
}

/** A clipped drawing window into an RGBA buffer (frame-local coordinates). */
export class PixelTarget {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly stride: number,
    readonly totalHeight: number,
    readonly ox: number,
    readonly oy: number,
    readonly w: number,
    readonly h: number,
  ) {}

  private index(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return -1;
    return ((yi + this.oy) * this.stride + (xi + this.ox)) * 4;
  }

  /** Overwrite a pixel. */
  set(x: number, y: number, rgb: number, alpha = 1): void {
    const i = this.index(x, y);
    if (i < 0) return;
    this.data[i] = (rgb >> 16) & 0xff;
    this.data[i + 1] = (rgb >> 8) & 0xff;
    this.data[i + 2] = rgb & 0xff;
    this.data[i + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  }

  /** Source-over blend a pixel. */
  blend(x: number, y: number, rgb: number, alpha: number): void {
    const i = this.index(x, y);
    if (i < 0 || alpha <= 0) return;
    const a = Math.min(1, alpha);
    const da = (this.data[i + 3] as number) / 255;
    const outA = a + da * (1 - a);
    if (outA <= 0) return;
    const mixc = (src: number, dst: number): number => Math.round((src * a + dst * da * (1 - a)) / outA);
    this.data[i] = mixc((rgb >> 16) & 0xff, this.data[i] as number);
    this.data[i + 1] = mixc((rgb >> 8) & 0xff, this.data[i + 1] as number);
    this.data[i + 2] = mixc(rgb & 0xff, this.data[i + 2] as number);
    this.data[i + 3] = Math.round(outA * 255);
  }

  alphaAt(x: number, y: number): number {
    const i = this.index(x, y);
    return i < 0 ? 0 : (this.data[i + 3] as number) / 255;
  }

  rect(x: number, y: number, w: number, h: number, rgb: number, alpha = 1): void {
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(this.h, Math.ceil(y + h)); yy++) {
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(this.w, Math.ceil(x + w)); xx++) {
        if (alpha >= 1) this.set(xx, yy, rgb, 1);
        else this.blend(xx, yy, rgb, alpha);
      }
    }
  }

  /** Filled ellipse; `shade(d)` may vary alpha by normalised distance d (0 centre .. 1 edge). */
  ellipse(cx: number, cy: number, rx: number, ry: number, rgb: number, alpha: number | ((d: number) => number) = 1): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / Math.max(0.0001, rx);
        const dy = (y + 0.5 - cy) / Math.max(0.0001, ry);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const a = typeof alpha === 'function' ? alpha(Math.sqrt(d2)) : alpha;
        if (a >= 1) this.set(x, y, rgb, 1);
        else this.blend(x, y, rgb, a);
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, rgb: number, alpha = 1): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 4096; guard++) {
      if (alpha >= 1) this.set(x, y, rgb, 1);
      else this.blend(x, y, rgb, alpha);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Draw a pixel map at (x, y) with a palette. */
  map(map: readonly string[], palette: Palette, x: number, y: number): void {
    rasterize(map, palette, { data: this.data, width: this.stride, x: x + this.ox, y: y + this.oy });
  }
}
