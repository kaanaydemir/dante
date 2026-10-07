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
import { addText, measurer } from '../phaser/helpers';
import type { ActionMeta } from '../router';
import { cssColor, lineHeight, textStyle } from '../theme';
import type { BookCtx, BookTabView } from './types';
import { para, ScrollPage } from './widgets';

interface Row {
  readonly label: Phaser.GameObjects.Text;
  readonly value: Phaser.GameObjects.Text;
  readonly left: Phaser.GameObjects.Text;
  readonly right: Phaser.GameObjects.Text;
  /** Top of the row in the scroll page's content space. */
  readonly y: number;
  readonly h: number;
  /** Hidden together when the page edge would cut the row. */
  readonly objs: readonly Phaser.GameObjects.Text[];
}

export class SettingsTab implements BookTabView {
  readonly capturesHorizontal = true;
  private index = 0;
  private rows: Row[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private help: Phaser.GameObjects.Container;
  private readonly page: ScrollPage;
  private confirmLeave = false;
  /** Width left for a row's value (label on the left, ◂ value ▸ on the right). */
  private valueRoom: number[] = [];

  constructor(private readonly ctx: BookCtx, startIndex = 0) {
    const { scene, root, left } = ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.index = startIndex;
    root.add(addText(scene, left.x0, left.y0, 'Settings', textStyle(theme, 'heading', { color: c.rubric })));
    // The rows scroll inside the page at larger text sizes.
    const box = { ...left, y0: left.y0 + theme.size('heading') + 18 };
    this.page = new ScrollPage(scene, box, root);
    const parent = this.page.content;
    this.highlight = scene.add.rectangle(left.x0 - 8, 0, left.x1 - left.x0 + 16, 32, theme.extra.rule, 0.18).setOrigin(0, 0);
    parent.add(this.highlight);
    const rowH = Math.max(36, lineHeight(theme.size('body')) + 6);
    let y = box.y0 + 4;
    const count = this.rowCount();
    const labelStyle = textStyle(theme, 'body', { color: c.ink });
    const measure = measurer(labelStyle);
    for (let i = 0; i < count; i++) {
      const isLeave = i === SETTING_ROWS.length;
      const def = SETTING_ROWS[i];
      const labelText = isLeave ? 'Return to the title page' : (def?.label ?? '');
      const label = addText(scene, left.x0, y, labelText, textStyle(theme, 'body', { color: c.ink, italic: isLeave }));
      const value = addText(scene, left.x1 - 26, y, '', textStyle(theme, 'body', { color: c.rubric })).setOrigin(1, 0);
      const l = addText(scene, left.x1 - 26, y, '◂', textStyle(theme, 'body', { color: c.inkSoft })).setOrigin(1, 0);
      const r = addText(scene, left.x1, y, '▸', textStyle(theme, 'body', { color: c.inkSoft })).setOrigin(1, 0);
      const rowY = y;
      const zone = scene.add.zone(left.x0 - 8, y - 2, left.x1 - left.x0 + 16, rowH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        // Rows scrolled out of the page still have zones: only the visible part of the page counts.
        if (p.y < box.y0 || p.y > box.y1) return;
        this.select(i);
        if (isLeave) {
          this.activate();
          return;
        }
        // ◂ steps back, anything else on the row steps forward.
        const back = p.x >= l.x - l.width - 8 && p.x <= l.x + 6;
        this.step(back ? -1 : 1);
      });
      parent.add([zone, label, value, l, r]);
      this.rows.push({ label, value, left: l, right: r, y: rowY, h: rowH, objs: [label, value, l, r] });
      this.valueRoom.push(left.x1 - 26 - left.x0 - measure(labelText) - 44);
      y += rowH;
    }
    this.page.onScroll = () => this.clipRows();
    this.page.setHeight(y - box.y0);
    this.help = scene.add.container(0, 0);
    root.add(this.help);
    this.refresh();
    this.select(Math.min(this.index, count - 1));
    ctx.footer('▴ ▾ choose · ◂ ▸ change', 'Esc close');
  }

  /** A list shows whole rows only: rows the page edge would cut are hidden. */
  private clipRows(): void {
    for (const r of this.rows) {
      const visible = this.page.shows(r.y - 2, r.y + r.h - 6);
      for (const o of r.objs) o.setVisible(visible);
    }
    const sel = this.rows[this.index];
    if (sel) this.highlight.setVisible(this.page.shows(sel.y - 2, sel.y + sel.h - 6));
  }

  private rowCount(): number {
    return SETTING_ROWS.length + (this.ctx.inGame ? 1 : 0);
  }

  private refresh(): void {
    const s = this.ctx.store.settings;
    const theme = uiContext().theme();
    SETTING_ROWS.forEach((row, i) => {
      const r = this.rows[i];
      if (!r) return;
      r.value.setText(valueLabel(row, s));
      // A long value ("At the end of the canto") steps down a size rather than run into its label.
      const room = this.valueRoom[i] ?? 9999;
      r.value.setFontSize(theme.size('body'));
      if (r.value.width > room) r.value.setFontSize(theme.size('citation'));
      r.value.setY(r.y + Math.max(0, (r.label.height - r.value.height) / 2));
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
    if (row) {
      this.highlight.setPosition(this.ctx.left.x0 - 8, row.y - 3).setSize(this.ctx.left.x1 - this.ctx.left.x0 + 16, Math.max(34, row.label.height + 6));
      this.page.reveal(row.y - 4, row.y + row.h + 4);
      this.clipRows();
    }
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
    // The root container is emptied by the Book; the scroll page's mask is ours to free.
    this.page.destroy();
  }
}
