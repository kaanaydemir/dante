/**
 * Showing what the story waits for (docs/ENGINE.md §8.1 "armed places / NPCs
 * with a glint"): a twinkle and a faint column of light over each armed
 * place, and a small golden arrow at the edge of the view pointing to the
 * place the story is waiting on when it is off screen.
 *
 * Owner: team D (world).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { ArmedBeat, PlaceDef } from '../runtime/contracts';
import type { PlaceId } from '../story/types';
import { placeSpawn } from './places';

interface Marker {
  readonly place: PlaceId;
  readonly cursor: boolean;
  readonly glint: Phaser.GameObjects.Sprite;
  readonly column: Phaser.GameObjects.Image | null;
}

export class ArmedMarkers {
  private markers: Marker[] = [];
  private arrow: Phaser.GameObjects.Image | null = null;
  private time = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Rebuild the markers for the armed `enter:` beats. */
  set(armed: readonly ArmedBeat[], place: (id: PlaceId) => PlaceDef | null): void {
    this.clear();
    const s = this.scene;
    const seen = new Set<PlaceId>();
    for (const a of armed) {
      if (a.trigger.kind !== 'enter' || seen.has(a.trigger.place)) continue;
      const def = place(a.trigger.place);
      if (!def) continue;
      seen.add(def.id);
      const p = placeSpawn(def);
      const glint = s.add.sprite(p.x, p.y - 20, 'fx-glint', '2').setDepth(DEPTH.fx).setAlpha(a.cursor ? 1 : 0.6);
      if (s.anims.exists('fx-glint-twinkle')) glint.play('fx-glint-twinkle');
      const column = s.textures.exists('fx-glow')
        ? s.add
            .image(p.x, p.y - 26, 'fx-glow')
            .setDepth(DEPTH.fxBelow)
            .setDisplaySize(14, 70)
            .setAlpha(a.cursor ? 0.22 : 0.12)
            .setTint(0xfff0c0)
        : null;
      this.markers.push({ place: def.id, cursor: a.cursor || a.nextScene, glint, column });
    }
    if (this.markers.length > 0 && s.textures.exists('fx-arrow')) {
      this.arrow = s.add.image(0, 0, 'fx-arrow').setDepth(DEPTH.worldOverlay + 5).setVisible(false);
    }
  }

  update(dt: number, view: Phaser.Geom.Rectangle, insidePlace: (id: PlaceId) => boolean): void {
    this.time += dt;
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 380);
    let target: Marker | null = null;
    for (const m of this.markers) {
      const here = insidePlace(m.place);
      m.glint.setVisible(!here);
      m.column?.setVisible(!here);
      m.column?.setAlpha((m.cursor ? 0.14 : 0.07) + pulse * 0.1);
      if (!here && (target === null || (m.cursor && !target.cursor))) target = m;
    }
    if (!this.arrow) return;
    if (!target || view.contains(target.glint.x, target.glint.y)) {
      this.arrow.setVisible(false);
      return;
    }
    // Clamp the direction to the view's edge, a little inside.
    const cx = view.centerX;
    const cy = view.centerY;
    const dx = target.glint.x - cx;
    const dy = target.glint.y - cy;
    const sx = (view.width / 2 - 12) / Math.max(1e-6, Math.abs(dx));
    const sy = (view.height / 2 - 12) / Math.max(1e-6, Math.abs(dy));
    const k = Math.min(sx, sy);
    this.arrow
      .setVisible(true)
      .setPosition(Math.round(cx + dx * k), Math.round(cy + dy * k))
      .setRotation(Math.atan2(dy, dx) + Math.PI / 2)
      .setAlpha(0.55 + pulse * 0.45);
  }

  clear(): void {
    for (const m of this.markers) {
      m.glint.destroy();
      m.column?.destroy();
    }
    this.markers = [];
    this.arrow?.destroy();
    this.arrow = null;
  }
}
