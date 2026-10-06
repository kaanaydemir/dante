/**
 * Canvas painters for the book layer: parchment, dark verse paper, dialogue
 * bubbles, cards, the open book, the cover, icons and screen overlays. Each
 * painter draws into a 2D context of the given size; textures.ts turns them
 * into Phaser textures. Deterministic (seeded noise), no Phaser import.
 *
 * Owner: team C (presentation).
 */

import { rgba, mixColor } from '../theme';

export type Ctx = CanvasRenderingContext2D;

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Sprinkle fibres and specks over a filled area. */
function grain(ctx: Ctx, w: number, h: number, seed: number, dark: number, light: number, amount: number): void {
  const r = rng(seed);
  const n = Math.round(w * h * amount);
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const isDark = r() < 0.6;
    ctx.fillStyle = rgba(isDark ? dark : light, 0.035 + r() * 0.06);
    const len = r() < 0.12 ? 2 + r() * 6 : 1;
    if (len > 1) {
      ctx.fillRect(x, y, len, 1);
    } else {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Darker edges, like old paper. */
function edgeShade(ctx: Ctx, w: number, h: number, color: number, strength: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, strength));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** A deckled (torn) rectangle outline: slightly irregular edges. */
function deckledPath(ctx: Ctx, w: number, h: number, inset: number, seed: number, rough: number): void {
  const r = rng(seed);
  const step = 6;
  ctx.beginPath();
  ctx.moveTo(inset, inset);
  for (let x = inset; x <= w - inset; x += step) ctx.lineTo(x, inset + (r() - 0.5) * rough);
  for (let y = inset; y <= h - inset; y += step) ctx.lineTo(w - inset + (r() - 0.5) * rough, y);
  for (let x = w - inset; x >= inset; x -= step) ctx.lineTo(x, h - inset + (r() - 0.5) * rough);
  for (let y = h - inset; y >= inset; y -= step) ctx.lineTo(inset + (r() - 0.5) * rough, y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

export interface ParchmentOptions {
  readonly paper: number;
  readonly shade: number;
  readonly edge: number;
  readonly ink: number;
  /** Torn edges (narration strip, margin) vs clean rectangle. */
  readonly deckled?: boolean;
  /** A thin double rule inside the border. */
  readonly rule?: number | null;
  readonly seed?: number;
  readonly shadow?: boolean;
}

/** Parchment: the book's voice (strips), the margin, notes. */
export function paintParchment(ctx: Ctx, w: number, h: number, o: ParchmentOptions): void {
  const seed = o.seed ?? 7;
  const pad = o.shadow ? 6 : 0;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (o.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
  }
  if (o.deckled) deckledPath(ctx, w, h, pad + 2, seed, 3.2);
  else roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 3);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba(mixColor(o.paper, 0xffffff, 0.06), 1));
  g.addColorStop(1, rgba(o.shade, 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  if (o.deckled) deckledPath(ctx, w, h, pad + 2, seed, 3.2);
  else roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 3);
  ctx.clip();
  grain(ctx, w, h, seed, o.ink, 0xffffff, 0.02);
  edgeShade(ctx, w, h, o.edge, 0.45);
  ctx.restore();
  // Edge line
  ctx.save();
  if (o.deckled) deckledPath(ctx, w, h, pad + 2, seed, 3.2);
  else roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 3);
  ctx.strokeStyle = rgba(o.edge, 0.9);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  if (o.rule !== undefined && o.rule !== null) {
    ctx.strokeStyle = rgba(o.rule, 0.75);
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 9.5, pad + 9.5, w - pad * 2 - 19, h - pad * 2 - 19);
    ctx.strokeStyle = rgba(o.rule, 0.35);
    ctx.strokeRect(pad + 12.5, pad + 12.5, w - pad * 2 - 25, h - pad * 2 - 25);
  }
}

export interface DarkPaperOptions {
  readonly paper: number;
  readonly rule: number;
  readonly seed?: number;
  /** Corner flourishes on the rule. */
  readonly ornate?: boolean;
}

/** Verse paper: dark, a thin gold rule (bible §1.2), always distinct from dialogue bubbles. */
export function paintVersePaper(ctx: Ctx, w: number, h: number, o: DarkPaperOptions): void {
  const pad = 6;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 6);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba(mixColor(o.paper, 0xffffff, 0.05), 0.97));
  g.addColorStop(1, rgba(mixColor(o.paper, 0x000000, 0.25), 0.97));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 6);
  ctx.clip();
  grain(ctx, w, h, o.seed ?? 11, 0x000000, 0xffffff, 0.012);
  ctx.restore();
  // Gold rule
  const inset = pad + 8.5;
  ctx.strokeStyle = rgba(o.rule, 0.85);
  ctx.lineWidth = 1;
  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, 3);
  ctx.stroke();
  if (o.ornate !== false) {
    ctx.fillStyle = rgba(o.rule, 0.9);
    for (const [cx, cy] of [
      [inset, inset],
      [w - inset, inset],
      [inset, h - inset],
      [w - inset, h - inset],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx, cy + 4);
      ctx.lineTo(cx - 4, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export interface BubbleOptions {
  readonly fill: number;
  readonly border: number;
  /** Tail position along the top-left edge (px from left), or null for none. */
  readonly tail?: number | null;
}

/** Modern dialogue balloon: dark, rounded, a soft light border; no gold (that is verse). */
export function paintBubble(ctx: Ctx, w: number, h: number, o: BubbleOptions): void {
  const pad = 8;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 14);
  const g = ctx.createLinearGradient(0, pad, 0, h - pad);
  g.addColorStop(0, rgba(mixColor(o.fill, 0xffffff, 0.08), 0.96));
  g.addColorStop(1, rgba(o.fill, 0.96));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = rgba(o.border, 0.55);
  ctx.lineWidth = 2;
  roundRectPath(ctx, pad + 1, pad + 1, w - pad * 2 - 2, h - pad * 2 - 2, 13);
  ctx.stroke();
}

export interface CardOptions {
  readonly fill: number;
  readonly rule: number;
  readonly accent: number;
  readonly seed?: number;
}

/** "What Dante did" card: dark card, double gold rule, a coloured band under the heading. */
export function paintCard(ctx: Ctx, w: number, h: number, o: CardOptions): void {
  const pad = 8;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 4);
  ctx.fillStyle = rgba(o.fill, 0.98);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 4);
  ctx.clip();
  grain(ctx, w, h, o.seed ?? 21, 0x000000, 0xffffff, 0.012);
  edgeShade(ctx, w, h, 0x000000, 0.35);
  ctx.restore();
  ctx.strokeStyle = rgba(o.rule, 0.9);
  ctx.lineWidth = 1;
  ctx.strokeRect(pad + 7.5, pad + 7.5, w - pad * 2 - 15, h - pad * 2 - 15);
  ctx.strokeStyle = rgba(o.rule, 0.4);
  ctx.strokeRect(pad + 10.5, pad + 10.5, w - pad * 2 - 21, h - pad * 2 - 21);
}

export interface SpreadOptions {
  readonly page: number;
  readonly pageShade: number;
  readonly pageEdge: number;
  readonly leather: number;
  readonly leatherDark: number;
  readonly ink: number;
  readonly seed?: number;
}

/**
 * An open book seen from above: leather boards, a stack of page edges, two
 * pages that darken toward the gutter.
 */
export function paintSpread(ctx: Ctx, w: number, h: number, o: SpreadOptions): void {
  ctx.clearRect(0, 0, w, h);
  const seed = o.seed ?? 3;
  // Boards
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRectPath(ctx, 10, 12, w - 20, h - 24, 10);
  ctx.fillStyle = rgba(o.leather, 1);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, 10, 12, w - 20, h - 24, 10);
  ctx.clip();
  grain(ctx, w, h, seed + 1, o.leatherDark, mixColor(o.leather, 0xffffff, 0.3), 0.03);
  edgeShade(ctx, w, h, o.leatherDark, 0.6);
  ctx.restore();
  // Page block edges (left and right stacks)
  const top = 26;
  const bottom = h - 26;
  const left = 26;
  const right = w - 26;
  const mid = w / 2;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rgba(mixColor(o.pageEdge, o.page, i / 5), 1);
    roundRectPath(ctx, left - 5 + i, top + 6 - i, mid - left + 5 - i, bottom - top - 6 + i * 0, 4);
    ctx.fill();
    roundRectPath(ctx, mid, top + 6 - i, right - mid + 5 - i, bottom - top - 6, 4);
    ctx.fill();
  }
  // Pages
  for (const side of [0, 1] as const) {
    const x0 = side === 0 ? left : mid;
    const x1 = side === 0 ? mid : right;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, top, x1 - x0, bottom - top);
    ctx.clip();
    ctx.fillStyle = rgba(o.page, 1);
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    grain(ctx, w, h, seed + 10 + side, o.ink, 0xffffff, 0.012);
    // Gutter shadow
    const gx = side === 0 ? x1 : x0;
    const gg = ctx.createLinearGradient(gx, 0, side === 0 ? gx - 90 : gx + 90, 0);
    gg.addColorStop(0, rgba(o.pageEdge, 0.55));
    gg.addColorStop(0.25, rgba(o.pageShade, 0.25));
    gg.addColorStop(1, rgba(o.page, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    // Outer edge falloff
    const ox = side === 0 ? x0 : x1;
    const og = ctx.createLinearGradient(ox, 0, side === 0 ? ox + 40 : ox - 40, 0);
    og.addColorStop(0, rgba(o.pageShade, 0.5));
    og.addColorStop(1, rgba(o.page, 0));
    ctx.fillStyle = og;
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    ctx.restore();
  }
  // Gutter line
  ctx.strokeStyle = rgba(o.pageEdge, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mid + 0.5, top);
  ctx.lineTo(mid + 0.5, bottom);
  ctx.stroke();
}

export interface CoverOptions {
  readonly leather: number;
  readonly leatherDark: number;
  readonly gold: number;
  readonly seed?: number;
}

/** The book's front cover: leather, blind-tooled frames, gold fillets and corner fleurons. */
export function paintCover(ctx: Ctx, w: number, h: number, o: CoverOptions): void {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  roundRectPath(ctx, 14, 14, w - 28, h - 28, 12);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, rgba(mixColor(o.leather, 0xffffff, 0.08), 1));
  g.addColorStop(1, rgba(o.leatherDark, 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, 14, 14, w - 28, h - 28, 12);
  ctx.clip();
  grain(ctx, w, h, o.seed ?? 5, o.leatherDark, mixColor(o.leather, 0xffffff, 0.35), 0.05);
  edgeShade(ctx, w, h, 0x000000, 0.55);
  // Spine band on the left
  const sg = ctx.createLinearGradient(14, 0, 70, 0);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(14, 14, 60, h - 28);
  ctx.restore();
  // Blind-tooled frame
  ctx.strokeStyle = rgba(o.leatherDark, 0.9);
  ctx.lineWidth = 3;
  ctx.strokeRect(54.5, 44.5, w - 99, h - 89);
  // Gold fillets
  ctx.strokeStyle = rgba(o.gold, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 54, w - 118, h - 108);
  ctx.lineWidth = 1;
  ctx.strokeRect(72.5, 62.5, w - 135, h - 125);
  // Corner fleurons
  ctx.fillStyle = rgba(o.gold, 0.9);
  const corners: [number, number, number, number][] = [
    [72, 62, 1, 1],
    [w - 63, 62, -1, 1],
    [72, h - 63, 1, -1],
    [w - 63, h - 63, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(26, 4, 34, 0);
    ctx.quadraticCurveTo(22, 10, 0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4, 26, 0, 34);
    ctx.quadraticCurveTo(10, 22, 6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(14, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

/** Black edges, clear centre (fear, faint). */
export function paintRadialVignette(ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Engraving hatch: diagonal ink strokes over a pale wash, transparent between them. */
export function paintHatch(ctx: Ctx, w: number, h: number, ink: number, paper: number, seed = 13): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = rgba(paper, 0.18);
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  ctx.strokeStyle = rgba(ink, 0.32);
  ctx.lineWidth = 1;
  for (let k = -h; k < w; k += 6) {
    ctx.beginPath();
    let x = k;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < h) {
      x += 3 + r() * 2;
      y += 3 + r() * 2;
      if (r() < 0.12) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // A second, sparser cross-hatch in the corners.
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, rgba(ink, 0));
  g.addColorStop(1, rgba(ink, 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A soft round glow (word glints, light motes). */
export function paintGlow(ctx: Ctx, size: number, color: number): void {
  ctx.clearRect(0, 0, size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(color, 0.9));
  g.addColorStop(0.35, rgba(color, 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

/** A horizontal fade bar (letterbox edge, strip shadows): opaque at the top, clear at the bottom. */
export function paintFadeBar(ctx: Ctx, w: number, h: number, color: number): void {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** The illuminated initial box behind a capital (blue field, gold frame, white vine). */
export function paintIlluminatedBox(ctx: Ctx, size: number, field: number, frame: number, vine: number, seed = 17): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = rgba(frame, 1);
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = rgba(field, 1);
  ctx.fillRect(4, 4, size - 8, size - 8);
  // Vine filigree
  const r = rng(seed);
  ctx.strokeStyle = rgba(vine, 0.75);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const x0 = 6 + r() * (size - 12);
    const y0 = 6 + r() * (size - 12);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + 12 * (r() - 0.5) * 2, y0 + 10 * r(), x0 + 14 * (r() - 0.5), y0 + 14 * (r() - 0.5), x0 + 10 * (r() - 0.5), y0 + 12 * (r() - 0.5));
    ctx.stroke();
    ctx.fillStyle = rgba(vine, 0.85);
    ctx.beginPath();
    ctx.arc(x0, y0, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Gold dots on the frame
  ctx.fillStyle = rgba(mixColor(frame, 0xffffff, 0.4), 1);
  for (let i = 6; i < size - 4; i += 8) {
    ctx.fillRect(i, 1, 2, 2);
    ctx.fillRect(i, size - 3, 2, 2);
    ctx.fillRect(1, i, 2, 2);
    ctx.fillRect(size - 3, i, 2, 2);
  }
}
