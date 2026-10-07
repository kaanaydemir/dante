/**
 * `fear` (bible §7.0, GDD 2.3): zones where no light enters drain Resolve
 * slowly. Carrying the Burden word Fear makes the drain worse (×1.25,
 * bible §3.4.3); Fortitude tiers soften it; a Mend verse soothes it for a
 * while; walking close beside Virgil (his hand, III 19–21) halves it. The
 * screen's edges darken while Dante stands in one.
 *
 * Besides still hollows, fear can travel: whirls of dark sand full of voices
 * (Ante-Inferno, III 28–30) moving along fixed loops.
 *
 * Config:
 *   zones?: Rect[]                      still areas of fear
 *   places?: PlaceId[]                  …or whole places
 *   whirls?: { path, radius?, speed? }[] moving fear along closed loops
 *   drainPerSecond?: number             default RESOURCES.fearDrainPerSecond
 *   floor?: number                      Resolve never falls below this (Canto I: 1, no faint)
 *   nearVirgil?: number                 drain factor beside Virgil (default 0.5)
 *   visible?: boolean                   draw the dark hollows (default true)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH, RESOURCES } from '../config';
import type { MechanicContext, Rect } from '../runtime/contracts';
import { virtueTier } from '../state/selectors';
import type { PlaceId } from '../story/types';
import { dist, rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num, type Point } from './base';
import { PolyPath } from './logic/path';

export interface WhirlDef {
  readonly path: readonly Point[];
  readonly radius?: number;
  readonly speed?: number;
}

export interface FearConfig {
  readonly zones?: readonly Rect[];
  readonly places?: readonly PlaceId[];
  readonly whirls?: readonly WhirlDef[];
  readonly drainPerSecond?: number;
  readonly floor?: number;
  readonly nearVirgil?: number;
  readonly visible?: boolean;
}

interface Whirl {
  readonly path: PolyPath;
  readonly radius: number;
  readonly speed: number;
  s: number;
  x: number;
  y: number;
  readonly cloud: Phaser.GameObjects.Image | null;
  readonly motes: Phaser.GameObjects.Image[];
}

export class FearZones extends BaseMechanic {
  private readonly zones: Rect[];
  private readonly whirls: Whirl[] = [];
  private readonly rate: number;
  private readonly floor: number;
  private readonly nearVirgil: number;
  private soothedUntil = 0;
  private inside = false;
  private drained = 0;
  private t = 0;
  private readonly edge: Phaser.GameObjects.Image | null;
  private edgeAlpha = 0;
  /** The drawn hollows of the still zones (they fade when the zones are put out). */
  private readonly hollows: Phaser.GameObjects.Graphics[] = [];
  private quenched = false;

  constructor(ctx: MechanicContext, cfg: FearConfig) {
    super('fear', ctx, cfg);
    this.zones = [...(cfg.zones ?? [])];
    for (const id of cfg.places ?? []) {
      const p = ctx.level.place(id);
      if (p) this.zones.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    }
    this.rate = num(cfg.drainPerSecond, RESOURCES.fearDrainPerSecond);
    this.floor = num(cfg.floor, 0);
    this.nearVirgil = num(cfg.nearVirgil, 0.5);
    const s = this.scene;
    if (cfg.visible !== false) {
      const shadow = ctx.level.palette.shadow;
      for (const z of this.zones) {
        const g = this.own(s.add.graphics().setDepth(DEPTH.groundDecor + 1));
        this.hollows.push(g);
        // A dark hollow: concentric ellipses, darkest in the middle.
        for (let i = 0; i < 4; i++) {
          g.fillStyle(shadow, 0.16);
          g.fillEllipse(z.x + z.w / 2, z.y + z.h / 2, z.w * (1 - i * 0.18), z.h * (1 - i * 0.18));
        }
      }
    }
    for (const def of cfg.whirls ?? []) {
      const path = new PolyPath(def.path ?? [], true);
      const radius = num(def.radius, 22);
      const start = path.at(0);
      const cloud = s.textures.exists('fx-glow')
        ? this.own(s.add.image(start.x, start.y, 'fx-glow').setDepth(DEPTH.fx).setTint(0x2a2016).setDisplaySize(radius * 2.4, radius * 1.6).setAlpha(0.55))
        : null;
      const motes: Phaser.GameObjects.Image[] = [];
      if (s.textures.exists('fx-letters')) {
        for (let i = 0; i < 5; i++) motes.push(this.own(s.add.image(start.x, start.y, 'fx-letters', String(i % 6)).setDepth(DEPTH.fx).setTint(0x8a7a62).setAlpha(0.5)));
      }
      this.whirls.push({ path, radius, speed: num(def.speed, 26), s: (this.whirls.length * path.length) / 3, x: start.x, y: start.y, cloud, motes });
    }
    this.edge = s.textures.exists('fx-vignette')
      ? this.own(s.add.image(0, 0, 'fx-vignette').setOrigin(0, 0).setDepth(DEPTH.worldOverlay + 3).setAlpha(0).setTint(0x000000))
      : null;
  }

  /**
   * Put the still zones out for good (a level's moment: Dante leaves his fear
   * at the gate, III s1). The edge darkness fades as usual; whirls keep turning.
   */
  quench(): void {
    if (this.quenched) return;
    this.quenched = true;
    for (const g of this.hollows) this.scene.tweens.add({ targets: g, alpha: 0, duration: 900 });
  }

  isInside(x: number, y: number): boolean {
    if (!this.quenched && this.zones.some((z) => rectContains(z, x, y))) return true;
    return this.whirls.some((wh) => Math.abs(wh.x - x) <= wh.radius && Math.abs(wh.y - y) <= wh.radius * 0.7);
  }

  protected override step(dt: number): void {
    this.t += dt;
    for (const wh of this.whirls) {
      wh.s += (wh.speed * dt) / 1000;
      const p = wh.path.at(wh.s);
      wh.x = p.x;
      wh.y = p.y;
      wh.cloud?.setPosition(Math.round(p.x), Math.round(p.y - 8)).setAngle((this.t / 6) % 360);
      wh.motes.forEach((m, i) => {
        const a = this.t / 240 + (i / wh.motes.length) * Math.PI * 2;
        m.setPosition(Math.round(p.x + Math.cos(a) * wh.radius * 0.7), Math.round(p.y - 10 + Math.sin(a) * wh.radius * 0.35));
      });
    }
    const w = this.w;
    if (!w) return;
    const p = this.level.player;
    this.inside = this.isInside(p.x, p.y);
    const active = this.inside && w.now() >= this.soothedUntil && w.playable();
    if (active) {
      const state = this.level.store.state;
      const burden = state.words.owned.includes('Fear') && !state.words.shed.includes('Fear') ? RESOURCES.burdenFearMultiplier : 1;
      const fortitude = 1 - 0.1 * virtueTier(state, 'fortitude');
      const v = this.level.virgil;
      const beside = v && v.sprite.visible && dist(v.x, v.y, p.x, p.y) < 26 ? this.nearVirgil : 1;
      const rate = this.rate * burden * Math.max(0.5, fortitude) * beside;
      const before = state.resolve;
      w.drain(rate, dt, 'fear', this.floor);
      this.drained += Math.max(0, before - this.level.store.state.resolve);
    }
    // The edges of the view darken while fear works on him.
    const target = active ? 0.85 : 0;
    this.edgeAlpha += (target - this.edgeAlpha) * Math.min(1, dt / 400);
    if (this.edge) {
      const view = this.scene.cameras.main.worldView;
      this.edge.setPosition(view.x, view.y).setDisplaySize(view.width, view.height).setAlpha(this.edgeAlpha);
    }
  }

  override onVerse(cast: VerseCast): void {
    if (cast.category === 'Mend' && this.w) this.soothedUntil = this.w.now() + 5000 * cast.power;
  }

  override debugInfo(): Record<string, unknown> {
    return {
      ...super.debugInfo(),
      zones: this.zones.length,
      whirls: this.whirls.length,
      inside: this.inside,
      drained: Math.round(this.drained * 100) / 100,
    };
  }
}

export function createFear(ctx: MechanicContext, cfg: FearConfig): FearZones {
  return new FearZones(ctx, cfg);
}
