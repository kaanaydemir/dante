/**
 * `darkness` (VisionModifier, GDD 10.2): the view sinks into black except a
 * ring of sight around Dante, Virgil's faint glow and fixed lights (the hill
 * at dawn, the fire of Limbo). A Reveal verse widens the ring for a while.
 *
 * Config:
 *   radius?: number         ring of sight in px (default 72; Canto I dense wood: 48)
 *   alpha?: number          darkness opacity (default 0.9)
 *   color?: number          default: the palette's shadow
 *   areas?: Rect[]          dark only inside these (default: everywhere)
 *   lights?: {x,y,r}[]      fixed lights
 *   virgilGlow?: number     radius of Virgil's own light (default 26; 0 = none)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext, Rect } from '../runtime/contracts';
import { rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num } from './base';

export interface LightDef {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface DarknessConfig {
  readonly radius?: number;
  readonly alpha?: number;
  readonly color?: number;
  readonly areas?: readonly Rect[];
  readonly lights?: readonly LightDef[];
  readonly virgilGlow?: number;
}

const PAD = 24;

export class Darkness extends BaseMechanic {
  private readonly rt: Phaser.GameObjects.RenderTexture | null;
  private readonly brush: Phaser.GameObjects.Image | null;
  private readonly lights: LightDef[];
  private readonly areas: readonly Rect[] | null;
  private readonly color: number;
  private readonly maxAlpha: number;
  private alpha = 0;
  private radius: number;
  private baseRadius: number;
  private radiusTween: { from: number; to: number; ms: number; t: number } | null = null;
  private revealUntil = 0;
  private readonly virgilGlow: number;

  constructor(ctx: MechanicContext, cfg: DarknessConfig) {
    super('darkness', ctx);
    const s = this.scene;
    this.radius = this.baseRadius = num(cfg.radius, 72);
    this.maxAlpha = Math.max(0, Math.min(1, num(cfg.alpha, 0.9)));
    this.color = num(cfg.color, ctx.level.palette.shadow);
    this.areas = cfg.areas && cfg.areas.length > 0 ? cfg.areas : null;
    this.lights = [...(cfg.lights ?? [])];
    this.virgilGlow = num(cfg.virgilGlow, 26);
    const cam = s.cameras.main;
    const w = Math.ceil(cam.width / cam.zoom) + PAD * 2;
    const h = Math.ceil(cam.height / cam.zoom) + PAD * 2;
    this.rt = s.textures.exists('fx-light') ? this.own(s.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(DEPTH.darkness)) : null;
    this.brush = s.textures.exists('fx-light') ? this.own(s.make.image({ x: 0, y: 0, key: 'fx-light', add: false })) : null;
    this.alpha = this.areas ? 0 : this.maxAlpha;
  }

  /** Change the ring of sight (px), eased over `ms`. */
  setRadius(r: number, ms = 600): void {
    this.baseRadius = r;
    this.radiusTween = { from: this.radius, to: r, ms: Math.max(1, ms), t: 0 };
  }

  addLight(light: LightDef): void {
    this.lights.push(light);
  }

  clearLights(): void {
    this.lights.length = 0;
  }

  override update(dt: number): void {
    const rt = this.rt;
    const brush = this.brush;
    if (!rt || !brush) return;
    const p = this.level.player;
    const now = this.w?.now() ?? 0;
    if (this.radiusTween) {
      const tw = this.radiusTween;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.ms);
      this.radius = tw.from + (tw.to - tw.from) * k;
      if (k >= 1) this.radiusTween = null;
    }
    const reveal = now < this.revealUntil ? 2.2 : 1;
    const target = this.areas ? (this.areas.some((a) => rectContains(a, p.x, p.y)) ? this.maxAlpha : 0) : this.maxAlpha;
    this.alpha += (target - this.alpha) * Math.min(1, dt / 500);
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const ox = Math.floor(v.x) - PAD;
    const oy = Math.floor(v.y) - PAD;
    rt.setPosition(ox, oy);
    rt.clear();
    if (this.alpha < 0.01) {
      rt.setVisible(false);
      return;
    }
    rt.setVisible(true);
    rt.fill(this.color, this.alpha);
    const r = this.radius * reveal * (0.97 + 0.03 * Math.sin(now / 300));
    const draw = (x: number, y: number, radius: number, strength = 1): void => {
      brush.setDisplaySize(radius * 2, radius * 2);
      brush.setAlpha(strength);
      rt.erase(brush, x - ox, y - oy);
    };
    draw(p.x, p.y - 14, r);
    const v2 = this.level.virgil;
    if (v2 && v2.sprite.visible && this.virgilGlow > 0) draw(v2.x, v2.y - 14, this.virgilGlow * reveal, 0.8);
    for (const l of this.lights) draw(l.x, l.y, l.r, 1);
  }

  override onVerse(cast: VerseCast): void {
    if (cast.category === 'Reveal' && this.w) this.revealUntil = this.w.now() + 6000 * cast.power;
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), radius: Math.round(this.radius), alpha: Math.round(this.alpha * 100) / 100, lights: this.lights.length };
  }
}

export function createDarkness(ctx: MechanicContext, cfg: DarknessConfig): Darkness {
  return new Darkness(ctx, cfg);
}
