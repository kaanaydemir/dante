/**
 * Phaser texture registry for the book layer: painted panels (cached by kind,
 * size and contrast), icons, vignettes, portraits and overlays. Textures are
 * game-wide, so every scene shares them.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import type { Theme } from '../theme';
import { paintIcon, ICON_SIZE, type IconName } from './icons';
import {
  hashSeed,
  paintBubble,
  paintCard,
  paintCover,
  paintFadeBar,
  paintGlow,
  paintHatch,
  paintIlluminatedBox,
  paintParchment,
  paintRadialVignette,
  paintSpread,
  paintVersePaper,
  type Ctx,
} from './paint';
import { portraitImage, PORTRAIT_SIZE } from './portraits';
import { motifImage, vignetteImage, VIGNETTE_H, VIGNETTE_W } from './vignettes';

/** Create a canvas texture once and paint it. Returns the key. Never throws. */
export function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  try {
    const tex = scene.textures.createCanvas(key, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    if (!tex) return key;
    const ctx = tex.getContext();
    paint(ctx);
    tex.refresh();
  } catch {
    // A failed paint leaves an empty texture; text stays readable on the backdrop.
  }
  return key;
}

/** Put an ImageData into a new canvas texture. */
export function imageTexture(scene: Phaser.Scene, key: string, make: () => ImageData): string {
  if (scene.textures.exists(key)) return key;
  try {
    const img = make();
    const tex = scene.textures.createCanvas(key, img.width, img.height);
    if (!tex) return key;
    tex.getContext().putImageData(img, 0, 0);
    tex.refresh();
  } catch {
    // ignore: missing art never breaks reading
  }
  return key;
}

export type PanelKind = 'strip' | 'margin' | 'note' | 'verse' | 'bubble' | 'card' | 'spread' | 'cover' | 'plate';

const q = (n: number): number => Math.max(8, Math.ceil(n / 8) * 8);

/** A painted panel of (rounded-up) size w × h; display it at its natural size. */
export function panelTexture(scene: Phaser.Scene, kind: PanelKind, w: number, h: number, theme: Theme): { key: string; w: number; h: number } {
  const W = q(w);
  const H = q(h);
  const hc = theme.highContrast ? 'hc' : 'n';
  const key = `ui-${kind}-${W}x${H}-${hc}`;
  const c = theme.colors;
  const x = theme.extra;
  canvasTexture(scene, key, W, H, (ctx) => {
    const seed = hashSeed(key);
    switch (kind) {
      case 'strip':
        paintParchment(ctx, W, H, { paper: c.strip, shade: c.paperShade, edge: c.paperEdge, ink: c.ink, deckled: true, seed, shadow: true });
        break;
      case 'margin':
        paintParchment(ctx, W, H, { paper: c.paper, shade: c.paperShade, edge: c.paperEdge, ink: c.ink, deckled: true, rule: c.gold, seed, shadow: true });
        break;
      case 'note':
        paintParchment(ctx, W, H, { paper: c.paper, shade: c.paperShade, edge: c.paperEdge, ink: c.ink, deckled: false, rule: null, seed, shadow: true });
        break;
      case 'plate':
        paintParchment(ctx, W, H, { paper: x.page, shade: x.pageShade, edge: x.pageEdge, ink: c.ink, deckled: false, rule: x.rule, seed, shadow: false });
        break;
      case 'verse':
        paintVersePaper(ctx, W, H, { paper: c.verse, rule: x.rule, seed });
        break;
      case 'bubble':
        paintBubble(ctx, W, H, { fill: c.bubble, border: c.bubbleText });
        break;
      case 'card':
        paintCard(ctx, W, H, { fill: x.card, rule: x.rule, accent: c.rubric, seed });
        break;
      case 'spread':
        paintSpread(ctx, W, H, { page: x.page, pageShade: x.pageShade, pageEdge: x.pageEdge, leather: x.leather, leatherDark: x.leatherDark, ink: c.ink, seed });
        break;
      case 'cover':
        paintCover(ctx, W, H, { leather: x.leather, leatherDark: x.leatherDark, gold: c.gold, seed });
        break;
    }
  });
  return { key, w: W, h: H };
}

export function iconTexture(scene: Phaser.Scene, name: IconName, color: number, ink: number, size = ICON_SIZE): string {
  const key = `ui-icon-${name}-${color.toString(16)}-${size}`;
  return canvasTexture(scene, key, size, size, (ctx) => paintIcon(ctx, name, size, color, ink));
}

export function glowTexture(scene: Phaser.Scene, color: number, size = 64): string {
  const key = `ui-glow-${color.toString(16)}-${size}`;
  return canvasTexture(scene, key, size, size, (ctx) => paintGlow(ctx, size, color));
}

export function radialVignetteTexture(scene: Phaser.Scene): string {
  return canvasTexture(scene, 'ui-radial-vignette', GAME_WIDTH / 2, GAME_HEIGHT / 2, (ctx) => paintRadialVignette(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2));
}

export function hatchTexture(scene: Phaser.Scene, ink: number, paper: number): string {
  const key = `ui-hatch-${ink.toString(16)}-${paper.toString(16)}`;
  return canvasTexture(scene, key, GAME_WIDTH, GAME_HEIGHT, (ctx) => paintHatch(ctx, GAME_WIDTH, GAME_HEIGHT, ink, paper));
}

export function fadeBarTexture(scene: Phaser.Scene, color: number, h = 64): string {
  const key = `ui-fadebar-${color.toString(16)}-${h}`;
  return canvasTexture(scene, key, 16, h, (ctx) => paintFadeBar(ctx, 16, h, color));
}

export function illuminatedTexture(scene: Phaser.Scene, size: number, field: number, frame: number, vine: number): string {
  const key = `ui-illum-${size}-${field.toString(16)}`;
  return canvasTexture(scene, key, size, size, (ctx) => paintIlluminatedBox(ctx, size, field, frame, vine));
}

/**
 * The vignette for an opening page: the world's `vignette-<canto>` if the art
 * layer made one, else our own engraving (`ui-vignette-<canto>`), 96×64.
 */
export function vignetteTexture(scene: Phaser.Scene, requested: string | null, cantoId: string, ink: number, paper: number): string {
  if (requested && scene.textures.exists(requested)) return requested;
  return imageTexture(scene, `ui-vignette-${cantoId}`, () => vignetteImage(cantoId, { ink, paper }));
}

export function motifTexture(scene: Phaser.Scene, motif: 'light' | 'poet' | 'wood', ink: number, paper: number): string {
  return imageTexture(scene, `ui-motif-${motif}`, () => motifImage(motif, { ink, paper }));
}

export const VIGNETTE_SIZE = { w: VIGNETTE_W, h: VIGNETTE_H } as const;

/**
 * A portrait for a speaker and tag: the art layer's `portrait-<speaker>-<tag>`
 * or `portrait-<speaker>`, else our fallback (`ui-portrait-<speaker>`), 32×32.
 */
export function portraitTexture(scene: Phaser.Scene, speaker: string, tag: string | null): string {
  const base = `portrait-${speaker.toLowerCase()}`;
  if (tag && scene.textures.exists(`${base}-${tag}`)) return `${base}-${tag}`;
  if (scene.textures.exists(base)) return base;
  return imageTexture(scene, `ui-portrait-${speaker}`, () => portraitImage(speaker));
}

export const PORTRAIT_PX = PORTRAIT_SIZE;

/** A 1×1 white texture for solid quads (tinted, scaled). */
export function pixelTexture(scene: Phaser.Scene): string {
  return canvasTexture(scene, 'ui-pixel', 2, 2, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
  });
}
