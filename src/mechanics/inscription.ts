/**
 * `inscription` (bible §7.0, Canto III s1 the gate): words cut over an arch,
 * darker than the stone and legible only up close. As Dante walks under the
 * arch, the carved rows light up one by one (the presenter shows the verse;
 * this is the stone itself); when he has passed the middle, the last row is
 * whole, and its last word sinks back into the stone (the hope the gate asks
 * for). Emits its event once, when he has walked through.
 *
 * Config:
 *   area: Rect | PlaceId      the ground under the arch
 *   at?: Point                where the words are carved (default: above the area's top centre)
 *   rows?: number             rows of letters (default 3)
 *   width?: number            width of a row in px (default 54)
 *   event?: EventId           emitted when Dante has walked through
 *   darkenLast?: boolean      the last word sinks into the stone (default true)
 *   color?: number            glow colour (default warm ochre)
 *   axis?: 'x' | 'y'          the way through (default: the area's longer side)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext, Rect } from '../runtime/contracts';
import type { EventId } from '../story/types';
import { clamp, rectContains } from '../world/geometry';
import { BaseMechanic, num, type AreaRef, type Point } from './base';

export interface InscriptionConfig {
  readonly area: AreaRef;
  readonly at?: Point;
  readonly rows?: number;
  readonly width?: number;
  readonly event?: EventId;
  readonly darkenLast?: boolean;
  readonly color?: number;
  /** Which way Dante walks through (default: along the area's longer side). */
  readonly axis?: 'x' | 'y';
}

export class Inscription extends BaseMechanic {
  private readonly cfg: InscriptionConfig;
  private readonly rect: Rect | null;
  private readonly glyphs: Phaser.GameObjects.Image[][] = [];
  private progress = 0;
  private read = false;
  private t = 0;
  /** Time since the whole inscription was lit (the last word then sinks into the stone). */
  private sinkMs = 0;

  constructor(ctx: MechanicContext, cfg: InscriptionConfig) {
    super('inscription', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.event);
    this.rect = this.areaOf(cfg.area);
    const scene = this.scene;
    const r = this.rect;
    const at = cfg.at ?? (r ? { x: r.x + r.w / 2, y: r.y - 6 } : { x: this.player.x, y: this.player.y - 40 });
    const rows = clamp(Math.round(num(cfg.rows, 3)), 1, 6);
    const width = Math.max(16, num(cfg.width, 54));
    const color = num(cfg.color, 0xd9a65a);
    if (scene.textures.exists('fx-letters')) {
      for (let row = 0; row < rows; row++) {
        const line: Phaser.GameObjects.Image[] = [];
        const n = Math.max(3, Math.floor(width / 6));
        for (let i = 0; i < n; i++) {
          const x = at.x - width / 2 + i * 6 + 3;
          const y = at.y + row * 7;
          const img = this.own(
            scene.add
              .image(x, y, 'fx-letters', String((row * 7 + i * 3) % 6))
              .setDepth(DEPTH.actorsFront)
              .setTint(color)
              .setAlpha(0.08)
              .setScale(0.75),
          );
          line.push(img);
        }
        this.glyphs.push(line);
      }
    }
  }

  private alongX(): boolean {
    const r = this.rect;
    if (this.cfg.axis) return this.cfg.axis === 'x';
    return r ? r.w >= r.h : true;
  }

  get hasBeenRead(): boolean {
    return this.read;
  }

  protected override step(dt: number): void {
    this.t += dt;
    const r = this.rect;
    if (!r) return;
    const p = this.player;
    const inside = rectContains(r, p.x, p.y);
    if (inside) {
      // Progress along the arch's longer side.
      const along = this.alongX() ? (p.x - r.x) / Math.max(1, r.w) : (p.y - r.y) / Math.max(1, r.h);
      this.progress = Math.max(this.progress, clamp(along * 1.25, 0, 1));
    }
    if (this.progress >= 1) this.sinkMs += dt;
    const sink = clamp(this.sinkMs / 1500, 0, 1);
    const rows = this.glyphs.length;
    this.glyphs.forEach((line, row) => {
      const lit = clamp(this.progress * rows - row, 0, 1);
      line.forEach((g, i) => {
        const flicker = 0.85 + 0.15 * Math.sin(this.t / 240 + i);
        let a = 0.08 + 0.8 * lit * flicker;
        // The last word of the last row sinks back into the stone.
        if (this.cfg.darkenLast !== false && row === rows - 1 && i >= line.length - 4) {
          a = a * (1 - sink) + 0.04 * sink;
        }
        g.setAlpha(a);
      });
    });
    if (!this.read && this.progress >= 1 && !inside) {
      this.read = true;
      this.emitEvent(this.cfg.event);
    } else if (!this.read && this.progress >= 1 && inside && (this.alongX() ? p.x > r.x + r.w * 0.8 : p.y > r.y + r.h * 0.8)) {
      this.read = true;
      this.emitEvent(this.cfg.event);
    }
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), progress: Math.round(this.progress * 100) / 100, read: this.read };
  }
}

export function createInscription(ctx: MechanicContext, cfg: InscriptionConfig): Inscription {
  return new Inscription(ctx, cfg);
}
