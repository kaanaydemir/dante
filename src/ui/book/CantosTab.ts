/**
 * Cantos (bible §1.5): for every canto played, "As you lived it" (what the
 * reader saw, with the margin notes of the choices), "Your verses" (tercets
 * composed there, read as Longfellow lines), and "The whole canto" once its
 * colophon is reached (every line numbered, the reader's lines in gold).
 * Also the Verses tab: every line seen, in canto and line order.
 *
 * Owner: team C (presentation).
 */

import type { ComposedVerse, ReadingLogEntry } from '../../runtime/contracts';
import { cantoLabel } from '../../story/cite';
import type { CantoId } from '../../story/types';
import { centoLines } from '../../verse/cento';
import { uiContext } from '../context';
import type { UiAction } from '../inputMap';
import { livedEntries, playedCantos, versesSeen, wholeCanto, type CantoListItem } from '../models/book';
import { addText, measurer } from '../phaser/helpers';
import { unquote, wrapVerseLine } from '../text';
import { cssColor, lineHeight, textStyle } from '../theme';
import type { BookCtx, BookTabView } from './types';
import { ListView, para, ScrollPage, type ListRow } from './widgets';

type Section = 'lived' | 'verses' | 'whole';

interface Entry {
  readonly canto: CantoListItem;
  readonly section: Section;
}

export class CantosTab implements BookTabView {
  readonly capturesHorizontal = false;
  private readonly list: ListView;
  private readonly page: ScrollPage;
  private entries: (Entry | null)[] = [];

  constructor(private readonly ctx: BookCtx) {
    const { scene, root, left, right } = ctx;
    const theme = uiContext().theme();
    root.add(addText(scene, left.x0, left.y0, 'Cantos', textStyle(theme, 'heading', { color: theme.colors.rubric })));
    const listBox = { ...left, y0: left.y0 + theme.size('heading') + 18 };
    this.page = new ScrollPage(scene, right, root);
    this.list = new ListView(scene, listBox, root, () => undefined, (i) => this.show(i));
    const cantos = playedCantos(ctx.store.state, ctx.story);
    const rows: ListRow[] = [];
    this.entries = [];
    for (const canto of cantos) {
      rows.push({ label: `Canto ${canto.numeral} · ${canto.title}`, header: true });
      this.entries.push(null);
      rows.push({ label: 'As you lived it', indent: 14 });
      this.entries.push({ canto, section: 'lived' });
      rows.push({ label: 'Your verses', indent: 14 });
      this.entries.push({ canto, section: 'verses' });
      rows.push({ label: 'The whole canto', indent: 14, muted: !canto.fullText, ...(canto.fullText ? {} : { aside: 'after its last page' }) });
      this.entries.push({ canto, section: 'whole' });
    }
    if (rows.length === 0) {
      para(scene, root, right.x0, right.y0, right.x1 - right.x0, 'Nothing has been read yet.', 'body', { italic: true, color: theme.colors.inkSoft });
    }
    // Open on the current canto's "As you lived it".
    const current = ctx.store.state.position.canto;
    const at = Math.max(0, this.entries.findIndex((e) => e?.canto.id === current && e.section === 'lived'));
    this.list.setRows(rows, at);
    ctx.footer('▴ ▾ choose · PgUp PgDn read', 'Esc close');
  }

  private show(i: number): void {
    const entry = this.entries[i];
    this.page.clear();
    if (!entry) return;
    const { scene } = this.ctx;
    const box = this.ctx.right;
    const width = box.x1 - box.x0;
    const theme = uiContext().theme();
    const c = theme.colors;
    const parent = this.page.content;
    let y = box.y0;
    const heading = (text: string): void => {
      parent.add(addText(scene, box.x0, y, text.toUpperCase(), textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 2 })));
      y += theme.size('citation') + 16;
    };
    if (entry.section === 'lived') {
      heading(`${cantoLabel(Number(/\d+$/.exec(entry.canto.id)?.[0] ?? 0))} · As you lived it`);
      const log = livedEntries(this.ctx.store.state, entry.canto.id);
      if (log.length === 0) y += para(scene, parent, box.x0, y, width, 'Nothing yet.', 'body', { italic: true, color: c.inkSoft }).height;
      for (const e of log) y = this.drawEntry(e, y) + 14;
    } else if (entry.section === 'verses') {
      heading('Your verses');
      const verses = this.ctx.store.state.verses.filter((v) => v.canto === entry.canto.id);
      if (verses.length === 0) {
        y += para(scene, parent, box.x0, y, width, 'No verse was composed in this canto.', 'body', { italic: true, color: c.inkSoft }).height;
      }
      for (const v of verses) {
        for (const line of centoLines(v.verse as ComposedVerse)) {
          y += para(scene, parent, box.x0, y, width, line.text, 'verse', { color: c.ink }).height;
          parent.add(addText(scene, box.x1, y, line.citation, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
          y += theme.size('citation') + 8;
        }
        y += 18;
      }
    } else {
      heading(`The whole canto`);
      y = this.drawWhole(entry.canto.id, entry.canto.fullText, y);
    }
    this.page.setHeight(y - box.y0 + 20);
  }

  private drawEntry(e: ReadingLogEntry, y0: number): number {
    const { scene } = this.ctx;
    const box = this.ctx.right;
    const width = box.x1 - box.x0;
    const theme = uiContext().theme();
    const c = theme.colors;
    const parent = this.page.content;
    let y = y0;
    switch (e.kind) {
      case 'narration':
      case 'page':
        y += para(scene, parent, box.x0, y, width, e.text, 'body', { italic: true, color: c.inkSoft }).height;
        break;
      case 'quote': {
        const vpx = theme.size('citation') + 2;
        for (const line of e.lines) y += para(scene, parent, box.x0 + 10, y, width - 10, line, 'verse', { px: vpx, color: c.ink }).height;
        parent.add(addText(scene, box.x1, y, e.citation, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
        y += theme.size('citation') + 4;
        break;
      }
      case 'choice': {
        const g = scene.add.graphics();
        parent.add(g);
        const top = y;
        y += 4;
        y += para(scene, parent, box.x0 + 16, y, width - 16, `You chose: ${unquote(e.chosenText)}`, 'citation', { color: c.ink }).height;
        if (e.heading && e.note) y += para(scene, parent, box.x0 + 16, y, width - 16, `${e.heading}: ${e.note}`, 'citation', { italic: true, color: c.rubric }).height;
        g.lineStyle(2, c.rubric, 0.7);
        g.lineBetween(box.x0 + 4, top + 2, box.x0 + 4, y);
        break;
      }
    }
    return y;
  }

  /** Every line, numbered; the reader's lines in gold. Runs of the same colour share one text object. */
  private drawWhole(canto: CantoId, unlocked: boolean, y0: number): number {
    const { scene } = this.ctx;
    const box = this.ctx.right;
    const theme = uiContext().theme();
    const c = theme.colors;
    const parent = this.page.content;
    const script = this.ctx.story.script(canto);
    const n = script?.cantoNumber ?? Number(/\d+$/.exec(canto)?.[0] ?? 0);
    const canticle = script?.canticle ?? 'Inferno';
    const source = this.ctx.story.source(canticle, n);
    if (!unlocked || !source) {
      return y0 + para(scene, parent, box.x0, y0, box.x1 - box.x0, unlocked ? 'The text of this canto is missing.' : 'The whole canto opens on its last page, the colophon.', 'body', { italic: true, color: c.inkSoft }).height;
    }
    const seen = this.ctx.store.state.linesSeen[`${canticle}:${n}`] ?? [];
    const lines = wholeCanto(source, seen);
    const px = Math.max(20, theme.size('citation'));
    const style = textStyle(theme, 'verse', { px, color: c.ink });
    const gold = cssColor(theme.highContrast ? 0x8a6a00 : 0x9a7420);
    const numStyle = textStyle(theme, 'citation', { px: Math.max(20, px - 2), color: theme.extra.inkFaint });
    const lh = lineHeight(px, 'verse');
    const gutter = 46;
    const width = box.x1 - box.x0 - gutter;
    const m = measurer(style);
    let y = y0;
    // Group runs of lines with the same seen-status into one text object per tercet run.
    let i = 0;
    while (i < lines.length) {
      const seenRun = lines[i]?.seen ?? false;
      const texts: string[] = [];
      const nums: string[] = [];
      let rows = 0;
      let j = i;
      while (j < lines.length && (lines[j]?.seen ?? false) === seenRun) {
        const line = lines[j]!;
        if (line.tercetStart && j > i) {
          texts.push('');
          nums.push('');
          rows += 1;
        }
        const segs = wrapVerseLine(line.text, width, m, 24);
        segs.forEach((s, k) => {
          texts.push(k > 0 ? `    ${s.text}` : s.text);
          nums.push(k === 0 && (line.n % 3 === 1 || line.seen) ? String(line.n) : '');
          rows += 1;
        });
        j += 1;
      }
      if (i > 0 && lines[i]?.tercetStart) y += Math.round(lh * 0.5);
      const t = addText(scene, box.x0 + gutter, y, texts.join('\n'), { ...style, color: seenRun ? gold : style.color, lineSpacing: lh - px });
      const num = addText(scene, box.x0 + gutter - 12, y, nums.join('\n'), { ...numStyle, align: 'right', lineSpacing: lh - Math.max(20, px - 2) }).setOrigin(1, 0);
      parent.add([num, t]);
      y += rows * lh;
      i = j;
    }
    return y;
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

/** Verses (bible §1.5): every Longfellow line the reader has seen, in canto and line order. */
export class VersesTab implements BookTabView {
  readonly capturesHorizontal = false;
  private readonly list: ListView;
  private readonly page: ScrollPage;
  private readonly groups: ReturnType<typeof versesSeen>;

  constructor(private readonly ctx: BookCtx) {
    const { scene, root, left, right } = ctx;
    const theme = uiContext().theme();
    root.add(addText(scene, left.x0, left.y0, 'Verses', textStyle(theme, 'heading', { color: theme.colors.rubric })));
    const listBox = { ...left, y0: left.y0 + theme.size('heading') + 18 };
    this.page = new ScrollPage(scene, right, root);
    this.groups = versesSeen(ctx.store.state, (canticle, canto) => ctx.story.source(canticle, canto));
    this.list = new ListView(scene, listBox, root, () => undefined, (i) => this.show(i));
    const rows: ListRow[] = this.groups.map((g) => ({ label: g.heading, aside: `${g.runs.reduce((a, r) => a + r.lines.length, 0)} lines` }));
    if (rows.length === 0) para(scene, root, right.x0, right.y0, right.x1 - right.x0, 'No verse has been read yet.', 'body', { italic: true, color: theme.colors.inkSoft });
    this.list.setRows(rows, Math.max(0, rows.length - 1));
    ctx.footer('▴ ▾ choose · PgUp PgDn read', 'Esc close');
  }

  private show(i: number): void {
    this.page.clear();
    const group = this.groups[i];
    if (!group) return;
    const { scene } = this.ctx;
    const box = this.ctx.right;
    const width = box.x1 - box.x0;
    const theme = uiContext().theme();
    const c = theme.colors;
    const parent = this.page.content;
    let y = box.y0;
    for (const run of group.runs) {
      for (const line of run.lines) {
        y += para(scene, parent, box.x0, y, width, line.text, 'verse', { px: Math.max(20, theme.size('citation') + 2), color: c.ink }).height;
      }
      parent.add(addText(scene, box.x1, y, run.citation, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
      y += theme.size('citation') + 22;
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

