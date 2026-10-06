/**
 * Presentation theme: colours (normal / high contrast), font sizes scaled by
 * the player's font setting, and text-style builders for the book voice,
 * verse, dialogue and interface chrome.
 *
 * Owner: team C (presentation). Pure: no Phaser import, so layout code that
 * depends on it can be unit-tested. The style objects are structurally
 * compatible with Phaser's `Types.GameObjects.Text.TextStyle`.
 */

import {
  FONT_FAMILY,
  FONT_SIZE,
  UI_COLORS,
  UI_COLORS_HIGH_CONTRAST,
  cssColor,
  type FontScale,
} from '../config';
import type { Settings } from '../runtime/contracts';

export type UiColorKey = keyof typeof UI_COLORS;
export type UiPalette = { readonly [K in UiColorKey]: number };
export type FontKind = keyof typeof FONT_SIZE;

/** Extra colours the book needs beyond config UI_COLORS (same keys in both modes). */
export interface ExtraPalette {
  /** Leather of the cover and the book's boards. */
  readonly leather: number;
  readonly leatherDark: number;
  /** Paper of the open book (slightly warmer than UI paper). */
  readonly page: number;
  readonly pageShade: number;
  readonly pageEdge: number;
  /** Ink used for faint rules, folios and secondary text on paper. */
  readonly inkFaint: number;
  /** Gold line used on the verse frame and the card rule. */
  readonly rule: number;
  /** Wax seal. */
  readonly seal: number;
  /** Text on the dark verse paper that is not verse (voice name, citation). */
  readonly verseSoft: number;
  /** Dimmed text on dark backgrounds (hints, disabled options). */
  readonly dim: number;
  /** Narration strip text. */
  readonly stripText: number;
  /** Card back (dark) for "What Dante did". */
  readonly card: number;
  readonly cardText: number;
  /** The glow of a collectible word. */
  readonly glow: number;
  /** Burden word (Fear) card colour. */
  readonly burden: number;
}

const EXTRA: ExtraPalette = {
  leather: 0x3a1712,
  leatherDark: 0x1f0b08,
  page: 0xeadfc4,
  pageShade: 0xd8c9a6,
  pageEdge: 0xa89470,
  inkFaint: 0x8a7558,
  rule: 0xb8913f,
  seal: 0x8e1f1a,
  verseSoft: 0xc8b48a,
  dim: 0x9a8f7c,
  stripText: 0x2b2118,
  card: 0x1c1712,
  cardText: 0xf1e6cc,
  glow: 0xffd56a,
  burden: 0x7a1e1e,
};

const EXTRA_HIGH_CONTRAST: ExtraPalette = {
  leather: 0x2a0000,
  leatherDark: 0x000000,
  page: 0xffffff,
  pageShade: 0xf0f0f0,
  pageEdge: 0x000000,
  inkFaint: 0x333333,
  rule: 0xffd23f,
  seal: 0xc00000,
  verseSoft: 0xffe680,
  dim: 0xd0d0d0,
  stripText: 0x000000,
  card: 0x000000,
  cardText: 0xffffff,
  glow: 0xffe600,
  burden: 0xff4040,
};

export interface Theme {
  readonly colors: UiPalette;
  readonly extra: ExtraPalette;
  readonly fontScale: FontScale;
  readonly highContrast: boolean;
  /** Font size in px for a kind, scaled by the setting. Body kinds never go below 20 px. */
  size(kind: FontKind): number;
  /** A px value scaled by the font setting (for spacing that follows text size). */
  px(value: number): number;
}

/** Kinds that are body text and must stay ≥ 20 px (ENGINE §7.3). */
const MIN_PX = 20;

export function themeFor(settings: Pick<Settings, 'fontScale' | 'highContrast'>): Theme {
  const scale = settings.fontScale;
  const colors: UiPalette = settings.highContrast ? UI_COLORS_HIGH_CONTRAST : UI_COLORS;
  const extra = settings.highContrast ? EXTRA_HIGH_CONTRAST : EXTRA;
  return {
    colors,
    extra,
    fontScale: scale,
    highContrast: settings.highContrast,
    size(kind: FontKind): number {
      return Math.max(MIN_PX, Math.round(FONT_SIZE[kind] * scale));
    },
    px(value: number): number {
      return Math.round(value * scale);
    },
  };
}

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

/** Structural subset of Phaser's TextStyle used by the UI. */
export interface TextStyleSpec {
  fontFamily: string;
  fontSize: string;
  fontStyle?: string;
  color: string;
  align?: 'left' | 'right' | 'center' | 'justify';
  stroke?: string;
  strokeThickness?: number;
  shadow?: {
    offsetX?: number;
    offsetY?: number;
    color?: string;
    blur?: number;
    stroke?: boolean;
    fill?: boolean;
  };
  lineSpacing?: number;
  letterSpacing?: number;
  wordWrap?: { width: number; useAdvancedWrap?: boolean };
  padding?: { left?: number; right?: number; top?: number; bottom?: number; x?: number; y?: number };
}

export type FontFace = 'book' | 'ui';

export interface StyleOptions {
  readonly face?: FontFace;
  readonly italic?: boolean;
  readonly bold?: boolean;
  readonly color?: number;
  readonly align?: TextStyleSpec['align'];
  readonly wrap?: number;
  /** Explicit px size (already scaled); otherwise `kind` decides. */
  readonly px?: number;
  readonly lineSpacing?: number;
  readonly letterSpacing?: number;
  readonly shadow?: boolean;
  readonly stroke?: { color: number; thickness: number };
}

/** The font shorthand a canvas context needs to measure a style (`italic 24px "IM Fell English", …`). */
export function canvasFont(style: Pick<TextStyleSpec, 'fontFamily' | 'fontSize' | 'fontStyle'>): string {
  const parts = [style.fontStyle ?? '', style.fontSize, style.fontFamily].filter((p) => p && p.length > 0);
  return parts.join(' ');
}

export function textStyle(theme: Theme, kind: FontKind, opts: StyleOptions = {}): TextStyleSpec {
  const face: FontFace = opts.face ?? (kind === 'ui' || kind === 'hud' ? 'ui' : 'book');
  const px = opts.px ?? theme.size(kind);
  const fontStyle = [opts.italic ? 'italic' : '', opts.bold ? 'bold' : ''].filter(Boolean).join(' ');
  const style: TextStyleSpec = {
    fontFamily: face === 'ui' ? FONT_FAMILY.ui : FONT_FAMILY.book,
    fontSize: `${px}px`,
    color: cssColor(opts.color ?? theme.colors.ink),
  };
  if (fontStyle) style.fontStyle = fontStyle;
  if (opts.align) style.align = opts.align;
  if (opts.wrap && opts.wrap > 0) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  if (opts.lineSpacing !== undefined) style.lineSpacing = opts.lineSpacing;
  if (opts.letterSpacing !== undefined) style.letterSpacing = opts.letterSpacing;
  if (opts.shadow) style.shadow = { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.65)', blur: 4, fill: true };
  if (opts.stroke) {
    style.stroke = cssColor(opts.stroke.color);
    style.strokeThickness = opts.stroke.thickness;
  }
  return style;
}

/** Line height (px) for a font size: generous leading for reading. */
export function lineHeight(px: number, kind: 'verse' | 'prose' | 'ui' = 'prose'): number {
  const k = kind === 'verse' ? 1.42 : kind === 'ui' ? 1.25 : 1.36;
  return Math.round(px * k);
}

/** Interpolate two 0xRRGGBB colours. */
export function mixColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

/** 0xRRGGBB + alpha -> `rgba(...)` for canvas drawing. */
export function rgba(hex: number, alpha: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

export { cssColor };
