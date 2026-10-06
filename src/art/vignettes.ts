/**
 * The opening-page vignettes (96 x 64, bible §1.3.1): small Doré-like
 * engravings, ink on paper, one per canto (`vignette-<canto>`) and a generic
 * one. Each is a tone composition (0 = paper, 1 = ink) rendered with
 * engraver's hatching: diagonal lines, cross-hatching, then solid ink.
 *
 * Owner: team D (art). Pure: no Phaser.
 */

import { painted, type Bitmap } from './bitmap';
import { seededRandom } from '../world/geometry';

export const VIGNETTE_W = 96;
export const VIGNETTE_H = 64;

class Tone {
  readonly v = new Float32Array(VIGNETTE_W * VIGNETTE_H);

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= VIGNETTE_W || y >= VIGNETTE_H) return 0;
    return this.v[y * VIGNETTE_W + x] as number;
  }

  set(x: number, y: number, t: number): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= VIGNETTE_W || yi >= VIGNETTE_H) return;
    this.v[yi * VIGNETTE_W + xi] = Math.max(0, Math.min(1, t));
  }

  /** Vertical gradient (sky to ground). */
  sky(top: number, bottom: number, y0 = 0, y1 = VIGNETTE_H): void {
    for (let y = y0; y < y1; y++) {
      const k = (y - y0) / Math.max(1, y1 - y0 - 1);
      for (let x = 0; x < VIGNETTE_W; x++) this.set(x, y, top + (bottom - top) * k);
    }
  }

  rect(x0: number, y0: number, w: number, h: number, t: number): void {
    for (let y = Math.floor(y0); y < y0 + h; y++) for (let x = Math.floor(x0); x < x0 + w; x++) this.set(x, y, t);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, t: number | ((d: number) => number)): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
        if (d <= 1) this.set(x, y, typeof t === 'function' ? t(d) : t);
      }
    }
  }

  /** Filled polygon (scanline). */
  poly(points: ReadonlyArray<readonly [number, number]>, t: number): void {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i] as readonly [number, number];
        const b = points[(i + 1) % points.length] as readonly [number, number];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
          xs.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i] as number); x < Math.round(xs[i + 1] as number); x++) this.set(x, y, t);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, t: number, thick = 1): void {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      for (let o = 0; o < thick; o++) this.set(x + o, y, t);
    }
  }

  /** A tiny standing figure (Dante, Virgil): head and robe. */
  figure(x: number, yFeet: number, h: number, t = 1): void {
    this.ellipse(x, yFeet - h + 1.5, 1.4, 1.5, t);
    this.poly(
      [
        [x - 1.2, yFeet - h + 3],
        [x + 1.2, yFeet - h + 3],
        [x + 2, yFeet],
        [x - 2, yFeet],
      ],
      t,
    );
  }
}

/** Engraver's rendering of a tone map: hatching by tone, ink and paper colours. */
function engrave(key: string, tone: Tone, ink: number, paper: number): Bitmap {
  return painted(key, VIGNETTE_W, VIGNETTE_H, (t) => {
    for (let y = 0; y < VIGNETTE_H; y++) {
      for (let x = 0; x < VIGNETTE_W; x++) {
        const v = tone.get(x, y);
        let inked = false;
        if (v > 0.9) inked = true;
        else if (v > 0.72) inked = (x + y) % 2 === 0 || y % 2 === 0;
        else if (v > 0.52) inked = (x + y) % 3 === 0 || (x - y + 300) % 3 === 0;
        else if (v > 0.32) inked = (x + y) % 3 === 0;
        else if (v > 0.16) inked = (x + y) % 5 === 0;
        const border = x === 0 || y === 0 || x === VIGNETTE_W - 1 || y === VIGNETTE_H - 1;
        t.set(x, y, inked || border ? ink : paper, 1);
      }
    }
  });
}

function darkWood(t: Tone): void {
  t.sky(0.55, 0.85);
  // The far hill in first light (I 16–18): a pale shoulder between the trunks.
  t.ellipse(48, 30, 30, 16, (d) => 0.1 + d * 0.25);
  const rnd = seededRandom(101);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * 96);
    const w = 2 + Math.floor(rnd() * 5);
    const lean = (rnd() - 0.5) * 6;
    const near = rnd();
    t.poly(
      [
        [x - w / 2 + lean, 0],
        [x + w / 2 + lean, 0],
        [x + w / 2 + 1, 64],
        [x - w / 2 - 1, 64],
      ],
      0.75 + near * 0.25,
    );
  }
  t.rect(0, 54, 96, 10, 0.9);
  // The lone figure, small among the trunks.
  t.rect(44, 40, 9, 16, 0.12);
  t.figure(48, 54, 9, 1);
}

function hillside(t: Tone): void {
  t.sky(0.62, 0.3, 0, 40);
  t.ellipse(74, 12, 3, 3, 0);
  t.poly(
    [
      [0, 40],
      [30, 26],
      [60, 30],
      [96, 18],
      [96, 64],
      [0, 64],
    ],
    0.8,
  );
  t.poly(
    [
      [0, 50],
      [40, 40],
      [96, 46],
      [96, 64],
      [0, 64],
    ],
    0.95,
  );
  t.line(10, 47, 60, 34, 0.45, 2);
  t.figure(40, 36, 9, 1);
  t.figure(46, 35, 10, 1);
}

function gate(t: Tone): void {
  t.sky(0.88, 0.7);
  t.rect(24, 8, 48, 50, 0.45);
  t.rect(28, 10, 40, 6, 0.18);
  for (let x = 30; x < 66; x += 3) t.rect(x, 12, 2, 1, 0.9);
  t.ellipse(48, 32, 14, 12, 1);
  t.rect(34, 32, 28, 26, 1);
  t.rect(0, 58, 96, 6, 0.85);
  t.figure(42, 58, 9, 0.15);
  t.figure(47, 58, 10, 0.2);
}

function limbo(t: Tone): void {
  t.sky(0.7, 0.45, 0, 44);
  // The fire that overcame the dark (IV 68–69).
  t.ellipse(48, 22, 30, 16, (d) => 0.05 + d * 0.5);
  // The noble castle: walls and towers.
  t.rect(26, 22, 44, 18, 0.6);
  for (const x of [26, 40, 54, 66]) t.rect(x, 16, 6, 24, 0.68);
  for (let x = 26; x < 70; x += 4) t.rect(x, 20, 2, 2, 0.15);
  t.rect(45, 30, 6, 10, 1);
  // The fair streamlet (IV 108) and the meadow.
  t.rect(0, 44, 96, 3, 0.15);
  t.rect(0, 47, 96, 17, 0.42);
  t.figure(30, 56, 8, 1);
  t.figure(35, 56, 9, 1);
}

function hurricane(t: Tone): void {
  t.sky(0.9, 0.75);
  // The whirl of shades: arcs of paler strokes around a dark eye.
  for (let i = 0; i < 9; i++) {
    const r = 6 + i * 4.5;
    for (let a = 0; a < Math.PI * 1.6; a += 0.02) {
      const ang = a + i * 0.7;
      const x = 52 + Math.cos(ang) * r * 1.4;
      const y = 26 + Math.sin(ang) * r * 0.6;
      t.set(x, y, 0.25 + (i % 3) * 0.1);
    }
  }
  // Tiny bodies swept along the arcs.
  const rnd = seededRandom(55);
  for (let i = 0; i < 22; i++) {
    const ang = rnd() * Math.PI * 2;
    const r = 8 + rnd() * 30;
    const x = 52 + Math.cos(ang) * r * 1.4;
    const y = 26 + Math.sin(ang) * r * 0.6;
    t.line(x, y, x + 3, y + 1, 0.05, 1);
  }
  t.poly(
    [
      [0, 52],
      [26, 48],
      [34, 54],
      [34, 64],
      [0, 64],
    ],
    1,
  );
  t.figure(18, 50, 8, 0.1);
  t.figure(23, 49, 9, 0.1);
}

function genericPage(t: Tone): void {
  t.sky(0.75, 0.55);
  t.poly(
    [
      [40, 64],
      [56, 64],
      [50, 30],
      [47, 30],
    ],
    0.15,
  );
  t.ellipse(48, 28, 10, 5, 0.3);
  t.rect(0, 0, 18, 64, 0.95);
  t.rect(78, 0, 18, 64, 0.95);
  t.figure(48, 52, 9, 1);
}

const COMPOSITIONS: Readonly<Record<string, (t: Tone) => void>> = {
  inf01: darkWood,
  inf02: hillside,
  inf03: gate,
  inf04: limbo,
  inf05: hurricane,
  inf99: darkWood,
  generic: genericPage,
};

export function vignetteBitmaps(ink: number, paper: number): Bitmap[] {
  return Object.entries(COMPOSITIONS).map(([id, compose]) => {
    const tone = new Tone();
    compose(tone);
    return engrave(`vignette-${id}`, tone, ink, paper);
  });
}
