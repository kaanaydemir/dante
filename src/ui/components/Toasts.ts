/**
 * Quiet notices under the HUD (codex pages, unlocks, memories): a small
 * parchment note with an icon, a title and one line; they stack and fade.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, TIMINGS } from '../../config';
import { iconTexture, panelTexture } from '../art/textures';
import type { IconName } from '../art/icons';
import { uiContext } from '../context';
import { addText, destroy, measurer } from '../phaser/helpers';
import { wrapText } from '../text';
import { lineHeight, textStyle } from '../theme';

const LEFT = 20;
const TOP = 104;
const WIDTH = 380;
const MAX = 3;

interface Toast {
  readonly root: Phaser.GameObjects.Container;
  readonly h: number;
  timer: Phaser.Time.TimerEvent | null;
}

export class Toasts {
  private items: Toast[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.toast,
    private readonly origin: { x: number; y: number } = { x: LEFT, y: TOP },
  ) {}

  push(title: string, body: string, icon: IconName = 'page', ms: number = TIMINGS.toastMs): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const titleStyle = textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 1 });
    const bodyStyle = textStyle(theme, 'citation', { color: c.ink });
    const inner = WIDTH - 86;
    const lines = body ? wrapText(body, inner, measurer(bodyStyle)) : [];
    const clh = lineHeight(theme.size('citation'));
    const h = 22 + clh + lines.length * clh + 18;
    const panel = panelTexture(this.scene, 'note', WIDTH, h, theme);
    const root = this.scene.add.container(this.origin.x, this.origin.y).setDepth(this.depth);
    root.add(this.scene.add.image(0, 0, panel.key).setOrigin(0, 0));
    root.add(this.scene.add.image(36, panel.h / 2, iconTexture(this.scene, icon, c.rubric, c.ink, 36)));
    root.add(addText(this.scene, 64, 16, title, titleStyle));
    if (lines.length > 0) root.add(addText(this.scene, 64, 16 + clh, lines.join('\n'), { ...bodyStyle, lineSpacing: clh - theme.size('citation') }));
    const toast: Toast = { root, h: panel.h, timer: null };
    this.items.unshift(toast);
    while (this.items.length > MAX) {
      const old = this.items.pop();
      if (old) this.drop(old, true);
    }
    this.layout();
    root.setAlpha(0);
    root.x = this.origin.x - 30;
    this.scene.tweens.add({ targets: root, alpha: 1, x: this.origin.x, duration: 260, ease: 'Cubic.easeOut' });
    toast.timer = this.scene.time.delayedCall(ms, () => this.drop(toast, false));
  }

  private layout(): void {
    let y = this.origin.y;
    for (const t of this.items) {
      this.scene.tweens.add({ targets: t.root, y, duration: 200 });
      y += t.h + 6;
    }
  }

  private drop(t: Toast, fast: boolean): void {
    this.items = this.items.filter((x) => x !== t);
    t.timer?.remove(false);
    if (fast) {
      destroy(t.root);
    } else {
      this.scene.tweens.add({
        targets: t.root,
        alpha: 0,
        duration: 400,
        onComplete: () => destroy(t.root),
      });
      this.layout();
    }
  }

  clear(): void {
    for (const t of [...this.items]) this.drop(t, true);
    this.items = [];
  }
}
