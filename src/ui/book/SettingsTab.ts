/**
 * Settings (bible §1.6, GDD 9.6): What Dante did timing, text speed, verse
 * display, text size, contrast, volumes, shake, flashes, gentle mode. The
 * right page shows a live sample in the chosen size and contrast.
 * Citations can never be hidden.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { uiContext } from '../context';
import type { UiAction } from '../inputMap';
import { SETTING_ROWS, stepSetting, valueLabel } from '../models/settings';
import { addText } from '../phaser/helpers';
import type { ActionMeta } from '../router';
import { cssColor, lineHeight, textStyle } from '../theme';
import type { BookCtx, BookTabView } from './types';
import { para } from './widgets';

interface Row {
  readonly label: Phaser.GameObjects.Text;
  readonly value: Phaser.GameObjects.Text;
  readonly left: Phaser.GameObjects.Text;
  readonly right: Phaser.GameObjects.Text;
  readonly y: number;
}

export class SettingsTab implements BookTabView {
  readonly capturesHorizontal = true;
  private index = 0;
  private rows: Row[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private help: Phaser.GameObjects.Container;
  private confirmLeave = false;

  constructor(private readonly ctx: BookCtx, startIndex = 0) {
    const { scene, root, left } = ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.index = startIndex;
    root.add(addText(scene, left.x0, left.y0, 'Settings', textStyle(theme, 'heading', { color: c.rubric })));
    this.highlight = scene.add.rectangle(left.x0 - 8, 0, left.x1 - left.x0 + 16, 32, theme.extra.rule, 0.18).setOrigin(0, 0);
    root.add(this.highlight);
    const rowH = Math.max(36, lineHeight(theme.size('body')) + 6);
    let y = left.y0 + theme.size('heading') + 22;
    const count = this.rowCount();
    for (let i = 0; i < count; i++) {
      const isLeave = i === SETTING_ROWS.length;
      const def = SETTING_ROWS[i];
      const label = addText(scene, left.x0, y, isLeave ? 'Return to the title page' : (def?.label ?? ''), textStyle(theme, 'body', { color: c.ink, italic: isLeave }));
      const value = addText(scene, left.x1 - 26, y, '', textStyle(theme, 'body', { color: c.rubric })).setOrigin(1, 0);
      const l = addText(scene, left.x1 - 26, y, '◂', textStyle(theme, 'body', { color: c.inkSoft })).setOrigin(1, 0);
      const r = addText(scene, left.x1, y, '▸', textStyle(theme, 'body', { color: c.inkSoft })).setOrigin(1, 0);
      const zone = scene.add.zone(left.x0 - 8, y - 2, left.x1 - left.x0 + 16, rowH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.select(i);
        if (isLeave) {
          this.activate();
          return;
        }
        // ◂ steps back, anything else on the row steps forward.
        const back = p.x >= l.x - l.width - 8 && p.x <= l.x + 6;
        this.step(back ? -1 : 1);
      });
      root.add([zone, label, value, l, r]);
      this.rows.push({ label, value, left: l, right: r, y });
      y += rowH;
    }
    this.help = scene.add.container(0, 0);
    root.add(this.help);
    this.refresh();
    this.select(Math.min(this.index, count - 1));
    ctx.footer('▴ ▾ choose · ◂ ▸ change', 'Esc close');
  }

  private rowCount(): number {
    return SETTING_ROWS.length + (this.ctx.inGame ? 1 : 0);
  }

  private refresh(): void {
    const s = this.ctx.store.settings;
    SETTING_ROWS.forEach((row, i) => {
      const r = this.rows[i];
      if (!r) return;
      r.value.setText(valueLabel(row, s));
      r.left.setX(r.value.x - r.value.width - 10);
    });
    const leave = this.rows[SETTING_ROWS.length];
    if (leave) {
      leave.value.setText(this.confirmLeave ? 'Press again' : '');
      leave.left.setText('');
      leave.right.setText('');
    }
  }

  private select(i: number): void {
    const n = this.rowCount();
    this.index = Math.max(0, Math.min(n - 1, i));
    if (this.index !== SETTING_ROWS.length) this.confirmLeave = false;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.rows.forEach((r, k) => r.label.setColor(cssColor(k === this.index ? c.rubric : c.ink)));
    const row = this.rows[this.index];
    if (row) this.highlight.setPosition(this.ctx.left.x0 - 8, row.y - 3).setSize(this.ctx.left.x1 - this.ctx.left.x0 + 16, Math.max(34, row.label.height + 6));
    this.refresh();
    this.drawHelp();
  }

  private drawHelp(): void {
    const { scene, right } = this.ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.help.removeAll(true);
    const def = SETTING_ROWS[this.index];
    let y = right.y0;
    const title = def ? def.label : 'Return to the title page';
    this.help.add(addText(scene, right.x0, y, title.toUpperCase(), textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 2 })));
    y += theme.size('citation') + 12;
    const help = def ? def.help : 'Your journey is kept at the start of the scene you are in. Continue from the title page.';
    y += para(scene, this.help, right.x0, y, right.x1 - right.x0, help, 'body', { color: c.ink }).height + 30;
    // A live sample: the size and contrast as they are now.
    this.help.add(addText(scene, right.x0, y, 'A SAMPLE', textStyle(theme, 'citation', { color: c.inkSoft, letterSpacing: 2 })));
    y += theme.size('citation') + 12;
    y += para(scene, this.help, right.x0, y, right.x1 - right.x0, 'Dante could not say how he had come into the wood.', 'narration', { italic: true, color: c.inkSoft }).height + 14;
    y += para(scene, this.help, right.x0 + 10, y, right.x1 - right.x0 - 10, 'Midway upon the journey of our life\nI found myself within a forest dark,', 'verse', { color: c.ink }).height + 6;
    this.help.add(addText(scene, right.x1, y, 'Inferno I, 1–2', textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
    y += theme.size('citation') + 24;
    para(scene, this.help, right.x0, y, right.x1 - right.x0, 'Citations are always shown.', 'citation', { italic: true, color: c.inkSoft });
  }

  private step(dir: 1 | -1): void {
    const def = SETTING_ROWS[this.index];
    if (!def) return;
    const patch = stepSetting(def, this.ctx.store.settings, dir);
    this.ctx.store.updateSettings(patch);
    const affectsLayout = 'fontScale' in patch || 'highContrast' in patch;
    if (affectsLayout) this.ctx.rerender();
    else this.refresh();
  }

  private activate(): void {
    if (this.index !== SETTING_ROWS.length) {
      this.step(1);
      return;
    }
    if (!this.confirmLeave) {
      this.confirmLeave = true;
      this.refresh();
      return;
    }
    this.ctx.close();
    try {
      this.ctx.session.stop();
    } catch {
      // the presenter shows the title anyway
    }
  }

  get selectedIndex(): number {
    return this.index;
  }

  onAction(action: UiAction, meta: ActionMeta): boolean {
    if (action === 'up') {
      this.select(this.index - 1);
      return true;
    }
    if (action === 'down') {
      this.select(this.index + 1);
      return true;
    }
    if (action === 'left' || action === 'right') {
      if (this.index < SETTING_ROWS.length) this.step(action === 'left' ? -1 : 1);
      return true;
    }
    if ((action === 'advance' || action === 'interact') && !meta.repeat) {
      this.activate();
      return true;
    }
    return false;
  }

  destroy(): void {
    // the root container is emptied by the Book
  }
}
