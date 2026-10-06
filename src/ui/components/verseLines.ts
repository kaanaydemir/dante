/**
 * Shared renderer for Longfellow lines inside cards and book pages: each line
 * as text, collectible words glowing in place, long lines hanging-indented.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import type { CollectibleWord } from '../../runtime/contracts';
import { glowTexture } from '../art/textures';
import { uiContext } from '../context';
import { addText, measurer } from '../phaser/helpers';
import { splitAround, wrapVerseLine } from '../text';
import { lineHeight, textStyle, type TextStyleSpec } from '../theme';

export interface GlowWord {
  readonly word: string;
  readonly text: Phaser.GameObjects.Text;
  readonly glow: Phaser.GameObjects.Image;
}

export interface RenderedLines {
  readonly height: number;
  readonly width: number;
  /** Objects per source line (index into `lines`), in order. */
  readonly nodes: Phaser.GameObjects.GameObject[][];
  readonly words: GlowWord[];
}

export interface VerseLinesOptions {
  readonly x: number;
  readonly y: number;
  readonly maxWidth: number;
  readonly style: TextStyleSpec;
  /** px of the font (for line height). */
  readonly px: number;
  readonly collectible?: readonly CollectibleWord[];
  /** Index offset: collectible lineIndex values are relative to this. */
  readonly indexBase?: number;
  readonly taken?: ReadonlySet<string>;
  /** Per-line colour override (e.g. gold for lines the reader saw). */
  readonly colorOf?: (index: number) => string | null;
  readonly indent?: number;
  readonly lineHeightPx?: number;
  readonly startHidden?: boolean;
}

/** Measure the height the lines would take (same wrapping as renderVerseLines). */
export function measureVerseLines(lines: readonly string[], opts: Pick<VerseLinesOptions, 'maxWidth' | 'style' | 'px' | 'indent' | 'lineHeightPx'>): { height: number; width: number } {
  const measure = measurer(opts.style);
  const lh = opts.lineHeightPx ?? lineHeight(opts.px, 'verse');
  let rows = 0;
  let width = 0;
  for (const line of lines) {
    const segs = wrapVerseLine(line, opts.maxWidth, measure, opts.indent ?? 32);
    rows += segs.length;
    for (const s of segs) width = Math.max(width, measure(s.text) + (s.continuation ? (opts.indent ?? 32) : 0));
  }
  return { height: rows * lh, width };
}

export function renderVerseLines(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, lines: readonly string[], opts: VerseLinesOptions): RenderedLines {
  const theme = uiContext().theme();
  const measure = measurer(opts.style);
  const lh = opts.lineHeightPx ?? lineHeight(opts.px, 'verse');
  const indent = opts.indent ?? 32;
  const base = opts.indexBase ?? 0;
  const nodes: Phaser.GameObjects.GameObject[][] = [];
  const words: GlowWord[] = [];
  let y = opts.y;
  let width = 0;
  lines.forEach((line, i) => {
    const color = opts.colorOf?.(i) ?? null;
    const style = color ? { ...opts.style, color } : opts.style;
    const col = opts.collectible?.find((c) => c.lineIndex === i + base && !(opts.taken?.has(c.word) ?? false)) ?? null;
    const segs = wrapVerseLine(line, opts.maxWidth, measure, indent);
    const lineNodes: Phaser.GameObjects.GameObject[] = [];
    let offset = 0;
    segs.forEach((seg, k) => {
      const sx = opts.x + (seg.continuation ? indent : 0);
      const inSeg = col && col.start >= offset && col.end <= offset + seg.text.length;
      if (col && inSeg) {
        const [before, word, after] = splitAround(seg.text, col.start - offset, col.end - offset);
        const t1 = addText(scene, sx, y, before, style);
        const wx = sx + measure(before);
        const glow = scene.add.image(wx + measure(word) / 2, y + opts.px * 0.62, glowTexture(scene, theme.extra.glow));
        glow.setDisplaySize(measure(word) + 44, opts.px * 1.9).setAlpha(0.6).setBlendMode('ADD');
        const t2 = addText(scene, wx, y, word, { ...style, color: `#${theme.extra.glow.toString(16).padStart(6, '0')}`, shadow: { offsetX: 0, offsetY: 0, color: 'rgba(255,200,80,0.9)', blur: 8, fill: true } });
        const t3 = addText(scene, wx + measure(word), y, after, style);
        glow.setData('glow', true);
        lineNodes.push(glow, t1, t2, t3);
        words.push({ word: col.word, text: t2, glow });
        if (!opts.startHidden) pulse(scene, glow);
      } else {
        lineNodes.push(addText(scene, sx, y, seg.text, style));
      }
      width = Math.max(width, measure(seg.text) + (seg.continuation ? indent : 0));
      offset += seg.text.length + (k < segs.length - 1 ? 1 : 0);
      y += lh;
    });
    for (const n of lineNodes) {
      if (opts.startHidden) (n as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
      parent.add(n);
    }
    nodes.push(lineNodes);
  });
  return { height: y - opts.y, width, nodes, words };
}

/** The glow behind a collectible word breathes. */
export function pulse(scene: Phaser.Scene, glow: Phaser.GameObjects.Image): void {
  scene.tweens.add({ targets: glow, alpha: { from: 0.45, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

/** Fade in one line's objects (hidden with startHidden); glows start breathing. */
export function revealNodes(scene: Phaser.Scene, nodes: readonly Phaser.GameObjects.GameObject[], ms = 450): void {
  for (const n of nodes) {
    const isGlow = n.getData('glow') === true;
    if (isGlow) {
      const img = n as Phaser.GameObjects.Image;
      scene.tweens.add({ targets: img, alpha: 0.6, duration: ms, onComplete: () => pulse(scene, img) });
    } else {
      scene.tweens.add({ targets: n, alpha: 1, duration: ms, ease: 'Sine.easeOut' });
    }
  }
}

/** World-space centre of a glowing word. */
export function wordCenter(w: GlowWord): { x: number; y: number } {
  const m = w.text.getWorldTransformMatrix();
  return { x: m.tx + w.text.width / 2, y: m.ty + w.text.height / 2 };
}

/** Dim a taken word in place. */
export function dimWord(scene: Phaser.Scene, w: GlowWord): void {
  scene.tweens.killTweensOf(w.glow);
  scene.tweens.add({ targets: w.glow, alpha: 0, duration: 250 });
  scene.tweens.add({ targets: w.text, alpha: 0.4, duration: 250 });
}
