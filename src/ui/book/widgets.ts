/**
 * Widgets for the Book's pages: a selectable list and a scrollable page
 * (masked to the page box, wheel / PageUp / PageDown / arrows), plus small
 * text helpers that respect the reader's font size and contrast.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { uiContext } from '../context';
import { addText, destroy, measurer } from '../phaser/helpers';
import { wrapText, wrapVerseLine } from '../text';
import { cssColor, lineHeight, textStyle, type FontKind, type StyleOptions } from '../theme';

export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** Wrapped text block; returns the object and its height. */
export function para(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  text: string,
  kind: FontKind,
  opts: StyleOptions = {},
): { obj: Phaser.GameObjects.Text; height: number } {
  const theme = uiContext().theme();
  const style = textStyle(theme, kind, opts);
  const px = opts.px ?? theme.size(kind);
  const measure = measurer(style);
  // Verse keeps its lines: a line too long for the page turns over with a hanging indent.
  const lines = kind === 'verse' ? verseRows(text, width, measure) : wrapText(text, width, measure);
  const lh = lineHeight(px, kind === 'verse' ? 'verse' : 'prose');
  const obj = addText(scene, x, y, lines.join('\n'), { ...style, lineSpacing: lh - px });
  parent.add(obj);
  return { obj, height: lines.length * lh };
}

/** Indent of a turned-over verse line (two em spaces, so it survives in a single text object). */
const VERSE_INDENT = '\u2003\u2003';

/** Verse lines wrapped for a width; continuations start with VERSE_INDENT. */
export function verseRows(text: string, width: number, measure: (s: string) => number): string[] {
  const indentPx = measure(VERSE_INDENT);
  return text
    .split('\n')
    .flatMap((line) => wrapVerseLine(line, width, measure, indentPx).map((seg) => (seg.continuation ? VERSE_INDENT + seg.text : seg.text)));
}

// ---------------------------------------------------------------------------
// Scrollable page
// ---------------------------------------------------------------------------

export class ScrollPage {
  readonly content: Phaser.GameObjects.Container;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private height = 0;
  private offset = 0;
  /** Called after every scroll with the new offset (lists hide rows the page edge would cut). */
  onScroll: ((offset: number) => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly box: Box,
    parent: Phaser.GameObjects.Container,
  ) {
    this.content = scene.add.container(0, 0);
    this.maskShape = scene.make.graphics({}, false);
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(box.x0 - 6, box.y0, box.x1 - box.x0 + 12, box.y1 - box.y0);
    this.content.setMask(this.maskShape.createGeometryMask());
    this.bar = scene.add.graphics();
    parent.add([this.content, this.bar]);
  }

  get viewHeight(): number {
    return this.box.y1 - this.box.y0;
  }

  /** Set the total content height (after adding children at y ≥ box.y0). */
  setHeight(h: number): void {
    this.height = h;
    this.scrollTo(0);
  }

  scrollTo(y: number): void {
    const max = Math.max(0, this.height - this.viewHeight);
    this.offset = Math.max(0, Math.min(max, y));
    this.content.y = -this.offset;
    this.drawBar();
    try {
      this.onScroll?.(this.offset);
    } catch {
      // cosmetic
    }
  }

  get scrollOffset(): number {
    return this.offset;
  }

  /** Is a content-space range fully inside the visible page? */
  shows(y0: number, y1: number): boolean {
    return y0 - this.offset >= this.box.y0 - 1 && y1 - this.offset <= this.box.y1 + 1;
  }

  scrollBy(dy: number): void {
    this.scrollTo(this.offset + dy);
  }

  pageDown(): void {
    this.scrollBy(this.viewHeight * 0.85);
  }

  pageUp(): void {
    this.scrollBy(-this.viewHeight * 0.85);
  }

  /** Make a content-space range visible. */
  reveal(y0: number, y1: number): void {
    const top = y0 - this.box.y0;
    const bottom = y1 - this.box.y0;
    if (top < this.offset) this.scrollTo(top - 10);
    else if (bottom > this.offset + this.viewHeight) this.scrollTo(bottom - this.viewHeight + 10);
  }

  private drawBar(): void {
    const g = this.bar;
    g.clear();
    // A few pixels of trailing space are not worth a scroll bar.
    if (this.height <= this.viewHeight + 4) return;
    const theme = uiContext().theme();
    const x = this.box.x1 + 14;
    const h = this.viewHeight;
    const thumb = Math.max(30, (h * h) / this.height);
    const t = (this.offset / (this.height - h)) * (h - thumb);
    g.fillStyle(theme.extra.inkFaint, 0.25);
    g.fillRoundedRect(x - 2, this.box.y0, 4, h, 2);
    g.fillStyle(theme.colors.rubric, 0.75);
    g.fillRoundedRect(x - 2, this.box.y0 + t, 4, thumb, 2);
  }

  clear(): void {
    this.content.removeAll(true);
    this.height = 0;
    this.offset = 0;
    this.content.y = 0;
    this.drawBar();
  }

  destroy(): void {
    destroy(this.content);
    destroy(this.bar);
    this.maskShape.destroy();
  }
}

// ---------------------------------------------------------------------------
// Selectable list
// ---------------------------------------------------------------------------

export interface ListRow {
  readonly label: string;
  /** Not selectable (a heading). */
  readonly header?: boolean;
  readonly muted?: boolean;
  readonly indent?: number;
  /** Small text right-aligned on the row. */
  readonly aside?: string;
}

export class ListView {
  private readonly page: ScrollPage;
  private rows: ListRow[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private tops: number[] = [];
  private heights: number[] = [];
  /** Every object of a row (text, aside), hidden together when the page edge would cut the row. */
  private rowObjects: Phaser.GameObjects.GameObject[][] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  index = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly box: Box,
    parent: Phaser.GameObjects.Container,
    private readonly onPick: (index: number) => void,
    private readonly onSelect: (index: number) => void,
  ) {
    this.page = new ScrollPage(scene, box, parent);
    this.highlight = scene.add.rectangle(box.x0 - 8, box.y0, box.x1 - box.x0 + 16, 30, uiContext().theme().extra.rule, 0.18).setOrigin(0, 0);
    this.page.content.add(this.highlight);
    this.page.onScroll = () => this.clipRows();
  }

  /** Rows the page edge would cut in half are hidden (a list shows whole rows only). */
  private clipRows(): void {
    this.rowObjects.forEach((objs, i) => {
      const top = this.tops[i] ?? 0;
      const visible = this.page.shows(top - 2, top + (this.heights[i] ?? 0) - 6);
      for (const o of objs) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
    });
    if (this.index >= 0) {
      const top = this.tops[this.index] ?? 0;
      this.highlight.setVisible(this.page.shows(top - 2, top + (this.heights[this.index] ?? 0) - 6));
    }
  }

  setRows(rows: ListRow[], select = 0): void {
    // The highlight survives the clear (clear destroys every child of the page).
    this.page.content.remove(this.highlight, false);
    this.page.clear();
    this.page.content.add(this.highlight);
    this.rows = rows;
    this.texts = [];
    this.tops = [];
    this.heights = [];
    this.rowObjects = [];
    const theme = uiContext().theme();
    const c = theme.colors;
    let y = this.box.y0 + 2;
    rows.forEach((row, i) => {
      const kind: FontKind = row.header ? 'citation' : 'body';
      const px = theme.size(kind);
      const style = textStyle(theme, kind, {
        color: row.header ? c.rubric : row.muted ? c.inkSoft : c.ink,
        italic: row.muted,
        letterSpacing: row.header ? 2 : undefined,
      });
      const x = this.box.x0 + (row.indent ?? 0);
      const objs: Phaser.GameObjects.GameObject[] = [];
      let asideW = 0;
      if (row.aside) {
        const a = addText(this.scene, this.box.x1, y + 3, row.aside, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0);
        asideW = a.width + 12;
        this.page.content.add(a);
        objs.push(a);
      }
      // Long labels (a canto's full title at the largest size) turn over instead of running off the page.
      const label = row.header ? row.label.toUpperCase() : row.label;
      const lines = wrapText(label, Math.max(60, this.box.x1 - x - asideW), measurer(style));
      const lh = lineHeight(px, 'ui');
      const t = addText(this.scene, x, y + (row.header ? 8 : 0), lines.join('\n'), { ...style, lineSpacing: lh - px });
      this.page.content.add(t);
      objs.push(t);
      const h = Math.max(t.height + (row.header ? 12 : 6), row.header ? 36 : 34);
      if (!row.header) {
        const zone = this.scene.add.zone(this.box.x0 - 8, y - 2, this.box.x1 - this.box.x0 + 16, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
          // Rows scrolled out of the page still have zones: only the visible part of the page counts.
          if (p.y < this.box.y0 || p.y > this.box.y1) return;
          this.select(i);
          this.onPick(i);
        });
        this.page.content.add(zone);
      }
      this.texts.push(t);
      this.tops.push(y);
      this.heights.push(h);
      this.rowObjects.push(objs);
      y += h;
    });
    this.page.setHeight(y - this.box.y0 + 10);
    const first = this.nextSelectable(select - 1, 1);
    this.index = -1;
    if (first >= 0) this.select(first);
    else this.highlight.setVisible(false);
  }

  private nextSelectable(from: number, dir: 1 | -1): number {
    for (let i = from + dir; i >= 0 && i < this.rows.length; i += dir) if (!this.rows[i]?.header) return i;
    return -1;
  }

  move(dir: 1 | -1): boolean {
    const next = this.nextSelectable(this.index, dir);
    if (next < 0) return false;
    this.select(next);
    return true;
  }

  select(i: number): void {
    if (i < 0 || i >= this.rows.length || this.rows[i]?.header) return;
    const changed = i !== this.index;
    this.index = i;
    const theme = uiContext().theme();
    this.texts.forEach((t, k) => {
      const row = this.rows[k];
      if (!row || row.header) return;
      t.setColor(cssColor(k === i ? theme.colors.rubric : row.muted ? theme.colors.inkSoft : theme.colors.ink));
    });
    const top = this.tops[i] ?? this.box.y0;
    const h = this.heights[i] ?? 30;
    this.highlight.setVisible(true).setPosition(this.box.x0 - 8, top - 3).setSize(this.box.x1 - this.box.x0 + 16, h);
    this.page.reveal(top - 4, top + h + 4);
    if (changed) this.onSelect(i);
  }

  scroll(dy: number): void {
    this.page.scrollBy(dy);
  }

  destroy(): void {
    this.page.destroy();
  }
}

