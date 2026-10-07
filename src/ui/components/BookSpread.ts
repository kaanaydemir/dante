/**
 * The open book (bible §1.3–§1.4): two pages over leather boards, with page
 * turns, the opening-page layout, a text page, an illustrated reading flow
 * (page-mode beats such as Canto II's told story), the colophon and the
 * chapter end. Used by BookPageScene.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, TIMINGS } from '../../config';
import type { OpeningPageSpec, QuoteSpec } from '../../runtime/contracts';
import { illuminatedTexture, panelTexture, vignetteTexture, VIGNETTE_SIZE } from '../art/textures';
import { sfx, uiContext } from '../context';
import { addText, destroy, measurer, tweenTo } from '../phaser/helpers';
import { sliceCitation, wrapText } from '../text';
import { lineHeight, mixColor, textStyle } from '../theme';
import { promptRow } from './keycap';
import { renderVerseLines, wordCenter, dimWord, type GlowWord } from './verseLines';
import { keyLabel } from './VerseBubble';

export const SPREAD_W = 1240;
export const SPREAD_H = 690;

/** Content boxes of the two pages (screen coordinates). */
export const PAGE = {
  left: { x0: 88, x1: 604, y0: 70, y1: 632 },
  right: { x0: 676, x1: 1192, y0: 70, y1: 632 },
} as const;

export type PageSide = 'left' | 'right';

/** Engraving ink and paper (config palette ink / paper). */
export const ENGRAVING = { ink: 0x15130f, paper: 0xe6dcc3 } as const;

export class BookSpread {
  readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Image;
  readonly left: Phaser.GameObjects.Container;
  readonly right: Phaser.GameObjects.Container;
  /** Prompts and folios, above the pages. */
  readonly chrome: Phaser.GameObjects.Container;
  private shown = false;
  /** Reading flow cursor (y on the right page). */
  private flowY: number = PAGE.right.y0;
  private flowWords: GlowWord[] = [];
  private turnPrompt: Phaser.GameObjects.Container | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const theme = uiContext().theme();
    const panel = panelTexture(scene, 'spread', SPREAD_W, SPREAD_H, theme);
    this.root = scene.add.container(0, 0).setDepth(DEPTH.page);
    this.bg = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, panel.key);
    this.left = scene.add.container(0, 0);
    this.right = scene.add.container(0, 0);
    this.chrome = scene.add.container(0, 0);
    this.root.add([this.bg, this.left, this.right, this.chrome]);
    this.root.setVisible(false).setAlpha(0);
  }

  get isOpen(): boolean {
    return this.shown;
  }

  async open(animated = true): Promise<void> {
    if (this.shown) return;
    this.shown = true;
    this.root.setVisible(true);
    if (!animated) {
      this.root.setAlpha(1).setScale(1);
      return;
    }
    sfx('page');
    this.root.setAlpha(0);
    this.root.setScale(0.97);
    this.root.setPosition(GAME_WIDTH * 0.015, GAME_HEIGHT * 0.015);
    await tweenTo(this.scene, { targets: this.root, alpha: 1, scale: 1, x: 0, y: 0, duration: 420, ease: 'Cubic.easeOut' });
  }

  async close(animated = true): Promise<void> {
    if (!this.shown) return;
    this.shown = false;
    if (animated) await tweenTo(this.scene, { targets: this.root, alpha: 0, duration: 320, ease: 'Quad.easeIn' });
    this.root.setVisible(false).setAlpha(0);
    this.clear();
  }

  clear(): void {
    this.left.removeAll(true);
    this.right.removeAll(true);
    this.chrome.removeAll(true);
    this.flowY = PAGE.right.y0;
    this.flowWords = [];
    this.turnPrompt = null;
  }

  /** Right page flips over to the left (content cleared at the fold). */
  async turn(): Promise<void> {
    sfx('page');
    const theme = uiContext().theme();
    const pw = GAME_WIDTH / 2 - 46;
    const ph = SPREAD_H - 52;
    const panel = panelTexture(this.scene, 'plate', pw, ph, theme);
    const flip = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, panel.key).setOrigin(0, 0.5).setDepth(DEPTH.page + 5);
    flip.setDisplaySize(pw, ph);
    const full = flip.scaleX;
    const prog = { t: 0 };
    const half = TIMINGS.pageTurnMs / 2;
    const tint = (t: number): number => mixColor(0xffffff, 0x8a7a60, t);
    void tweenTo(this.scene, { targets: [this.right, this.chrome], alpha: 0, duration: half * 0.6 });
    await tweenTo(this.scene, {
      targets: prog,
      t: 1,
      duration: half,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        flip.scaleX = Math.max(0.001, full * (1 - prog.t));
        flip.setTint(tint(prog.t));
      },
    });
    flip.setOrigin(1, 0.5);
    this.left.setAlpha(0);
    prog.t = 0;
    await tweenTo(this.scene, {
      targets: prog,
      t: 1,
      duration: half,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        flip.scaleX = Math.max(0.001, full * prog.t);
        flip.setTint(tint(1 - prog.t));
      },
    });
    destroy(flip);
    this.clear();
    this.left.setAlpha(1);
    this.right.setAlpha(1);
    this.chrome.setAlpha(1);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private text(side: PageSide, x: number, y: number, s: string, style: ReturnType<typeof textStyle>): Phaser.GameObjects.Text {
    const t = addText(this.scene, x, y, s, style);
    (side === 'left' ? this.left : this.right).add(t);
    return t;
  }

  private ornament(side: PageSide, y: number, width = 160): void {
    const theme = uiContext().theme();
    const box = PAGE[side];
    const cx = (box.x0 + box.x1) / 2;
    const g = this.scene.add.graphics();
    g.lineStyle(1, theme.extra.inkFaint, 0.8);
    g.lineBetween(cx - width / 2, y, cx - 8, y);
    g.lineBetween(cx + 8, y, cx + width / 2, y);
    g.fillStyle(theme.colors.rubric, 0.9);
    g.fillTriangle(cx - 5, y, cx, y - 5, cx + 5, y);
    g.fillTriangle(cx - 5, y, cx, y + 5, cx + 5, y);
    (side === 'left' ? this.left : this.right).add(g);
  }

  /** "[E] Turn ▸" (or another label) at the bottom right of the right page. */
  showTurnPrompt(label = 'Turn ▸', delayMs = 0): void {
    destroy(this.turnPrompt);
    const row = promptRow(this.scene, [keyLabel('advance')], label, { onPaper: true, align: 'right', bookFace: true, italic: true });
    row.node.setPosition(PAGE.right.x1, PAGE.right.y1 + 26);
    row.node.setAlpha(0);
    this.chrome.add(row.node);
    this.turnPrompt = row.node;
    this.scene.tweens.add({ targets: row.node, alpha: 1, duration: 400, delay: delayMs });
    this.scene.tweens.add({ targets: row.node, x: row.node.x + 3, duration: 700, yoyo: true, repeat: -1, delay: delayMs + 400, ease: 'Sine.easeInOut' });
  }

  hideTurnPrompt(): void {
    destroy(this.turnPrompt);
    this.turnPrompt = null;
  }

  /** Small running heads at the top of each page. */
  folios(left: string, right: string): void {
    const theme = uiContext().theme();
    const style = textStyle(theme, 'citation', { color: theme.extra.inkFaint, letterSpacing: 3 });
    const l = addText(this.scene, (PAGE.left.x0 + PAGE.left.x1) / 2, PAGE.left.y0 - 34, left, style).setOrigin(0.5, 0);
    const r = addText(this.scene, (PAGE.right.x0 + PAGE.right.x1) / 2, PAGE.right.y0 - 34, right, style).setOrigin(0.5, 0);
    this.chrome.add([l, r]);
  }

  // -------------------------------------------------------------------------
  // Opening page (bible §1.3.1, §1.4)
  // -------------------------------------------------------------------------

  /** Left: INFERNO, illuminated CANTO III, title, vignette. Right: the epigraph (lines appear one by one). */
  layoutOpening(spec: OpeningPageSpec): { vignette: Phaser.GameObjects.Image; epigraph: Phaser.GameObjects.GameObject[][]; words: GlowWord[] } {
    const theme = uiContext().theme();
    const c = theme.colors;
    const x = theme.extra;
    const L = PAGE.left;
    const cx = (L.x0 + L.x1) / 2;
    this.text('left', cx, L.y0 + 20, spec.canticleLabel.split('').join(' '), textStyle(theme, 'citation', { color: c.inkSoft, letterSpacing: 4 })).setOrigin(0.5, 0);
    // Illuminated numeral: a drop-cap box with the C, then "ANTO III".
    const capPx = Math.round(theme.size('title') * 1.05);
    const box = Math.round(capPx * 1.25);
    const label = spec.cantoLabel;
    const restStyle = textStyle(theme, 'title', { px: Math.round(capPx * 0.8), color: c.rubric });
    const rest = label.slice(1);
    const restW = measurer(restStyle)(rest);
    const total = box + 10 + restW;
    const startX = cx - total / 2;
    const y = L.y0 + 74;
    const illum = this.scene.add.image(startX + box / 2, y + box / 2, illuminatedTexture(this.scene, box, 0x23406e, c.gold, 0xf4ecd8));
    this.left.add(illum);
    this.text('left', startX + box / 2, y + box / 2 + 2, label[0] ?? 'C', textStyle(theme, 'title', { px: capPx, color: c.goldBright, shadow: true })).setOrigin(0.5, 0.5);
    this.text('left', startX + box + 10, y + box / 2 + 4, rest, restStyle).setOrigin(0, 0.5);
    const titleY = y + box + 22;
    this.text('left', cx, titleY, spec.canto.title, textStyle(theme, 'heading', { italic: true, color: c.ink })).setOrigin(0.5, 0);
    // Vignette 96×64 ×3
    const vy = titleY + theme.size('heading') + 30;
    const key = vignetteTexture(this.scene, spec.vignette, spec.canto.id, ENGRAVING.ink, ENGRAVING.paper);
    const scale = Math.min(3, (L.y1 - vy - 10) / VIGNETTE_SIZE.h);
    const frame = this.scene.add.rectangle(cx, vy + (VIGNETTE_SIZE.h * scale) / 2, VIGNETTE_SIZE.w * scale + 12, VIGNETTE_SIZE.h * scale + 12, x.pageShade, 1);
    frame.setStrokeStyle(1, x.inkFaint, 0.9);
    const vignette = this.scene.add.image(cx, vy + (VIGNETTE_SIZE.h * scale) / 2, key);
    vignette.setScale(scale);
    this.left.add([frame, vignette]);
    // Epigraph on the right page, vertically centred.
    const R = PAGE.right;
    const words: GlowWord[] = [];
    let epigraph: Phaser.GameObjects.GameObject[][] = [];
    if (spec.epigraph) {
      const q = spec.epigraph;
      // As large as fits without turning a line over (never below 20 px).
      let vpx = Math.round(theme.size('verse') * 1.08);
      let style = textStyle(theme, 'verse', { px: vpx, color: c.ink });
      while (vpx > 20 && Math.max(...q.lines.map((l) => measurer(style)(l))) > R.x1 - R.x0) {
        vpx -= 1;
        style = textStyle(theme, 'verse', { px: vpx, color: c.ink });
      }
      const lh = lineHeight(vpx, 'verse');
      const height = q.lines.length * lh + 60;
      const top = Math.round((R.y0 + R.y1) / 2 - height / 2) - 20;
      const widest = Math.max(...q.lines.map((l) => measurer(style)(l)));
      const lx = Math.max(R.x0, Math.round((R.x0 + R.x1) / 2 - widest / 2));
      const rendered = renderVerseLines(this.scene, this.right, q.lines, {
        x: lx,
        y: top,
        maxWidth: R.x1 - lx,
        style,
        px: vpx,
        collectible: q.collectible,
        startHidden: true,
        onPaper: true,
      });
      epigraph = rendered.nodes;
      words.push(...rendered.words);
      this.text('right', Math.min(R.x1, lx + Math.max(widest, 200)), top + rendered.height + 14, q.citationText, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0);
    }
    this.flowWords = words;
    return { vignette, epigraph, words };
  }

  // -------------------------------------------------------------------------
  // Text page (PAGE line)
  // -------------------------------------------------------------------------

  layoutTextPage(text: string, cantoId: string, cantoLabel: string, title: string): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const L = PAGE.left;
    const R = PAGE.right;
    const cx = (L.x0 + L.x1) / 2;
    this.text('left', cx, L.y0 + 24, cantoLabel, textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 4 })).setOrigin(0.5, 0);
    this.text('left', cx, L.y0 + 56, title, textStyle(theme, 'body', { italic: true, color: c.inkSoft })).setOrigin(0.5, 0);
    const key = vignetteTexture(this.scene, `vignette-${cantoId}`, cantoId, ENGRAVING.ink, ENGRAVING.paper);
    const img = this.scene.add.image(cx, (L.y0 + L.y1) / 2 + 30, key).setScale(3);
    img.setAlpha(0.92);
    this.left.add(img);
    // Text with a drop cap
    const px = theme.size('pageText');
    const style = textStyle(theme, 'pageText', { color: c.ink });
    const lh = lineHeight(px);
    const width = R.x1 - R.x0;
    const first = text.trimStart()[0] ?? '';
    const restText = text.trimStart().slice(1);
    const capPx = Math.round(px * 2.6);
    const capStyle = textStyle(theme, 'title', { px: capPx, color: c.rubric });
    const capW = measurer(capStyle)(first) + 10;
    const m = measurer(style);
    // First two lines are indented around the cap.
    const lines: { text: string; indent: number }[] = [];
    let remaining = restText;
    for (let i = 0; i < 2 && remaining.length > 0; i++) {
      const w = wrapText(remaining, width - capW, m);
      const head = w[0] ?? '';
      lines.push({ text: head, indent: capW });
      remaining = remaining.slice(remaining.indexOf(head) + head.length).trimStart();
    }
    for (const l of remaining ? wrapText(remaining, width, m) : []) lines.push({ text: l, indent: 0 });
    const total = lines.length * lh;
    const top = Math.round((R.y0 + R.y1) / 2 - total / 2) - 10;
    this.text('right', R.x0 - 2, top - capPx * 0.18, first, capStyle);
    lines.forEach((l, i) => this.text('right', R.x0 + l.indent, top + i * lh, l.text, style));
  }

  // -------------------------------------------------------------------------
  // Reading flow (page-mode beats)
  // -------------------------------------------------------------------------

  /** Left page illustration for a reading page: a figure of light for Beatrice and Lucia, else the canto's vignette. */
  illustrate(cantoId: string, voice: string | null): void {
    if (this.left.length > 0) return;
    const L = PAGE.left;
    const cx = (L.x0 + L.x1) / 2;
    const cy = (L.y0 + L.y1) / 2 - 10;
    const theme = uiContext().theme();
    const light = voice === 'BEATRICE' || voice === 'LUCIA';
    const w = VIGNETTE_SIZE.w * 3;
    const h = VIGNETTE_SIZE.h * 3;
    const frame = this.scene.add.rectangle(cx, cy, w + 14, h + 14, theme.extra.pageShade, 1);
    frame.setStrokeStyle(1, theme.extra.inkFaint, 0.9);
    this.left.add(frame);
    let art: Phaser.GameObjects.GameObject;
    if (light) {
      art = this.glory(cx, cy, w, h, voice === 'LUCIA');
    } else {
      const key = vignetteTexture(this.scene, `vignette-${cantoId}`, cantoId, ENGRAVING.ink, ENGRAVING.paper);
      art = this.scene.add.image(cx, cy, key).setScale(3);
    }
    this.left.add(art);
    (art as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    this.scene.tweens.add({ targets: art, alpha: 1, duration: 500 });
  }

  /**
   * An engraved glory (Doré's light): horizontal ink lines that thin out
   * toward a bright centre, rays, and the faint shape of a figure.
   */
  private glory(cx: number, cy: number, w: number, h: number, running: boolean): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const ink = ENGRAVING.ink;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    g.fillStyle(ENGRAVING.paper, 1);
    g.fillRect(x0, y0, w, h);
    // Engraved dark: horizontal lines, heavier far from the light.
    for (let y = y0 + 2; y < y0 + h; y += 3) {
      const dy = (y - cy) / (h / 2);
      for (let x = x0; x < x0 + w; x += 2) {
        const dx = (x - cx) / (w / 2);
        const d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.3);
        if (d < 0.42) continue;
        const weight = Math.min(2.2, (d - 0.42) * 2.6);
        g.fillStyle(ink, Math.min(1, 0.25 + (d - 0.42) * 1.4));
        g.fillRect(x, y, 2, weight);
      }
    }
    // Rays
    g.lineStyle(1, ink, 0.35);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.lineBetween(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * h * 0.22, cx + Math.cos(a) * w * 0.5, cy + Math.sin(a) * h * 0.5);
    }
    // The figure: a pale robe, outlined.
    g.lineStyle(1.5, ink, 0.55);
    const lean = running ? 14 : 0;
    g.beginPath();
    g.moveTo(cx - 4 + lean, cy - 34);
    g.lineTo(cx + 18, cy + 40);
    g.lineTo(cx - 18, cy + 40);
    g.closePath();
    g.strokePath();
    g.strokeCircle(cx + lean, cy - 42, 8);
    g.lineStyle(2, ink, 0.9);
    g.strokeRect(x0, y0, w, h);
    return g;
  }

  /** Remaining height on the right page. */
  spaceLeft(): number {
    return PAGE.right.y1 - this.flowY;
  }

  /** Height a prose block would take. */
  measureProse(text: string): number {
    const theme = uiContext().theme();
    const style = textStyle(theme, 'narration', { italic: true, color: theme.colors.inkSoft });
    return wrapText(text, PAGE.right.x1 - PAGE.right.x0, measurer(style)).length * lineHeight(theme.size('narration')) + 18;
  }

  appendProse(text: string): Phaser.GameObjects.Text {
    const theme = uiContext().theme();
    const style = textStyle(theme, 'narration', { italic: true, color: theme.colors.inkSoft });
    const lh = lineHeight(theme.size('narration'));
    const lines = wrapText(text, PAGE.right.x1 - PAGE.right.x0, measurer(style));
    const t = this.text('right', PAGE.right.x0, this.flowY, lines.join('\n'), { ...style, lineSpacing: lh - theme.size('narration') });
    t.setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, duration: 400 });
    this.flowY += lines.length * lh + 18;
    return t;
  }

  measureSpeech(text: string): number {
    const theme = uiContext().theme();
    const style = textStyle(theme, 'body', { color: theme.colors.ink });
    return wrapText(text, PAGE.right.x1 - PAGE.right.x0 - 20, measurer(style)).length * lineHeight(theme.size('body')) + theme.size('citation') + 24;
  }

  appendSpeech(name: string, text: string): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const style = textStyle(theme, 'body', { color: c.ink });
    const lh = lineHeight(theme.size('body'));
    this.text('right', PAGE.right.x0, this.flowY, name.toUpperCase(), textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 2 }));
    this.flowY += theme.size('citation') + 8;
    const lines = wrapText(text, PAGE.right.x1 - PAGE.right.x0 - 20, measurer(style));
    const t = this.text('right', PAGE.right.x0 + 20, this.flowY, lines.join('\n'), { ...style, lineSpacing: lh - theme.size('body') });
    t.setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, duration: 300 });
    this.flowY += lines.length * lh + 16;
  }

  measureVerse(spec: QuoteSpec): number {
    const theme = uiContext().theme();
    const vpx = theme.size('verse');
    return spec.lines.length * lineHeight(vpx, 'verse') + theme.size('citation') + 40;
  }

  /** Append a quote to the right page; lines start hidden (the caller reveals them). */
  appendVerse(spec: QuoteSpec, taken: ReadonlySet<string>): { lines: Phaser.GameObjects.GameObject[][]; words: GlowWord[] } {
    const theme = uiContext().theme();
    const c = theme.colors;
    const vpx = theme.size('verse');
    const style = textStyle(theme, 'verse', { color: c.ink });
    this.text('right', PAGE.right.x0, this.flowY, spec.speakerName.toUpperCase(), textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 2 }));
    this.flowY += theme.size('citation') + 8;
    const rendered = renderVerseLines(this.scene, this.right, spec.lines, {
      x: PAGE.right.x0,
      y: this.flowY,
      maxWidth: PAGE.right.x1 - PAGE.right.x0,
      style,
      px: vpx,
      collectible: spec.collectible,
      taken,
      startHidden: true,
      onPaper: true,
    });
    this.flowY += rendered.height + 2;
    const cite = sliceCitation(spec.citation, spec.citationText, spec.lineNumbers, 0, spec.lines.length);
    this.text('right', PAGE.right.x1, this.flowY, cite, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0);
    this.flowY += theme.size('citation') + 22;
    this.flowWords.push(...rendered.words);
    return { lines: rendered.nodes, words: rendered.words };
  }

  wordAnchor(word: string): { x: number; y: number } | null {
    const w = this.flowWords.find((x) => x.word === word);
    return w ? wordCenter(w) : null;
  }

  dim(word: string): void {
    const w = this.flowWords.find((x) => x.word === word);
    if (w) dimWord(this.scene, w);
  }

  // -------------------------------------------------------------------------
  // Missing canto
  // -------------------------------------------------------------------------

  layoutMissing(cantoLabel: string, title: string | null, message: string): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const L = PAGE.left;
    const R = PAGE.right;
    const cx = (L.x0 + L.x1) / 2;
    this.text('left', cx, L.y0 + 30, 'I N F E R N O', textStyle(theme, 'citation', { color: c.inkSoft, letterSpacing: 2 })).setOrigin(0.5, 0);
    this.text('left', cx, L.y0 + 110, cantoLabel, textStyle(theme, 'title', { px: Math.round(theme.size('title') * 0.8), color: c.rubric })).setOrigin(0.5, 0);
    if (title) this.text('left', cx, L.y0 + 200, title, textStyle(theme, 'heading', { italic: true, color: c.ink })).setOrigin(0.5, 0);
    this.ornament('left', L.y0 + 280);
    const rx = (R.x0 + R.x1) / 2;
    this.text('right', rx, (R.y0 + R.y1) / 2 - 40, message, textStyle(theme, 'pageText', { italic: true, color: c.inkSoft, align: 'center', wrap: R.x1 - R.x0 })).setOrigin(0.5, 0.5);
    // A few empty ruled lines: a page waiting for its words.
    const g = this.scene.add.graphics();
    g.lineStyle(1, theme.extra.inkFaint, 0.35);
    for (let i = 0; i < 6; i++) {
      const y = (R.y0 + R.y1) / 2 + 30 + i * 34;
      g.lineBetween(R.x0 + 30, y, R.x1 - 30, y);
    }
    this.right.add(g);
  }
}
