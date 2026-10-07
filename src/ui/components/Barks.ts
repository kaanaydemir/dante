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
import { addText, destroy, measurer } from '../phaser/helpers';
import { wrapText } from '../text';
import { lineHeight, textStyle } from '../theme';
import { promptRow } from './keycap';

/** Bottom of the bark lane: under the narration strip, above Dante's head (the camera keeps him near the centre). */
const LANE_Y = 296;
/** Barks kept in the lane at once (the oldest leaves first). */
const LANE_MAX = 2;

interface Bark {
  readonly root: Phaser.GameObjects.Container;
  readonly anchored: boolean;
  gone: boolean;
  /** Where it rests in the lane (pushes move it up from there, not from a moving position). */
  restY: number;
  readonly h: number;
}

/** Barks wrap at this width (a long line never runs off the screen). */
const BARK_WRAP = 620;

export class Barks {
  private lane: Bark[] = [];
  /** Lowest y the lane may reach upward (the narration strip's bottom while one is up). */
  private floor: () => number = () => 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.prompt,
  ) {}

  /** Keep the lane clear of something else at the top of the screen (the narration strip). */
  avoid(bottom: () => number): void {
    this.floor = bottom;
  }

  private floorY(): number {
    try {
      return this.floor();
    } catch {
      return 0;
    }
  }

  /** The strip came: lane barks it would cover leave (the book's voice comes first). */
  relayout(): void {
    const floor = this.floorY();
    if (floor <= 0) return;
    for (const b of [...this.lane]) {
      if (b.restY + 6 - b.h < floor + 4) this.leave(b, 160);
    }
  }

  private leave(b: Bark, ms: number): void {
    if (b.gone) return;
    b.gone = true;
    this.lane = this.lane.filter((o) => o !== b);
    this.scene.tweens.add({ targets: b.root, alpha: 0, duration: ms, onComplete: () => destroy(b.root) });
  }

  show(name: string, text: string, anchor: { x: number; y: number } | null): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const root = this.scene.add.container(0, 0).setDepth(this.depth);
    const bodyStyle = textStyle(theme, 'body', { italic: true, color: c.paper, shadow: true, align: 'center' });
    const lines = wrapText(text, BARK_WRAP, measurer(bodyStyle));
    const lh = lineHeight(theme.size('body'));
    const body = addText(this.scene, 0, 0, lines.join('\n'), { ...bodyStyle, lineSpacing: lh - theme.size('body') });
    body.setOrigin(0.5, 1);
    const label = addText(this.scene, 0, -body.height - 2, name, textStyle(theme, 'citation', { color: c.goldBright, shadow: true, letterSpacing: 1 }));
    label.setOrigin(0.5, 1);
    const w = Math.max(body.width, label.width) + 28;
    const h = body.height + label.height + 14;
    const bg = this.scene.add.rectangle(0, 6, w, h, 0x000000, 0.45).setOrigin(0.5, 1);
    root.add([bg, label, body]);
    let x = GAME_WIDTH / 2;
    // Under the narration strip when one is up.
    const floorNow = this.floorY();
    let y = Math.max(LANE_Y, floorNow > 0 ? floorNow + 8 + h : 0);
    const bark: Bark = { root, anchored: anchor !== null, gone: false, restY: y - 6, h };
    const leave = (b: Bark, ms: number): void => this.leave(b, ms);
    if (anchor) {
      x = Math.max(w / 2 + 10, Math.min(GAME_WIDTH - w / 2 - 10, anchor.x));
      y = Math.max(h + 10, Math.min(GAME_HEIGHT - 200, anchor.y));
    } else {
      // Stack in the lane: newer ones push older ones up; the oldest leaves when the lane is full.
      while (this.lane.length >= LANE_MAX) {
        const old = this.lane[0];
        if (old) leave(old, 200);
        else break;
      }
      const floor = floorNow;
      for (const b of [...this.lane]) {
        b.restY -= h + 6;
        // Pushed up into the strip: it leaves now instead.
        if (b.restY - b.h + 6 < floor + 4) {
          leave(b, 160);
          continue;
        }
        this.scene.tweens.add({ targets: b.root, y: b.restY, duration: 160 });
      }
      this.lane.push(bark);
    }
    // Lane barks only fade in (their y belongs to the stacking); anchored ones rise a little.
    root.setPosition(x, anchor ? y : y - 6);
    root.setAlpha(0);
    this.scene.tweens.add(anchor ? { targets: root, alpha: 1, y: y - 6, duration: 220 } : { targets: root, alpha: 1, duration: 220 });
    const life = TIMINGS.barkMs + text.length * 30;
    this.scene.time.delayedCall(life, () => leave(bark, 380));
  }

  clear(): void {
    for (const b of this.lane) {
      b.gone = true;
      destroy(b.root);
    }
    this.lane = [];
  }
}

/** A tutorial prompt at the bottom centre: keycaps and a short line (non-blocking). */
export class TutorialPrompt {
  private root: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  /** Top of whatever sits at the bottom of the screen (a balloon, a verse); the prompt stays above it. */
  private ceiling: () => number = () => GAME_HEIGHT;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.prompt,
  ) {}

  avoid(top: () => number): void {
    this.ceiling = top;
  }

  private restY(): number {
    let top = GAME_HEIGHT;
    try {
      top = this.ceiling();
    } catch {
      top = GAME_HEIGHT;
    }
    return Math.min(GAME_HEIGHT - 150, top - 34);
  }

  show(keys: readonly string[], text: string, ms: number = TIMINGS.tutorialMs): void {
    this.clear();
    const row = promptRow(this.scene, keys, text, { align: 'center' });
    const bg = this.scene.add.rectangle(0, 0, row.width + 40, 46, 0x000000, 0.55).setOrigin(0.5, 0.5);
    bg.setStrokeStyle(1, uiContext().theme().colors.gold, 0.5);
    const root = this.scene.add.container(GAME_WIDTH / 2, this.restY(), [bg, row.node]).setDepth(this.depth);
    root.setAlpha(0);
    this.root = root;
    this.scene.tweens.add({ targets: root, alpha: 1, duration: 260 });
    this.timer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  /** A balloon or verse came or went at the bottom: move to stay clear of it. */
  relayout(): void {
    if (this.root) this.scene.tweens.add({ targets: this.root, y: this.restY(), duration: 160 });
  }

  /** Move to stay clear of a balloon whose top is at `y`. */
  setBottom(y: number): void {
    if (this.root) this.scene.tweens.add({ targets: this.root, y: Math.min(GAME_HEIGHT - 150, y - 34), duration: 160 });
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
