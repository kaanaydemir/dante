/**
 * The margin note opened with Q (bible §1.3.4, GDD 2.5): Virgil's hint (full
 * the first time, short after), the plain GLOSS of the verse on screen, or an
 * empty margin when Virgil is silent.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_WIDTH } from '../../config';
import { panelTexture, portraitTexture } from '../art/textures';
import { uiContext } from '../context';
import { addText, delay, destroy, measurer, tweenTo } from '../phaser/helpers';
import { balancedWrap, readingMs } from '../text';
import { cssColor, lineHeight, textStyle } from '../theme';

const WIDTH = 400;
const RIGHT = GAME_WIDTH - 16;
const LEFT = 20;
const TOP = 100;
const PAD = 28;

export type HintKind = 'hint' | 'gloss' | 'silent';

export class HintPanel {
  private root: Phaser.GameObjects.Container | null = null;
  private kind: HintKind | null = null;
  private token = 0;
  private closed: (() => void) | null = null;
  /** Lowest y the note may start at (the narration strip's bottom while one is up). */
  private floor: () => number = () => 0;
  /** Where the note slides out to (the edge it came from). */
  private offX: number = GAME_WIDTH;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.margin + 10,
  ) {}

  get open(): HintKind | null {
    return this.root ? this.kind : null;
  }

  /** Keep clear of something else at the top of the screen (the narration strip). */
  avoid(bottom: () => number): void {
    this.floor = bottom;
  }

  /** Show a note; resolves when it closes (by itself after a reading time, or with close()). */
  /**
   * `side: 'left'` when the right margin is taken (an open choice, a card): the note
   * then comes in from the left edge instead.
   */
  show(kind: HintKind, text: string, opts: { title?: string; speaker?: string; top?: number; side?: 'left' | 'right' } = {}): Promise<void> {
    this.clear();
    const theme = uiContext().theme();
    const c = theme.colors;
    const token = ++this.token;
    this.kind = kind;
    const titleStyle = textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 2 });
    const bodyStyle = textStyle(theme, 'body', { color: c.ink, italic: kind === 'gloss' });
    // Virgil, or Virgil silent (no hint here: the poem is silent too) — his face and an ellipsis, no words.
    const portrait = kind === 'hint' || kind === 'silent' ? 56 : 0;
    const inner = WIDTH - PAD * 2 - (portrait ? portrait + 14 : 0);
    const shown = kind === 'silent' ? '…' : text;
    const lines = balancedWrap(shown, inner, measurer(bodyStyle));
    const blh = lineHeight(theme.size('body'));
    const h = Math.max(PAD + theme.size('citation') + 12 + lines.length * blh + PAD, portrait ? portrait + PAD * 2 : 0);
    const panel = panelTexture(this.scene, 'margin', WIDTH, h, theme);
    let floor = 0;
    try {
      floor = this.floor();
    } catch {
      floor = 0;
    }
    const leftSide = opts.side === 'left';
    const restX = leftSide ? LEFT : RIGHT - panel.w;
    const offX = leftSide ? -panel.w - 10 : GAME_WIDTH;
    this.offX = offX;
    const root = this.scene.add.container(restX, Math.max(opts.top ?? TOP, floor > 0 ? floor + 10 : 0)).setDepth(this.depth);
    root.add(this.scene.add.image(0, 0, panel.key).setOrigin(0, 0));
    let x = PAD;
    if (portrait) {
      const img = this.scene.add.image(PAD + portrait / 2, PAD + portrait / 2 - 2, portraitTexture(this.scene, opts.speaker ?? 'VIRGIL', null));
      img.setDisplaySize(portrait, portrait);
      root.add(img);
      x += portrait + 14;
    }
    const title = opts.title ?? (kind === 'gloss' ? 'IN THE MARGIN' : 'VIRGIL');
    root.add(addText(this.scene, x, PAD - 6, title, titleStyle));
    root.add(
      addText(this.scene, x, PAD + theme.size('citation') + 6, lines.join('\n'), {
        ...bodyStyle,
        ...(kind === 'silent' ? { color: cssColor(c.inkSoft) } : {}),
        lineSpacing: blh - theme.size('body'),
      }),
    );
    this.root = root;
    root.setAlpha(0);
    root.x = offX;
    this.scene.tweens.add({ targets: root, alpha: 1, x: restX, duration: 280, ease: 'Cubic.easeOut' });
    const life = kind === 'silent' ? 1600 : Math.round(readingMs(text) * 1.4);
    return new Promise<void>((resolve) => {
      this.closed = resolve;
      void delay(this.scene, life).then(() => {
        if (token === this.token) void this.close();
      });
    });
  }

  async close(): Promise<void> {
    const root = this.root;
    const done = this.closed;
    this.root = null;
    this.kind = null;
    this.closed = null;
    if (root) {
      await tweenTo(this.scene, { targets: root, alpha: 0, x: this.offX, duration: 220, ease: 'Cubic.easeIn' });
      destroy(root);
    }
    done?.();
  }

  clear(): void {
    const root = this.root;
    const done = this.closed;
    this.root = null;
    this.kind = null;
    this.closed = null;
    this.token++;
    destroy(root);
    done?.();
  }
}
