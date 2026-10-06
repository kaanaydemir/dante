/**
 * Souls · Places · Lore (bible §2.12), Remembrance (§3.5) and the Map (GDD 9):
 * the Codex entries with their quote and note; the names the world remembers
 * and the ones the reader carries; a Botticelli-like section of Hell with the
 * circles reached.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import type { CodexEntry, CodexTab as CodexTabId, QuoteStmt } from '../../story/types';
import { CODEX_TABS } from '../../story/types';
import { formatCitation } from '../../story/cite';
import { uiContext } from '../context';
import type { UiAction } from '../inputMap';
import { CODEX_TAB_LABELS, codexByTab, mapCircles, memoriesOf, REMEMBERED_BY_WORLD, REMEMBRANCE_EPIGRAPH } from '../models/book';
import { addText } from '../phaser/helpers';
import { lineHeight, mixColor, textStyle } from '../theme';
import type { BookCtx, BookTabView } from './types';
import { ListView, para, ScrollPage, type ListRow } from './widgets';

function quoteLines(q: QuoteStmt | null): string[] {
  return q ? q.lines.map((l) => (l.kind === 'verse' ? l.text : '…')) : [];
}

/** Draw a quote (verse lines + citation) at y; returns the new y. */
function drawQuote(ctx: BookCtx, parent: Phaser.GameObjects.Container, q: QuoteStmt | null, x0: number, x1: number, y0: number): number {
  if (!q) return y0;
  const theme = uiContext().theme();
  const c = theme.colors;
  let y = y0;
  for (const line of quoteLines(q)) y += para(ctx.scene, parent, x0 + 10, y, x1 - x0 - 10, line, 'verse', { px: Math.max(20, theme.size('verse') - 2), color: c.ink }).height;
  parent.add(addText(ctx.scene, x1, y + 2, q.citation?.text ?? q.citationRaw, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
  return y + theme.size('citation') + 14;
}

export class CodexTab implements BookTabView {
  readonly capturesHorizontal = false;
  private readonly list: ListView;
  private readonly page: ScrollPage;
  private entries: (CodexEntry | null)[] = [];

  constructor(private readonly ctx: BookCtx) {
    const { scene, root, left, right } = ctx;
    const theme = uiContext().theme();
    root.add(addText(scene, left.x0, left.y0, 'Souls · Places · Lore', textStyle(theme, 'heading', { px: Math.round(theme.size('heading') * 0.85), color: theme.colors.rubric })));
    this.page = new ScrollPage(scene, right, root);
    this.list = new ListView(scene, { ...left, y0: left.y0 + theme.size('heading') + 14 }, root, () => undefined, (i) => this.show(i));
    const byTab = codexByTab(ctx.store.state, ctx.story);
    const rows: ListRow[] = [];
    for (const tab of CODEX_TABS as readonly CodexTabId[]) {
      const list = byTab[tab];
      if (list.length === 0) continue;
      rows.push({ label: CODEX_TAB_LABELS[tab], header: true });
      this.entries.push(null);
      for (const e of list) {
        rows.push({ label: e.title, indent: 12 });
        this.entries.push(e);
      }
    }
    if (rows.length === 0) para(scene, root, right.x0, right.y0, right.x1 - right.x0, 'No page has been written yet.', 'body', { italic: true, color: theme.colors.inkSoft });
    this.list.setRows(rows, 1);
    ctx.footer('▴ ▾ choose · PgUp PgDn read', 'Esc close');
  }

  private show(i: number): void {
    this.page.clear();
    const e = this.entries[i];
    if (!e) return;
    const { scene } = this.ctx;
    const box = this.ctx.right;
    const theme = uiContext().theme();
    const c = theme.colors;
    const parent = this.page.content;
    let y = box.y0;
    parent.add(addText(scene, box.x0, y, CODEX_TAB_LABELS[e.tab].toUpperCase(), textStyle(theme, 'citation', { color: c.inkSoft, letterSpacing: 2 })));
    y += theme.size('citation') + 8;
    y += para(scene, parent, box.x0, y, box.x1 - box.x0, e.title, 'heading', { color: c.rubric }).height + 14;
    y = drawQuote(this.ctx, parent, e.quote, box.x0, box.x1, y);
    y += para(scene, parent, box.x0, y, box.x1 - box.x0, e.note, 'body', { color: c.ink }).height + 16;
    const related = e.related.map((id) => this.ctx.story.codex(id)).filter((r): r is CodexEntry => r !== null && this.ctx.store.state.codex.includes(r.id));
    if (related.length > 0) {
      y += para(scene, parent, box.x0, y, box.x1 - box.x0, `See also: ${related.map((r) => r.title).join(' · ')}`, 'citation', { italic: true, color: c.inkSoft }).height;
    }
    this.page.setHeight(y - box.y0 + 10);
  }

  onAction(action: UiAction): boolean {
    if (action === 'up') return this.list.move(-1), true;
    if (action === 'down') return this.list.move(1), true;
    if (action === 'pageDown') return this.page.pageDown(), true;
    if (action === 'pageUp') return this.page.pageUp(), true;
    return false;
  }

  onWheel(dy: number): void {
    this.page.scrollBy(dy);
  }

  destroy(): void {
    this.list.destroy();
    this.page.destroy();
  }
}

export class RemembranceTab implements BookTabView {
  readonly capturesHorizontal = false;
  private readonly page: ScrollPage;

  constructor(private readonly ctx: BookCtx) {
    const { scene, root, left, right } = ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    // Left: remembered by the world (IV 76–78).
    let y = left.y0;
    y += para(scene, root, left.x0, y, left.x1 - left.x0, 'Remembered by the world', 'heading', { px: Math.round(theme.size('heading') * 0.85), color: c.rubric }).height + 12;
    const src = ctx.story.source(REMEMBRANCE_EPIGRAPH.canticle, REMEMBRANCE_EPIGRAPH.canto);
    if (src) {
      for (let n = REMEMBRANCE_EPIGRAPH.first; n <= REMEMBRANCE_EPIGRAPH.last; n++) {
        y += para(scene, root, left.x0 + 10, y, left.x1 - left.x0 - 10, src.lines[n - 1] ?? '', 'verse', { px: Math.max(20, theme.size('verse') - 2), color: c.ink }).height;
      }
      root.add(addText(scene, left.x1, y + 2, formatCitation(REMEMBRANCE_EPIGRAPH.canticle, REMEMBRANCE_EPIGRAPH.canto, REMEMBRANCE_EPIGRAPH.first, REMEMBRANCE_EPIGRAPH.last), textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
      y += theme.size('citation') + 22;
    }
    for (const p of REMEMBERED_BY_WORLD) {
      root.add(addText(scene, left.x0, y, p.name, textStyle(theme, 'body', { color: c.ink })));
      y += lineHeight(theme.size('body'));
      y += para(scene, root, left.x0 + 16, y, left.x1 - left.x0 - 16, p.note, 'citation', { italic: true, color: c.inkSoft }).height + 8;
    }
    // Right: remembered by you.
    this.page = new ScrollPage(scene, right, root);
    const parent = this.page.content;
    let ry = right.y0;
    ry += para(scene, parent, right.x0, ry, right.x1 - right.x0, 'Remembered by you', 'heading', { px: Math.round(theme.size('heading') * 0.85), color: c.rubric }).height + 12;
    const memories = memoriesOf(ctx.store.state, ctx.story);
    if (memories.length === 0) {
      ry += para(scene, parent, right.x0, ry, right.x1 - right.x0, 'No one yet. Some of the dead ask to be remembered among the living; some never ask.', 'body', { italic: true, color: c.inkSoft }).height;
    }
    for (const m of memories) {
      ry += para(scene, parent, right.x0, ry, right.x1 - right.x0, m.name, 'body', { color: c.rubric }).height + 2;
      ry += para(scene, parent, right.x0, ry, right.x1 - right.x0, m.kind === 'kept' ? 'Kept: the poem shows they wished to be heard.' : 'Asked to be remembered.', 'citation', { italic: true, color: c.inkSoft }).height + 8;
      ry = drawQuote(ctx, parent, m.quote, right.x0, right.x1, ry);
      ry += para(scene, parent, right.x0, ry, right.x1 - right.x0, m.note, 'body', { color: c.ink }).height + 20;
    }
    this.page.setHeight(ry - right.y0 + 10);
    ctx.footer('PgUp PgDn read', 'Esc close');
  }

  onAction(action: UiAction): boolean {
    if (action === 'pageDown' || action === 'down') return this.page.scrollBy(action === 'down' ? 60 : 400), true;
    if (action === 'pageUp' || action === 'up') return this.page.scrollBy(action === 'up' ? -60 : -400), true;
    return false;
  }

  onWheel(dy: number): void {
    this.page.scrollBy(dy);
  }

  destroy(): void {
    this.page.destroy();
  }
}

/** A cross-section of Hell after Botticelli: terraces narrowing down to Cocytus. */
export class MapTab implements BookTabView {
  readonly capturesHorizontal = false;

  constructor(private readonly ctx: BookCtx) {
    const { scene, root, left, right } = ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    const circles = mapCircles(ctx.store.state);
    const g = scene.add.graphics();
    root.add(g);
    const cx = (left.x0 + left.x1) / 2;
    const top = left.y0 + 40;
    const bottom = left.y1 - 20;
    const n = circles.length;
    const step = (bottom - top) / n;
    const halfTop = (left.x1 - left.x0) / 2 - 6;
    const ink = theme.extra.inkFaint;
    // Earth around the funnel
    g.fillStyle(theme.extra.pageShade, 1);
    g.fillRect(left.x0 - 6, top - 10, left.x1 - left.x0 + 12, bottom - top + 20);
    circles.forEach((circle, i) => {
      const y0 = top + i * step;
      const w0 = halfTop * (1 - i / (n + 1.4));
      const w1 = halfTop * (1 - (i + 1) / (n + 1.4));
      const fill = circle.current ? mixColor(c.rubric, 0xffffff, 0.35) : circle.reached ? mixColor(c.gold, 0xffffff, 0.35) : mixColor(theme.extra.page, 0x000000, 0.08 + i * 0.03);
      g.fillStyle(fill, 1);
      g.beginPath();
      g.moveTo(cx - w0, y0);
      g.lineTo(cx + w0, y0);
      g.lineTo(cx + w1, y0 + step);
      g.lineTo(cx - w1, y0 + step);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, ink, 0.9);
      g.strokePath();
      // terrace hatching
      g.lineStyle(1, ink, 0.25);
      for (let k = 6; k < step; k += 6) g.lineBetween(cx - w0 + k * 0.4, y0 + k, cx - w0 + k * 0.4 + 10, y0 + k);
      if (circle.named) {
        const label = circle.numeral ? `${circle.numeral}` : '';
        if (label) root.add(addText(scene, cx, y0 + step / 2, label, textStyle(theme, 'citation', { color: circle.reached ? c.ink : c.inkSoft })).setOrigin(0.5, 0.5));
      }
      if (circle.current) {
        g.fillStyle(c.rubric, 1);
        g.fillCircle(cx + w1 * 0.6, y0 + step * 0.55, 5);
      }
    });
    root.add(addText(scene, cx, left.y0, 'The Inferno', textStyle(theme, 'heading', { px: Math.round(theme.size('heading') * 0.8), color: c.rubric })).setOrigin(0.5, 0));
    // Right page: the legend
    let y = right.y0;
    y += para(scene, root, right.x0, y, right.x1 - right.x0, 'The way down', 'heading', { px: Math.round(theme.size('heading') * 0.85), color: c.rubric }).height + 10;
    const lh = lineHeight(theme.size('body'));
    for (const circle of circles) {
      const name = circle.named ? `${circle.numeral ? `${circle.numeral} · ` : ''}${circle.name}` : '· · ·';
      const t = addText(scene, right.x0 + 22, y, name, textStyle(theme, 'body', { color: circle.current ? c.rubric : circle.reached ? c.ink : c.inkSoft, italic: !circle.reached }));
      root.add(t);
      if (circle.reached) {
        const dot = scene.add.graphics();
        dot.fillStyle(circle.current ? c.rubric : c.gold, 1);
        dot.fillCircle(right.x0 + 8, y + lh / 2 - 2, 5);
        root.add(dot);
      }
      y += lh + 2;
    }
    y += 10;
    const knows = circles.every((c2) => c2.named);
    para(
      scene,
      root,
      right.x0,
      y,
      right.x1 - right.x0,
      knows ? 'Minos sends each soul down as many circles as his tail coils.' : 'The lower circles are not yet known.',
      'citation',
      { italic: true, color: c.inkSoft },
    );
    ctx.footer('', 'Esc close');
  }

  onAction(): boolean {
    return false;
  }

  destroy(): void {
    // the root container is emptied by the Book
  }
}
