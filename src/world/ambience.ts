/**
 * Atmosphere over every level: drifting fog in the canto's tint and a dark
 * Doré frame around the view (the screen vignette).
 *
 * Owner: team D (world).
 */

import type * as Phaser from 'phaser';
import { DEPTH, type CantoPalette } from '../config';

export class Ambience {
  private fog: Phaser.GameObjects.TileSprite | null = null;
  private frame: Phaser.GameObjects.Image | null = null;
  private drift = 0;
  private fogAlpha = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  configure(palette: CantoPalette): void {
    this.destroy();
    const s = this.scene;
    if (s.textures.exists('fx-fog')) {
      this.fogAlpha = Math.max(0, Math.min(0.6, palette.fogAlpha * 0.75));
      this.fog = s.add
        .tileSprite(0, 0, 680, 400, 'fx-fog')
        .setOrigin(0, 0)
        .setDepth(DEPTH.fog)
        .setTint(palette.fog)
        .setAlpha(this.fogAlpha);
    }
    if (s.textures.exists('fx-vignette')) {
      this.frame = s.add.image(0, 0, 'fx-vignette').setOrigin(0, 0).setDepth(DEPTH.worldOverlay).setAlpha(0.8);
    }
  }

  /** Thicker or thinner fog (levels, mechanics). */
  setFog(alpha: number): void {
    this.fogAlpha = alpha;
    this.fog?.setAlpha(alpha);
  }

  update(dt: number, view: Phaser.Geom.Rectangle): void {
    this.drift += dt * 0.006;
    if (this.fog) {
      this.fog.setPosition(Math.floor(view.x) - 20, Math.floor(view.y) - 20);
      this.fog.setSize(view.width + 40, view.height + 40);
      this.fog.tilePositionX = Math.floor(view.x * 0.6 + this.drift);
      this.fog.tilePositionY = Math.floor(view.y * 0.6);
    }
    if (this.frame) {
      this.frame.setPosition(view.x, view.y);
      this.frame.setDisplaySize(view.width, view.height);
    }
  }

  destroy(): void {
    this.fog?.destroy();
    this.frame?.destroy();
    this.fog = null;
    this.frame = null;
  }
}
