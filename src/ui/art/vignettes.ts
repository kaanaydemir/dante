/**
 * Procedural Doré-like vignettes (96×64, ink on paper) for the opening pages
 * (bible §1.3.1): one composition per canto, built as a tone map and engraved
 * with hatching. Used when the world's art layer offers no `vignette-<canto>`.
 *
 * Owner: team C (presentation).
 */

import { engrave, figurePixels, stamp, ToneMap } from './pixels';
import { rng } from './paint';

export const VIGNETTE_W = 96;
export const VIGNETTE_H = 64;

export interface VignetteInk {
  readonly ink: number;
  readonly paper: number;
}

type Composer = (t: ToneMap, seed: number) => [number, number][];

/** Canto I: the dark wood. Dense trunks, no path, a small figure in a pale clearing. */
const darkWood: Composer = (t, seed) => {
  const r = rng(seed);
  t.vertical(0.55, 0.7);
  // pale clearing
  t.ellipse(50, 50, 22, 9, (d) => 0.15 + d * 0.4);
  // trunks, back to front
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 100) - 2;
    const w = 1 + Math.floor(r() * (i < 13 ? 2 : 4));
    const lean = (r() - 0.5) * 6;
    const tone = i < 13 ? 0.7 : 0.95;
    if (Math.abs(x - 50) < 8 && i >= 13) continue;
    t.polygon(
      [
        [x, 64],
        [x + w, 64],
        [x + w + lean, 0],
        [x + lean, 0],
      ],
      tone,
    );
  }
  // roots and ground line
  for (let x = 0; x < 96; x++) if (r() < 0.4) t.set(x, 58 + Math.floor(r() * 5), 0.9);
  t.noise(0.05, seed + 1);
  return figurePixels(50, 53);
};

/** Canto II: the hillside at evening, two figures on a stone, first stars. */
const eveningHill: Composer = (t, seed) => {
  const r = rng(seed);
  t.vertical(0.65, 0.1);
  // the sun gone down: a pale glow on the horizon
  t.ellipse(24, 46, 30, 10, (d) => d * 0.2);
  // hill
  const hill: [number, number][] = [[0, 64]];
  for (let x = 0; x <= 96; x += 4) hill.push([x, 50 - Math.sin((x / 96) * Math.PI * 0.9) * 22 + (r() - 0.5) * 2]);
  hill.push([96, 64]);
  t.polygon(hill, 0.78);
  // stone
  t.ellipse(30, 55, 7, 3, 0.95);
  const stars: [number, number][] = [];
  for (let i = 0; i < 9; i++) stars.push([Math.floor(r() * 96), Math.floor(r() * 18)]);
  for (const [x, y] of stars) t.set(x, y, 0);
  t.noise(0.04, seed + 2);
  return [...figurePixels(27, 52, 'seated'), ...figurePixels(34, 52, 'standing')];
};

/** Canto III: the gate, an inscription over a black opening, two small figures before it. */
const theGate: Composer = (t, seed) => {
  t.vertical(0.8, 0.9);
  // rock face
  t.rect(18, 4, 60, 60, 0.6);
  // the arch
  t.rect(34, 22, 28, 42, 1);
  t.ellipse(48, 22, 14, 12, 1);
  // voussoirs
  for (let a = 0; a <= 12; a++) {
    const ang = Math.PI + (a / 12) * Math.PI;
    t.line(48 + Math.cos(ang) * 14, 22 + Math.sin(ang) * 12, 48 + Math.cos(ang) * 19, 22 + Math.sin(ang) * 16, 0.95);
  }
  // inscription band
  t.rect(26, 4, 44, 5, 0.12);
  for (let x = 28; x < 68; x += 3) t.set(x, 6, 0.95);
  for (let x = 29; x < 67; x += 4) t.set(x, 7, 0.95);
  // ground
  t.rect(0, 58, 96, 6, 0.45);
  t.noise(0.05, seed + 3);
  return [...figurePixels(44, 60), ...figurePixels(51, 60)];
};

/** Canto IV: the noble castle with its walls in a hemisphere of light; a stream before it. */
const limbo: Composer = (t, seed) => {
  t.vertical(0.85, 0.6);
  // hemisphere of fire overcoming the dark
  t.ellipse(48, 40, 44, 32, (d) => Math.min(0.85, 0.05 + d * d * 0.8));
  // walls (rings of battlements)
  for (let k = 0; k < 4; k++) {
    const y = 36 + k * 4;
    const half = 12 + k * 6;
    t.rect(48 - half, y, half * 2, 3, 0.55 + k * 0.08);
    for (let x = 48 - half; x < 48 + half; x += 3) t.set(x, y - 1, 0.55 + k * 0.08);
  }
  // keep and towers
  t.rect(44, 24, 8, 12, 0.6);
  t.rect(38, 28, 4, 8, 0.65);
  t.rect(54, 28, 4, 8, 0.65);
  // meadow and stream
  t.rect(0, 52, 96, 12, 0.35);
  for (let x = 0; x < 96; x++) t.set(x, 55 + Math.round(Math.sin(x / 7)), 0.05);
  t.noise(0.04, seed + 4);
  return [...figurePixels(20, 61), ...figurePixels(25, 61)];
};

/** Canto V: the infernal hurricane, a spiral of souls; two figures on a ledge. */
const hurricane: Composer = (t, seed) => {
  const r = rng(seed);
  t.vertical(0.9, 0.75);
  // spiral bands
  for (let s = 0; s < 900; s++) {
    const a = s * 0.045;
    const rad = 4 + s * 0.045;
    const x = 52 + Math.cos(a) * rad * 1.3;
    const y = 28 + Math.sin(a) * rad * 0.55;
    t.set(x, y, 0.25);
    t.set(x + 1, y, 0.35);
  }
  // souls as dark specks along the bands
  for (let i = 0; i < 60; i++) {
    const a = r() * 40;
    const rad = 4 + a * 1.1;
    const x = 52 + Math.cos(a) * rad * 1.3;
    const y = 28 + Math.sin(a) * rad * 0.55;
    t.set(x, y, 1);
    t.set(x, y + 1, 1);
  }
  // lightning
  let lx = 82;
  for (let y = 0; y < 22; y++) {
    lx += Math.floor((r() - 0.5) * 3);
    t.set(lx, y, 0);
    t.set(lx + 1, y, 0);
  }
  // ledge
  t.polygon(
    [
      [0, 64],
      [0, 54],
      [30, 52],
      [44, 56],
      [44, 64],
    ],
    0.85,
  );
  t.noise(0.04, seed + 5);
  return [...figurePixels(14, 52), ...figurePixels(20, 52)];
};

/** Any other canto: a path into darkness. */
const generic: Composer = (t, seed) => {
  t.vertical(0.75, 0.4);
  t.polygon(
    [
      [36, 64],
      [60, 64],
      [50, 30],
      [46, 30],
    ],
    0.15,
  );
  t.noise(0.05, seed + 6);
  return figurePixels(48, 58);
};

const COMPOSERS: Readonly<Record<string, Composer>> = {
  inf01: darkWood,
  inf02: eveningHill,
  inf03: theGate,
  inf04: limbo,
  inf05: hurricane,
  inf99: darkWood,
};

/** The engraving of a canto as ImageData (96×64). */
export function vignetteImage(cantoId: string, ink: VignetteInk): ImageData {
  const t = new ToneMap(VIGNETTE_W, VIGNETTE_H);
  const composer = COMPOSERS[cantoId] ?? generic;
  const seed = [...cantoId].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const figures = composer(t, seed);
  const img = engrave(t, ink.ink, ink.paper, seed);
  stamp(img, figures, ink.ink);
  // A thin ink frame
  const frame: [number, number][] = [];
  for (let x = 0; x < VIGNETTE_W; x++) frame.push([x, 0], [x, VIGNETTE_H - 1]);
  for (let y = 0; y < VIGNETTE_H; y++) frame.push([0, y], [VIGNETTE_W - 1, y]);
  stamp(img, frame, ink.ink);
  return img;
}

/** Motifs for illustrated reading pages (Canto II's told story): a figure of light, a seated poet. */
export function motifImage(motif: 'light' | 'poet' | 'wood', ink: VignetteInk, seed = 3): ImageData {
  const t = new ToneMap(VIGNETTE_W, VIGNETTE_H);
  if (motif === 'light') {
    t.vertical(0.85, 0.7);
    t.ellipse(48, 30, 30, 26, (d) => Math.min(0.9, d * d * 0.95));
    t.ellipse(48, 30, 6, 16, 0);
    t.noise(0.04, seed);
    return engrave(t, ink.ink, ink.paper, seed);
  }
  if (motif === 'poet') {
    t.vertical(0.75, 0.55);
    t.ellipse(48, 40, 26, 18, (d) => 0.2 + d * 0.5);
    t.ellipse(48, 30, 5, 5, 0.9);
    t.polygon(
      [
        [40, 58],
        [56, 58],
        [53, 34],
        [43, 34],
      ],
      0.85,
    );
    t.rect(30, 58, 36, 4, 0.7);
    t.noise(0.04, seed);
    return engrave(t, ink.ink, ink.paper, seed);
  }
  return vignetteImage('inf01', ink);
}
