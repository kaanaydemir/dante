/**
 * `fear` (bible §7.0, GDD 2.3): zones where no light enters drain Resolve
 * slowly. Carrying the Burden word Fear makes the drain worse (×1.25,
 * bible §3.4.3); Fortitude tiers soften it; a Mend verse soothes it for a while.
 * The screen's edges darken while Dante stands in one.
 *
 * Config:
 *   zones?: Rect[]            areas of fear
 *   places?: PlaceId[]        …or whole places
 *   drainPerSecond?: number   default RESOURCES.fearDrainPerSecond
 *   floor?: number            Resolve never falls below this (Canto I: 1, no faint)
 *   visible?: boolean         draw the dark pits (default true)
 *
 * Owner: team D (mechanics).
 */

import { DEPTH, RESOURCES } from '../config';
import type { MechanicContext, Rect } from '../runtime/contracts';
import { virtueTier } from '../state/selectors';
import type { PlaceId } from '../story/types';
import { rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num } from './base';

export interface FearConfig {
  readonly zones?: readonly Rect[];
  readonly places?: readonly PlaceId[];
  readonly drainPerSecond?: number;
  readonly floor?: number;
  readonly visible?: boolean;
}

export class FearZones extends BaseMechanic {
  private readonly zones: Rect[];
  private readonly rate: number;
  private readonly floor: number;
  private soothedUntil = 0;
  private inside = false;
  private drained = 0;
  private readonly edge: Phaser.GameObjects.Image | null;
  private edgeAlpha = 0;

  constructor(ctx: MechanicContext, cfg: FearConfig) {
    super('fear', ctx);
    this.zones = [...(cfg.zones ?? [])];
    for (const id of cfg.places ?? []) {
      const p = ctx.level.place(id);
      if (p) this.zones.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    }
    this.rate = num(cfg.drainPerSecond, RESOURCES.fearDrainPerSecond);
    this.floor = num(cfg.floor, 0);
    const s = this.scene;
    if (cfg.visible !== false) {
      const shadow = ctx.level.palette.shadow;
      for (const z of this.zones) {
        const g = this.own(s.add.graphics().setDepth(DEPTH.groundDecor + 1));
        // A dark hollow: concentric ellipses, darkest in the middle.
        for (let i = 0; i < 4; i++) {
          g.fillStyle(shadow, 0.16);
          g.fillEllipse(z.x + z.w / 2, z.y + z.h / 2, z.w * (1 - i * 0.18), z.h * (1 - i * 0.18));
        }
      }
    }
    this.edge = s.textures.exists('fx-vignette')
      ? this.own(s.add.image(0, 0, 'fx-vignette').setOrigin(0, 0).setDepth(DEPTH.worldOverlay + 3).setAlpha(0).setTint(0x000000))
      : null;
  }

  isInside(x: number, y: number): boolean {
    return this.zones.some((z) => rectContains(z, x, y));
  }

  override update(dt: number): void {
    const w = this.w;
    if (!w) return;
    const p = this.level.player;
    this.inside = this.isInside(p.x, p.y);
    const active = this.inside && w.now() >= this.soothedUntil && w.playable();
    if (active) {
      const state = this.level.store.state;
      const burden = state.words.owned.includes('Fear') && !state.words.shed.includes('Fear') ? RESOURCES.burdenFearMultiplier : 1;
      const fortitude = 1 - 0.1 * virtueTier(state, 'fortitude');
      const rate = this.rate * burden * Math.max(0.5, fortitude);
      const before = state.resolve;
      w.drain(rate, dt, 'fear', this.floor);
      this.drained += Math.max(0, before - this.level.store.state.resolve);
    }
    // The edges of the view darken while fear works on him.
    const target = active ? 0.85 : 0;
    this.edgeAlpha += (target - this.edgeAlpha) * Math.min(1, dt / 400);
    if (this.edge) {
      const v = this.scene.cameras.main.worldView;
      this.edge.setPosition(v.x, v.y).setDisplaySize(v.width, v.height).setAlpha(this.edgeAlpha);
    }
  }

  override onVerse(cast: VerseCast): void {
    if (cast.category === 'Mend' && this.w) this.soothedUntil = this.w.now() + 5000 * cast.power;
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), zones: this.zones.length, inside: this.inside, drained: Math.round(this.drained * 100) / 100 };
  }
}

export function createFear(ctx: MechanicContext, cfg: FearConfig): FearZones {
  return new FearZones(ctx, cfg);
}
