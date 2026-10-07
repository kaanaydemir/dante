/**
 * Small, shared visual effects for mechanics (no gameplay): fear waves, dust
 * puffs, ground telegraphs, ripples. Every helper checks that its texture
 * exists and cleans up after itself; none of them can throw into a frame.
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';

/** An expanding ring on the ground (a roar, a command, a quake's pulse). */
export function waveRing(scene: Phaser.Scene, x: number, y: number, opts: { color?: number; radius?: number; ms?: number; alpha?: number } = {}): void {
  try {
    const g = scene.add.graphics().setDepth(DEPTH.fxBelow);
    const radius = opts.radius ?? 140;
    const ms = Math.max(50, opts.ms ?? 900);
    const color = opts.color ?? 0x2a0a08;
    const alpha = opts.alpha ?? 0.55;
    const proxy = { t: 0 };
    scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: ms,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        const r = 4 + radius * proxy.t;
        g.lineStyle(3, color, alpha * (1 - proxy.t));
        g.strokeEllipse(x, y, r * 2, r * 1.2);
        g.lineStyle(1, color, alpha * 0.6 * (1 - proxy.t));
        g.strokeEllipse(x, y, r * 1.6, r * 0.96);
      },
      onComplete: () => g.destroy(),
      onStop: () => g.destroy(),
    });
  } catch {
    // purely visual
  }
}

/** A puff of dust at someone's feet. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number, tint?: number): void {
  try {
    if (!scene.textures.exists('fx-dust')) return;
    const s = scene.add.sprite(x, y, 'fx-dust', '0').setOrigin(0.5, 1).setDepth(DEPTH.fx);
    if (tint !== undefined) s.setTint(tint);
    if (scene.anims.exists('fx-dust-puff')) {
      s.play('fx-dust-puff');
      s.once('animationcomplete', () => s.destroy());
      scene.time.delayedCall(800, () => {
        if (s.active) s.destroy();
      });
    } else {
      scene.time.delayedCall(300, () => s.destroy());
    }
  } catch {
    // purely visual
  }
}

/** A dark shadow on the ground that grows until a blow lands there. Returns a handle to update / remove it. */
export class GroundMark {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly color = 0x000000,
  ) {
    this.g = scene.add.graphics().setDepth(DEPTH.groundDecor + 2);
  }

  /** Draw the mark at `progress` (0..1) of its telegraph. */
  draw(x: number, y: number, radius: number, progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    this.g.clear();
    this.g.fillStyle(this.color, 0.15 + 0.35 * p);
    this.g.fillEllipse(x, y, radius * 2 * (0.4 + 0.6 * p), radius * 1.1 * (0.4 + 0.6 * p));
    this.g.lineStyle(1, 0xd8ccb0, 0.25 + 0.5 * p * (0.6 + 0.4 * Math.sin(this.scene.time.now / 70)));
    this.g.strokeEllipse(x, y, radius * 2, radius * 1.1);
  }

  /** A line on the ground (a lunge's path in the dust). */
  line(x0: number, y0: number, x1: number, y1: number, progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    this.g.clear();
    this.g.lineStyle(2, 0xd8ccb0, 0.2 + 0.4 * p * Math.abs(Math.sin(this.scene.time.now / 90)));
    this.g.lineBetween(x0, y0, x1, y1);
  }

  clear(): void {
    this.g.clear();
  }

  destroy(): void {
    this.g.destroy();
  }

  get object(): Phaser.GameObjects.Graphics {
    return this.g;
  }
}

/** Rings spreading on still water under someone's feet. */
export function ripple(scene: Phaser.Scene, x: number, y: number, color = 0xcfe0ff): void {
  try {
    const g = scene.add.graphics().setDepth(DEPTH.groundDecor + 1);
    const proxy = { t: 0 };
    scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: 900,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(1, color, 0.6 * (1 - proxy.t));
        g.strokeEllipse(x, y, 6 + 26 * proxy.t, 3 + 11 * proxy.t);
      },
      onComplete: () => g.destroy(),
      onStop: () => g.destroy(),
    });
  } catch {
    // purely visual
  }
}

/** A glowing column over a spot (something to walk to). Returns the image (caller destroys). */
export function lightColumn(scene: Phaser.Scene, x: number, y: number, tint = 0xfff0c0): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists('fx-glow')) return null;
  return scene.add.image(x, y - 26, 'fx-glow').setDepth(DEPTH.fxBelow).setDisplaySize(14, 70).setAlpha(0.18).setTint(tint);
}
