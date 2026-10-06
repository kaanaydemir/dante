/**
 * The book's voice as a parchment strip at the top of the screen (bible §1.2,
 * §1.3.3): at most two sentences, third person, past tense. Blocking strips
 * wait for the reader; non-blocking ones show a thin reading-time thread and
 * leave by themselves.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_WIDTH } from '../../config';
import { panelTexture } from '../art/textures';
import { uiContext } from '../context';
import { addText, destroy, measurer, tweenTo } from '../phaser/helpers';
import { balancedWrap } from '../text';
import { lineHeight, textStyle } from '../theme';
import { promptRow } from './keycap';

export const STRIP_TOP = 86;
const MAX_W = 860;
const MIN_W = 420;
const PAD_X = 36;
const PAD_Y = 20;

export class NarrationStrip {
  private root: Phaser.GameObjects.Container | null = null;
  private thread: Phaser.GameObjects.Rectangle | null = null;
  private more: Phaser.GameObjects.Container | null = null;
  private height = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.strip,
  ) {}

  get visible(): boolean {
    return this.root !== null;
  }

  get bottom(): number {
    return this.root ? STRIP_TOP + this.height : STRIP_TOP;
  }

  show(text: string, blocking: boolean): void {
    this.clear();
    const theme = uiContext().theme();
    const style = textStyle(theme, 'narration', { color: theme.extra.stripText, align: 'center' });
    const measure = measurer(style);
    const lines = balancedWrap(text, MAX_W - PAD_X * 2, measure);
    const widest = Math.max(...lines.map((l) => measure(l)));
    const lh = lineHeight(theme.size('narration'));
    const w = Math.max(MIN_W, Math.min(MAX_W, Math.ceil(widest) + PAD_X * 2));
    const h = lines.length * lh + PAD_Y * 2 + 6;
    this.height = h;
    const panel = panelTexture(this.scene, 'strip', w, h, theme);
    const root = this.scene.add.container(GAME_WIDTH / 2, STRIP_TOP).setDepth(this.depth);
    const bg = this.scene.add.image(0, 0, panel.key).setOrigin(0.5, 0);
    bg.setDisplaySize(panel.w, panel.h);
    const body = addText(this.scene, 0, PAD_Y + 2, lines.join('\n'), { ...style, lineSpacing: lh - theme.size('narration') });
    body.setOrigin(0.5, 0);
    root.add([bg, body]);
    if (blocking) {
      const more = promptRow(this.scene, [], '▸', { onPaper: true, color: theme.colors.rubric, bookFace: true });
      more.node.setPosition(w / 2 - 26, h - 22);
      more.node.setAlpha(0);
      root.add(more.node);
      this.more = more.node;
      this.scene.tweens.add({ targets: more.node, alpha: 1, delay: 450, duration: 300 });
      this.scene.tweens.add({ targets: more.node, x: more.node.x + 4, yoyo: true, repeat: -1, duration: 650, delay: 750, ease: 'Sine.easeInOut' });
    } else {
      const thread = this.scene.add.rectangle(-w / 2 + 24, h - 14, w - 48, 2, theme.colors.inkSoft, 0.35).setOrigin(0, 0.5);
      root.add(thread);
      this.thread = thread;
    }
    root.setAlpha(0);
    root.y = STRIP_TOP - 10;
    this.root = root;
    this.scene.tweens.add({ targets: root, alpha: 1, y: STRIP_TOP, duration: 220, ease: 'Quad.easeOut' });
  }

  /** Non-blocking strips: the thread shrinks over the reading time. */
  runThread(ms: number): void {
    const t = this.thread;
    if (!t) return;
    this.scene.tweens.add({ targets: t, scaleX: 0, duration: Math.max(100, ms), ease: 'Linear' });
  }

  async hide(fast = false): Promise<void> {
    const root = this.root;
    this.root = null;
    this.thread = null;
    this.more = null;
    if (!root) return;
    if (fast) {
      destroy(root);
      return;
    }
    await tweenTo(this.scene, { targets: root, alpha: 0, y: STRIP_TOP - 8, duration: 160, ease: 'Quad.easeIn' });
    destroy(root);
  }

  clear(): void {
    const root = this.root;
    this.root = null;
    this.thread = null;
    this.more = null;
    if (root) destroy(root);
  }
}

