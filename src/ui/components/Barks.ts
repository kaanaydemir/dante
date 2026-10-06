/**
 * Barks (bible §2.5): ambient lines that never stop play, shown near the
 * speaker when the world can tell where the speaker stands, else in a quiet
 * lane under the narration strip. Plus tutorial prompts (non-blocking).
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, TIMINGS } from '../../config';
import { uiContext } from '../context';
import { addText, destroy } from '../phaser/helpers';
import { textStyle } from '../theme';
import { promptRow } from './keycap';

const LANE_Y = 214;

interface Bark {
  readonly root: Phaser.GameObjects.Container;
  readonly anchored: boolean;
}

export class Barks {
  private lane: Bark[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.prompt,
  ) {}

  show(name: string, text: string, anchor: { x: number; y: number } | null): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const root = this.scene.add.container(0, 0).setDepth(this.depth);
    const body = addText(this.scene, 0, 0, text, textStyle(theme, 'body', { italic: true, color: c.paper, shadow: true }));
    body.setOrigin(0.5, 1);
    const label = addText(this.scene, 0, -body.height - 2, name, textStyle(theme, 'citation', { color: c.goldBright, shadow: true, letterSpacing: 1 }));
    label.setOrigin(0.5, 1);
    const w = Math.max(body.width, label.width) + 28;
    const h = body.height + label.height + 14;
    const bg = this.scene.add.rectangle(0, 6, w, h, 0x000000, 0.45).setOrigin(0.5, 1);
    root.add([bg, label, body]);
    let x = GAME_WIDTH / 2;
    let y = LANE_Y;
    if (anchor) {
      x = Math.max(w / 2 + 10, Math.min(GAME_WIDTH - w / 2 - 10, anchor.x));
      y = Math.max(h + 10, Math.min(GAME_HEIGHT - 200, anchor.y));
    } else {
      // Stack in the lane: newer ones push older ones up.
      for (const b of this.lane) this.scene.tweens.add({ targets: b.root, y: b.root.y - h - 6, duration: 160 });
    }
    root.setPosition(x, y);
    const bark: Bark = { root, anchored: anchor !== null };
    if (!anchor) this.lane.push(bark);
    root.setAlpha(0);
    this.scene.tweens.add({ targets: root, alpha: 1, y: y - 6, duration: 220 });
    const life = TIMINGS.barkMs + text.length * 30;
    this.scene.time.delayedCall(life, () => {
      this.scene.tweens.add({
        targets: root,
        alpha: 0,
        duration: 380,
        onComplete: () => {
          this.lane = this.lane.filter((b) => b !== bark);
          destroy(root);
        },
      });
    });
  }

  clear(): void {
    for (const b of this.lane) destroy(b.root);
    this.lane = [];
  }
}

/** A tutorial prompt at the bottom centre: keycaps and a short line (non-blocking). */
export class TutorialPrompt {
  private root: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.prompt,
  ) {}

  show(keys: readonly string[], text: string, ms: number = TIMINGS.tutorialMs): void {
    this.clear();
    const row = promptRow(this.scene, keys, text, { align: 'center' });
    const bg = this.scene.add.rectangle(0, 0, row.width + 40, 46, 0x000000, 0.55).setOrigin(0.5, 0.5);
    bg.setStrokeStyle(1, uiContext().theme().colors.gold, 0.5);
    const root = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 150, [bg, row.node]).setDepth(this.depth);
    root.setAlpha(0);
    this.root = root;
    this.scene.tweens.add({ targets: root, alpha: 1, duration: 260 });
    this.timer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  /** Move up/down to stay clear of a balloon at the bottom. */
  setBottom(y: number): void {
    if (this.root) this.scene.tweens.add({ targets: this.root, y: y - 34, duration: 160 });
  }

  hide(): void {
    const root = this.root;
    this.root = null;
    this.timer?.remove(false);
    this.timer = null;
    if (!root) return;
    this.scene.tweens.add({ targets: root, alpha: 0, duration: 300, onComplete: () => destroy(root) });
  }

  clear(): void {
    this.timer?.remove(false);
    this.timer = null;
    destroy(this.root);
    this.root = null;
  }
}
