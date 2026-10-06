/**
 * The choice margin (bible §1.3.5, §1.4): the book's margin slides in from the
 * right with the prompt in the book's voice and 2–3 options. No timer, no
 * numbers on screen. Keyboard, pad and mouse.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_WIDTH } from '../../config';
import type { ChoiceOptionView } from '../../runtime/contracts';
import { panelTexture } from '../art/textures';
import { uiContext } from '../context';
import { addText, destroy, measurer, tweenTo } from '../phaser/helpers';
import { wrapText } from '../text';
import { cssColor, lineHeight, textStyle } from '../theme';
import { promptRow } from './keycap';
import { keyLabel } from './VerseBubble';

const WIDTH = 430;
const RIGHT = GAME_WIDTH - 14;
const PAD = 34;
const TOP_LIMIT = 92;
const BOTTOM_LIMIT = 664;

interface Row {
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly pointer: Phaser.GameObjects.Text;
  readonly text: Phaser.GameObjects.Text;
}

export class ChoiceMargin {
  private root: Phaser.GameObjects.Container | null = null;
  private rows: Row[] = [];
  private selected = 0;
  private pick: ((index: number) => void) | null = null;
  private hover: ((index: number) => void) | null = null;
  private locked = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.margin,
  ) {}

  get visible(): boolean {
    return this.root !== null;
  }

  open(prompt: string | null, options: readonly ChoiceOptionView[], handlers: { onPick: (i: number) => void; onHover: (i: number) => void }): void {
    this.clear();
    const theme = uiContext().theme();
    const c = theme.colors;
    this.pick = handlers.onPick;
    this.hover = handlers.onHover;
    this.locked = false;
    const inner = WIDTH - PAD * 2 - 26;
    const promptStyle = textStyle(theme, 'body', { italic: true, color: c.inkSoft });
    const optStyle = textStyle(theme, 'option', { color: c.ink });
    const pm = measurer(promptStyle);
    const om = measurer(optStyle);
    const plh = lineHeight(theme.size('body'));
    const olh = lineHeight(theme.size('option'));
    const promptLines = prompt ? wrapText(prompt, WIDTH - PAD * 2, pm) : [];
    const optLines = options.map((o) => wrapText(o.text, inner, om));
    const gap = 16;
    let h = PAD + 8;
    if (promptLines.length > 0) h += promptLines.length * plh + 26;
    for (const lines of optLines) h += lines.length * olh + gap + 12;
    h += 44 + PAD;
    h = Math.min(h, BOTTOM_LIMIT - TOP_LIMIT);
    const panel = panelTexture(this.scene, 'margin', WIDTH, h, theme);
    const top = Math.max(TOP_LIMIT, Math.round((TOP_LIMIT + BOTTOM_LIMIT) / 2 - panel.h / 2) - 20);
    const root = this.scene.add.container(RIGHT - panel.w, top).setDepth(this.depth);
    root.add(this.scene.add.image(0, 0, panel.key).setOrigin(0, 0));
    let y = PAD + 6;
    if (promptLines.length > 0) {
      const p = addText(this.scene, PAD, y, promptLines.join('\n'), { ...promptStyle, lineSpacing: plh - theme.size('body') });
      root.add(p);
      y += promptLines.length * plh + 12;
      const rule = this.scene.add.graphics();
      rule.lineStyle(1, theme.extra.rule, 0.7);
      rule.lineBetween(PAD, y, panel.w - PAD, y);
      rule.fillStyle(theme.extra.rule, 0.9);
      rule.fillCircle(panel.w / 2, y, 2.5);
      root.add(rule);
      y += 14;
    }
    this.rows = [];
    optLines.forEach((lines, i) => {
      const rowH = lines.length * olh + 12;
      const bg = this.scene.add.rectangle(PAD - 12, y - 6, panel.w - PAD * 2 + 24, rowH, theme.extra.rule, 0).setOrigin(0, 0);
      const pointer = addText(this.scene, PAD - 2, y, '▸', textStyle(theme, 'option', { color: c.rubric }));
      pointer.setAlpha(0);
      const text = addText(this.scene, PAD + 24, y, lines.join('\n'), { ...optStyle, lineSpacing: olh - theme.size('option') });
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        if (!this.locked) this.hover?.(i);
      });
      bg.on('pointerdown', () => {
        if (!this.locked) this.pick?.(i);
      });
      root.add([bg, pointer, text]);
      this.rows.push({ bg, pointer, text });
      y += rowH + gap;
    });
    const hint = promptRow(this.scene, [keyLabel('confirm')], 'Choose', { onPaper: true, align: 'right' });
    hint.node.setPosition(panel.w - PAD + 6, panel.h - PAD - 4);
    hint.node.setAlpha(0.8);
    root.add(hint.node);
    this.root = root;
    this.selected = 0;
    this.render();
    root.x = GAME_WIDTH + 10;
    this.scene.tweens.add({ targets: root, x: RIGHT - panel.w, duration: 320, ease: 'Cubic.easeOut' });
  }

  select(index: number): void {
    if (index < 0 || index >= this.rows.length || this.locked) return;
    this.selected = index;
    this.render();
  }

  private render(): void {
    const theme = uiContext().theme();
    this.rows.forEach((row, i) => {
      const on = i === this.selected;
      row.bg.setFillStyle(theme.extra.rule, on ? 0.18 : 0);
      row.pointer.setAlpha(on ? 1 : 0);
      row.text.setColor(cssColor(on ? theme.colors.ink : theme.colors.inkSoft));
    });
  }

  /** The chosen row flashes, the others fade; then the margin slides out. */
  async confirm(index: number): Promise<void> {
    if (index >= 0 && index < this.rows.length) this.selected = index;
    this.render();
    this.locked = true;
    const root = this.root;
    if (!root) return;
    const others = this.rows.filter((_, i) => i !== index).flatMap((r) => [r.text, r.pointer]);
    this.scene.tweens.add({ targets: others, alpha: 0.25, duration: 200 });
    const row = this.rows[index];
    if (row) await tweenTo(this.scene, { targets: row.bg, alpha: 0.45, yoyo: true, duration: 160, repeat: 1 });
    await this.close();
  }

  async close(): Promise<void> {
    const root = this.root;
    this.detach();
    if (!root) return;
    await tweenTo(this.scene, { targets: root, x: GAME_WIDTH + 10, duration: 260, ease: 'Cubic.easeIn' });
    destroy(root);
  }

  clear(): void {
    const root = this.root;
    this.detach();
    destroy(root);
  }

  private detach(): void {
    this.root = null;
    this.rows = [];
    this.pick = null;
    this.hover = null;
  }
}
