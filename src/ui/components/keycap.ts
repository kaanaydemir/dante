/**
 * Key prompts: small keycaps ("E", "Tab", "A") followed by a label, used for
 * "[E] Turn ▸", "[Q] gloss", tutorials and the Book's footer.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { uiContext } from '../context';
import { addText } from '../phaser/helpers';
import { textStyle } from '../theme';

export interface PromptOptions {
  /** Dark background (text on paper) vs light (text over the world). */
  readonly onPaper?: boolean;
  readonly align?: 'left' | 'right' | 'center';
  /** Override label colour. */
  readonly color?: number;
  readonly italic?: boolean;
  /** Label in the book face instead of the UI face. */
  readonly bookFace?: boolean;
}

/** A keycap at (0,0) left-centre; returns the container and its width. */
export function keycap(scene: Phaser.Scene, label: string, onPaper: boolean): { node: Phaser.GameObjects.Container; width: number } {
  const theme = uiContext().theme();
  const c = theme.colors;
  const fg = onPaper ? c.ink : c.paper;
  const bg = onPaper ? c.paperShade : 0x000000;
  const txt = addText(scene, 0, 0, label, textStyle(theme, 'ui', { color: fg, px: theme.size('ui') }));
  txt.setOrigin(0.5, 0.5);
  const w = Math.max(28, Math.ceil(txt.width) + 14);
  const h = Math.max(28, Math.ceil(txt.height) + 4);
  const g = scene.add.graphics();
  g.fillStyle(bg, onPaper ? 0.9 : 0.55);
  g.fillRoundedRect(0, -h / 2, w, h, 5);
  g.lineStyle(1.5, fg, 0.85);
  g.strokeRoundedRect(0.5, -h / 2 + 0.5, w - 1, h - 1, 5);
  g.lineStyle(2, fg, 0.35);
  g.lineBetween(4, h / 2 - 2, w - 4, h / 2 - 2);
  txt.setPosition(w / 2, -1);
  const node = scene.add.container(0, 0, [g, txt]);
  return { node, width: w };
}

/**
 * Keys then a label, as one container. The container's (0,0) is the left /
 * right / centre of the row (by `align`) at its vertical middle.
 */
export function promptRow(scene: Phaser.Scene, keys: readonly string[], label: string, opts: PromptOptions = {}): { node: Phaser.GameObjects.Container; width: number } {
  const theme = uiContext().theme();
  const onPaper = opts.onPaper ?? false;
  const node = scene.add.container(0, 0);
  let x = 0;
  keys.forEach((k, i) => {
    const cap = keycap(scene, k, onPaper);
    cap.node.setPosition(x, 0);
    node.add(cap.node);
    x += cap.width + (i < keys.length - 1 ? 4 : 10);
  });
  if (label) {
    const t = addText(
      scene,
      x,
      0,
      label,
      textStyle(theme, opts.bookFace ? 'citation' : 'ui', {
        face: opts.bookFace ? 'book' : 'ui',
        italic: opts.italic,
        color: opts.color ?? (onPaper ? theme.colors.inkSoft : theme.colors.paper),
        shadow: !onPaper,
      }),
    );
    t.setOrigin(0, 0.5);
    node.add(t);
    x += t.width;
  }
  const width = x;
  const align = opts.align ?? 'left';
  if (align !== 'left') {
    const shift = align === 'right' ? -width : -width / 2;
    for (const child of node.list as unknown as Phaser.GameObjects.Components.Transform[]) child.x += shift;
  }
  return { node, width };
}
