/**
 * ASCII pixel maps: every sprite of the game is written as rows of characters
 * plus a palette (char -> colour), then rasterised to RGBA at boot.
 *
 *   '.' and ' ' are transparent; any other character must be in the palette.
 *
 * Helpers compose maps (pad into a frame, mirror, overlay, swap rows) so walk
 * frames and poses are variations of one drawing rather than redrawn copies.
 *
 * Owner: team D (art). Pure: no Phaser, no DOM (tests rasterise in Node).
 */

/** A colour (0xRRGGBB, opaque) or a colour with an alpha in 0..1. */
export type PaletteEntry = number | readonly [number, number];
export type Palette = Readonly<Record<string, PaletteEntry>>;

export const TRANSPARENT = new Set(['.', ' ']);

/**
 * Rows from a template literal: blank first / last lines are dropped, the
 * common indentation removed, and trailing spaces kept as transparency.
 */
export function rows(src: string): string[] {
  const lines = src.replace(/\r/g, '').split('\n');
  while (lines.length > 0 && (lines[0] as string).trim() === '') lines.shift();
  while (lines.length > 0 && (lines[lines.length - 1] as string).trim() === '') lines.pop();
  const indent = Math.min(
    ...lines.filter((l) => l.trim() !== '').map((l) => (/^ */.exec(l)?.[0].length ?? 0)),
  );
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0));
}

export function sizeOf(map: readonly string[]): { w: number; h: number } {
  return { w: map.reduce((m, r) => Math.max(m, r.length), 0), h: map.length };
}

/** Right-pads every row with transparency to the widest row. */
export function squareUp(map: readonly string[]): string[] {
  const { w } = sizeOf(map);
  return map.map((r) => r.padEnd(w, '.'));
}

/** Places a map in a w x h frame: centred horizontally, bottom-aligned (feet on the last row) or centred. */
export function pad(map: readonly string[], w: number, h: number, anchor: 'bottom' | 'center' = 'bottom', dx = 0, dy = 0): string[] {
  const src = squareUp(map);
  const { w: mw, h: mh } = sizeOf(src);
  const ox = Math.floor((w - mw) / 2) + dx;
  const oy = (anchor === 'bottom' ? h - mh : Math.floor((h - mh) / 2)) + dy;
  const blank = Array.from({ length: h }, () => '.'.repeat(w));
  return overlay(blank, src, ox, oy);
}

/** Mirror left-right. */
export function mirror(map: readonly string[]): string[] {
  return squareUp(map).map((r) => [...r].reverse().join(''));
}

/**
 * A left-right symmetric drawing from its left half: every row becomes
 * `half + reversed(half)` (front and back views are drawn this way, so they
 * are always symmetric and exactly twice the half's width).
 */
export function symmetric(half: readonly string[]): string[] {
  const w = sizeOf(half).w;
  return half.map((r) => {
    const left = r.padEnd(w, '.');
    return left + [...left].reverse().join('');
  });
}

/** Draws `top` over `base` at (dx, dy); transparent characters of `top` keep the base. Clipped to the base. */
export function overlay(base: readonly string[], top: readonly string[], dx: number, dy: number): string[] {
  const out = squareUp(base).map((r) => [...r]);
  top.forEach((row, ty) => {
    const y = ty + dy;
    if (y < 0 || y >= out.length) return;
    const line = out[y] as string[];
    for (let tx = 0; tx < row.length; tx++) {
      const ch = row[tx] as string;
      const x = tx + dx;
      if (x < 0 || x >= line.length || TRANSPARENT.has(ch)) continue;
      line[x] = ch;
    }
  });
  return out.map((r) => r.join(''));
}

/** A rectangular piece of a map. */
export function crop(map: readonly string[], x: number, y: number, w: number, h: number): string[] {
  const src = squareUp(map);
  const out: string[] = [];
  for (let r = y; r < y + h; r++) {
    const row = src[r] ?? '';
    out.push(row.slice(Math.max(0, x), x + w).padEnd(w, '.'));
  }
  return out;
}

/** Replaces the rows from index `from` on with `replacement` (keeps the height when it fits). */
export function replaceFrom(base: readonly string[], from: number, replacement: readonly string[]): string[] {
  const out = squareUp(base);
  const w = sizeOf(out).w;
  for (let i = 0; i < replacement.length && from + i < out.length; i++) {
    out[from + i] = (replacement[i] as string).padEnd(w, '.').slice(0, w);
  }
  return out;
}

/** Moves the drawing by (dx, dy) inside the same frame size. */
export function shift(map: readonly string[], dx: number, dy: number): string[] {
  const src = squareUp(map);
  const { w, h } = sizeOf(src);
  const blank = Array.from({ length: h }, () => '.'.repeat(w));
  return overlay(blank, src, dx, dy);
}

/** Swaps characters (e.g. a palette variant: `{ r: 'v' }` turns a red robe grey). */
export function recolor(map: readonly string[], swaps: Readonly<Record<string, string>>): string[] {
  return map.map((r) => [...r].map((ch) => swaps[ch] ?? ch).join(''));
}

/** Problems with a map: unknown characters (by char, first position). */
export function validateMap(map: readonly string[], palette: Palette): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as string;
      if (TRANSPARENT.has(ch) || ch in palette || seen.has(ch)) continue;
      seen.add(ch);
      problems.push(`unknown pixel '${ch}' at ${x},${y}`);
    }
  });
  return problems;
}

function entryColor(e: PaletteEntry): { rgb: number; a: number } {
  return typeof e === 'number' ? { rgb: e, a: 1 } : { rgb: e[0], a: e[1] };
}

/**
 * Rasterise a map into an RGBA buffer (`target` of `targetWidth` px per row,
 * at x, y), or into a new buffer of the map's own size. Unknown characters
 * draw magenta so mistakes are visible.
 */
export function rasterize(
  map: readonly string[],
  palette: Palette,
  target?: { readonly data: Uint8ClampedArray; readonly width: number; readonly x: number; readonly y: number },
): Uint8ClampedArray {
  const { w, h } = sizeOf(map);
  const data = target?.data ?? new Uint8ClampedArray(w * h * 4);
  const tw = target?.width ?? w;
  const th = Math.floor(data.length / 4 / Math.max(1, tw));
  const ox = target?.x ?? 0;
  const oy = target?.y ?? 0;
  for (let y = 0; y < h; y++) {
    const row = map[y] as string;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as string;
      if (TRANSPARENT.has(ch)) continue;
      const px = x + ox;
      const py = y + oy;
      if (px < 0 || py < 0 || px >= tw || py >= th) continue;
      const e = palette[ch];
      const { rgb, a } = e === undefined ? { rgb: 0xff00ff, a: 1 } : entryColor(e);
      const i = (py * tw + px) * 4;
      data[i] = (rgb >> 16) & 0xff;
      data[i + 1] = (rgb >> 8) & 0xff;
      data[i + 2] = rgb & 0xff;
      data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  return data;
}

export interface SheetFrame {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface SheetLayout {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly SheetFrame[];
}

/** Lays frames of one size out in rows of at most `perRow` (texture atlases stay small and square-ish). */
export function sheetLayout(names: readonly string[], fw: number, fh: number, perRow = 8): SheetLayout {
  const cols = Math.max(1, Math.min(perRow, names.length));
  const rowsN = Math.max(1, Math.ceil(names.length / cols));
  return {
    width: cols * fw,
    height: rowsN * fh,
    frames: names.map((name, i) => ({ name, x: (i % cols) * fw, y: Math.floor(i / cols) * fh, w: fw, h: fh })),
  };
}

// ---------------------------------------------------------------------------
// Colour helpers (0xRRGGBB)
// ---------------------------------------------------------------------------

export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number): number => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * k) & 0xff;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export function darken(c: number, t: number): number {
  return mix(c, 0x000000, t);
}

export function lighten(c: number, t: number): number {
  return mix(c, 0xffffff, t);
}

/** Relative luminance 0..1 (sRGB approximation; used for grayscale and contrast checks). */
export function luminance(c: number): number {
  const r = ((c >> 16) & 0xff) / 255;
  const g = ((c >> 8) & 0xff) / 255;
  const b = (c & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
