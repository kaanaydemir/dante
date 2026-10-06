/**
 * "What Dante did" / "As Dante did" (bible §1.3.6, §2.11): a card slides in
 * from the margin with the canonical Longfellow lines, their citation and a
 * plain note of at most two short sentences. Closed with E; a glowing word on
 * the card (Pity at the Canto V colophon) is taken first.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../../config';
import type { RevealCard } from '../../runtime/contracts';
import { panelTexture } from '../art/textures';
import { uiContext } from '../context';
import { addText, destroy, measurer, tweenTo } from '../phaser/helpers';
import { unquote, wrapText } from '../text';
import { lineHeight, textStyle } from '../theme';
import { promptRow } from './keycap';
import { measureVerseLines, renderVerseLines, wordCenter, dimWord, type GlowWord } from './verseLines';
import { keyLabel } from './VerseBubble';

const MIN_W = 540;
const MAX_W = 780;
const PAD = 40;
const RIGHT = GAME_WIDTH - 24;

export class RevealCardView {
  private root: Phaser.GameObjects.Container | null = null;
  private words: GlowWord[] = [];
  private takePrompt: Phaser.GameObjects.Container | null = null;
  private closePrompt: Phaser.GameObjects.Container | null = null;
  private readonly takenHere = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.card,
  ) {}

  get visible(): boolean {
    return this.root !== null;
  }

  /** Words still glowing on the card. */
  get pendingWords(): string[] {
    return this.words.filter((w) => !this.takenHere.has(w.word)).map((w) => w.word);
  }

  wordAnchor(word: string): { x: number; y: number } | null {
    const w = this.words.find((x) => x.word === word);
    return w ? wordCenter(w) : null;
  }

  show(card: RevealCard, opts: { taken?: ReadonlySet<string>; centerX?: number } = {}): void {
    this.clear();
    const theme = uiContext().theme();
    const c = theme.colors;
    const x = theme.extra;
    const verseStyle = textStyle(theme, 'verse', { color: c.verseText });
    const noteStyle = textStyle(theme, 'body', { color: x.cardText });
    const kickerStyle = textStyle(theme, 'citation', { color: x.verseSoft, letterSpacing: 2 });
    const as = card.heading === 'As Dante did';
    const headStyle = textStyle(theme, 'heading', { color: as ? c.goldBright : 0xd9826e });
    const chosenStyle = textStyle(theme, 'citation', { italic: true, color: x.dim });
    const citeStyle = textStyle(theme, 'citation', { italic: true, color: x.verseSoft });
    const vpx = theme.size('verse');
    // Width from the longest verse line.
    const allLines = card.quotes.flatMap((q) => [...q.lines]);
    const vm = measureVerseLines(allLines, { maxWidth: MAX_W - PAD * 2, style: verseStyle, px: vpx });
    const w = Math.max(MIN_W, Math.min(MAX_W, Math.ceil(vm.width) + PAD * 2 + 10));
    const inner = w - PAD * 2;
    const noteLines = wrapText(card.note, inner, measurer(noteStyle));
    const chosen = `You: ${unquote(card.chosenText)}`;
    const chosenLines = wrapText(chosen, inner, measurer(chosenStyle));
    const nlh = lineHeight(theme.size('body'));
    const clh = lineHeight(theme.size('citation'));
    let h = PAD + clh + theme.size('heading') + 14 + chosenLines.length * clh + 18;
    for (const q of card.quotes) {
      h += measureVerseLines(q.lines, { maxWidth: inner, style: verseStyle, px: vpx }).height + clh + 10;
    }
    h += 22 + noteLines.length * nlh + 50 + PAD;
    const panel = panelTexture(this.scene, 'card', w, h, theme);
    const top = Math.max(70, Math.round(GAME_HEIGHT / 2 - panel.h / 2));
    const cx = opts.centerX ?? RIGHT - panel.w / 2;
    const root = this.scene.add.container(cx, top).setDepth(this.depth);
    root.add(this.scene.add.image(0, 0, panel.key).setOrigin(0.5, 0));
    const left = -panel.w / 2 + PAD;
    let y = PAD - 6;
    const kicker = addText(this.scene, left, y, card.recordTitle.toUpperCase(), kickerStyle);
    root.add(kicker);
    y += clh + 2;
    const head = addText(this.scene, left, y, card.heading, headStyle);
    root.add(head);
    y += theme.size('heading') + 10;
    const ch = addText(this.scene, left, y, chosenLines.join('\n'), { ...chosenStyle, lineSpacing: clh - theme.size('citation') });
    root.add(ch);
    y += chosenLines.length * clh + 14;
    this.words = [];
    for (const q of card.quotes) {
      const rendered = renderVerseLines(this.scene, root, q.lines, {
        x: left,
        y,
        maxWidth: inner,
        style: verseStyle,
        px: vpx,
        collectible: q.collectible,
        ...(opts.taken ? { taken: opts.taken } : {}),
      });
      this.words.push(...rendered.words);
      y += rendered.height + 2;
      const cite = addText(this.scene, panel.w / 2 - PAD, y, q.citationText, citeStyle).setOrigin(1, 0);
      root.add(cite);
      y += clh + 10;
    }
    const rule = this.scene.add.graphics();
    rule.lineStyle(1, x.rule, 0.6);
    rule.lineBetween(left, y + 4, panel.w / 2 - PAD, y + 4);
    root.add(rule);
    y += 18;
    const note = addText(this.scene, left, y, noteLines.join('\n'), { ...noteStyle, lineSpacing: nlh - theme.size('body') });
    root.add(note);
    const footY = panel.h - PAD + 2;
    if (this.words.length > 0) {
      const take = promptRow(this.scene, [keyLabel('interact')], 'Take the word', { color: x.glow, bookFace: true, italic: true });
      take.node.setPosition(left, footY);
      root.add(take.node);
      this.takePrompt = take.node;
    }
    const close = promptRow(this.scene, [keyLabel('advance')], '', { align: 'right' });
    close.node.setPosition(panel.w / 2 - PAD + 6, footY);
    close.node.setAlpha(this.words.length > 0 ? 0 : 1);
    root.add(close.node);
    this.closePrompt = close.node;
    this.root = root;
    root.setAlpha(0);
    root.x = cx + 60;
    this.scene.tweens.add({ targets: root, alpha: 1, x: cx, duration: 360, ease: 'Cubic.easeOut' });
  }

  /** The word leaves the card (its flight starts from wordAnchor). */
  markTaken(word: string): void {
    const w = this.words.find((x) => x.word === word);
    if (w) dimWord(this.scene, w);
    this.takenHere.add(word);
    if (this.pendingWords.length === 0) {
      if (this.takePrompt) this.scene.tweens.add({ targets: this.takePrompt, alpha: 0, duration: 200 });
      if (this.closePrompt) this.scene.tweens.add({ targets: this.closePrompt, alpha: 1, duration: 200, delay: 150 });
    }
  }

  async hide(fast = false): Promise<void> {
    const root = this.root;
    this.detach();
    if (!root) return;
    if (fast) {
      destroy(root);
      return;
    }
    await tweenTo(this.scene, { targets: root, alpha: 0, x: root.x + 40, duration: 220, ease: 'Cubic.easeIn' });
    destroy(root);
  }

  clear(): void {
    const root = this.root;
    this.detach();
    destroy(root);
  }

  private detach(): void {
    this.root = null;
    this.words = [];
    this.takenHere.clear();
    this.takePrompt = null;
    this.closePrompt = null;
  }
}
