/**
 * The playable world (camera zoom 2: a 640x360 pixel-art view).
 *
 * PLACEHOLDER created by the architect. Owner: team D (world).
 * Keep the class name and scene key. The real scene hosts the level (a
 * LevelModule or the generic fallback level), player, Virgil and mechanics,
 * and backs the WorldBridge (src/world/bridge.ts).
 */

import * as Phaser from 'phaser';
import { PALETTES, PLAYER, WORLD_VIEW_HEIGHT, WORLD_VIEW_WIDTH, WORLD_ZOOM, actorDepth, cssColor } from '../config';
import { SceneKeys } from './keys';

export class WorldScene extends Phaser.Scene {
  private dante: Phaser.GameObjects.Rectangle | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | null = null;

  constructor() {
    super({ key: SceneKeys.World });
  }

  create(): void {
    const pal = PALETTES.inf01;
    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM);
    cam.setBackgroundColor(cssColor(pal.sky));
    cam.centerOn(WORLD_VIEW_WIDTH / 2, WORLD_VIEW_HEIGHT / 2);

    const g = this.add.graphics();
    g.fillStyle(pal.far).fillRect(0, 120, WORLD_VIEW_WIDTH, 80);
    g.fillStyle(pal.ground).fillRect(0, 200, WORLD_VIEW_WIDTH, WORLD_VIEW_HEIGHT - 200);
    g.fillStyle(pal.path).fillRect(0, 248, WORLD_VIEW_WIDTH, 24);
    g.fillStyle(pal.mid);
    for (let x = 8; x < WORLD_VIEW_WIDTH; x += 37) {
      g.fillTriangle(x, 210, x + 14, 120 + ((x * 7) % 40), x + 28, 210);
    }
    g.fillStyle(pal.light, 0.8).fillCircle(560, 70, 18);

    this.dante = this.add.rectangle(120, 256, 10, 18, 0xa3242a).setDepth(actorDepth(256));
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;
    this.wasd = (this.input.keyboard?.addKeys('W,A,S,D') as WorldScene['wasd']) ?? null;
  }

  override update(_time: number, delta: number): void {
    if (!this.dante) return;
    const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown;
    const step = (PLAYER.walkSpeed * delta) / 1000;
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const dy = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    this.dante.x = Phaser.Math.Clamp(this.dante.x + (dx / len) * step, 6, WORLD_VIEW_WIDTH - 6);
    this.dante.y = Phaser.Math.Clamp(this.dante.y + (dy / len) * step, 206, WORLD_VIEW_HEIGHT - 10);
    this.dante.setDepth(actorDepth(this.dante.y));
  }
}
