/**
 * `walk_on_water` (bible §7.0, Canto IV s6: "This we passed over even as firm
 * ground", IV 109; GDD 10.2 `SurfaceModifier`): a stream that holds whoever
 * steps on it. While anyone walks on the water a thin ring spreads under each
 * step and closes again. The first step Dante takes onto it emits the event.
 *
 * Config:
 *   area: Rect | PlaceId     the water
 *   event?: EventId          emitted on Dante's first step onto it
 *   open?: boolean           walkable from the start (default true); when false the
 *                            water is solid until `open()` is called
 *   rippleMs?: number        a ring every N ms while walking (default 300)
 *   draw?: boolean           paint a band of still water over the area (default false:
 *                            the level's tiles already show it)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { ActorHandle, MechanicContext, Rect } from '../runtime/contracts';
import type { EventId } from '../story/types';
import { rectContains } from '../world/geometry';
import { BaseMechanic, num, type AreaRef } from './base';
import { ripple } from './visuals';

export interface WalkOnWaterConfig {
  readonly area: AreaRef;
  readonly event?: EventId;
  readonly open?: boolean;
  readonly rippleMs?: number;
  readonly draw?: boolean;
}

export class WalkOnWater extends BaseMechanic {
  private readonly cfg: WalkOnWaterConfig;
  private readonly rect: Rect | null;
  private removeSolid: (() => void) | null = null;
  private stepped = false;
  private readonly last = new Map<string, { x: number; y: number; ms: number }>();
  private readonly band: Phaser.GameObjects.Graphics | null = null;

  constructor(ctx: MechanicContext, cfg: WalkOnWaterConfig) {
    super('walk_on_water', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.event);
    this.rect = this.areaOf(cfg.area);
    const r = this.rect;
    if (r && cfg.open === false && this.w) this.removeSolid = this.w.addSolid(r);
    if (r && cfg.draw) {
      const pal = ctx.level.palette;
      const g = this.own(this.scene.add.graphics().setDepth(DEPTH.groundDecor));
      g.fillStyle(pal.water, 0.85);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(1, 0xcfe0ff, 0.25);
      for (let y = r.y + 4; y < r.y + r.h; y += 7) g.lineBetween(r.x + 2, y, r.x + r.w - 2, y);
      this.band = g;
    }
    this.onDispose(() => this.removeSolid?.());
  }

  /** Let the water hold him (when it started solid). */
  open(): void {
    this.removeSolid?.();
    this.removeSolid = null;
  }

  get hasStepped(): boolean {
    return this.stepped;
  }

  protected override step(dt: number): void {
    const r = this.rect;
    if (!r) return;
    const walkers: ActorHandle[] = [this.player];
    if (this.level.virgil) walkers.push(this.level.virgil);
    for (const n of this.w?.npcs() ?? []) walkers.push(n.actor);
    const every = num(this.cfg.rippleMs, 300);
    for (const a of walkers) {
      if (!a.sprite.visible || !rectContains(r, a.x, a.y)) {
        this.last.delete(a.id);
        continue;
      }
      const prev = this.last.get(a.id);
      if (!prev) {
        this.last.set(a.id, { x: a.x, y: a.y, ms: 0 });
        ripple(this.scene, a.x, a.y);
        continue;
      }
      prev.ms += dt;
      const moved = Math.hypot(a.x - prev.x, a.y - prev.y);
      if (moved > 2 && prev.ms >= every) {
        ripple(this.scene, a.x, a.y);
        prev.x = a.x;
        prev.y = a.y;
        prev.ms = 0;
      }
    }
    if (!this.stepped && this.removeSolid === null && rectContains(r, this.player.x, this.player.y)) {
      this.stepped = true;
      this.emitEvent(this.cfg.event);
    }
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), open: this.removeSolid === null, stepped: this.stepped, band: this.band !== null };
  }
}

export function createWalkOnWater(ctx: MechanicContext, cfg: WalkOnWaterConfig): WalkOnWater {
  return new WalkOnWater(ctx, cfg);
}
