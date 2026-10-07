/**
 * `quake` (bible §7.0, Canto III s7 "the dusk champaign trembled"): the
 * ground heaves. The view shakes (if screen shake is on), cracks open around
 * Dante, dust spurts from them and every so often the ground throws him a
 * little; walking is heavy. The quake ends when Dante reaches someone (his
 * guide's hand) or after its time, and then emits its event. It can never
 * hurt him and never makes him faint (that is the story's own faint).
 *
 * Config:
 *   durationMs?: number          default 12000 (III s7: "or when 12 seconds have passed")
 *   reach?: SpeakerId | Point    reaching this ends the quake early (default VIRGIL)
 *   reachDistance?: number       default 18 (a tile)
 *   event?: EventId              emitted when the quake ends (reached or timed out)
 *   shoveEveryMs?: number        default 1700
 *   shovePx?: number             default 20
 *   slow?: number                walking speed factor while it lasts (default 0.75)
 *   auto?: boolean               start at once (default false: call `run()`)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import { dist, seededRandom } from '../world/geometry';
import { BaseMechanic, num, type Point, type Waiter } from './base';
import { dustPuff, waveRing } from './visuals';

export interface QuakeConfig {
  readonly durationMs?: number;
  readonly reach?: SpeakerId | Point;
  readonly reachDistance?: number;
  readonly event?: EventId;
  readonly shoveEveryMs?: number;
  readonly shovePx?: number;
  readonly slow?: number;
  readonly auto?: boolean;
}

export type QuakeEnd = 'reached' | 'timeout' | 'aborted';

export class Quake extends BaseMechanic {
  private readonly cfg: QuakeConfig;
  private waiter: Waiter<'reached'> | null = null;
  private untilShove = 0;
  private untilShake = 0;
  private readonly cracks: Phaser.GameObjects.Graphics;
  private readonly rnd = seededRandom(1303);
  private crackCount = 0;
  private result: QuakeEnd | null = null;

  constructor(ctx: MechanicContext, cfg: QuakeConfig) {
    super('quake', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.event);
    this.cracks = this.own(this.scene.add.graphics().setDepth(DEPTH.groundDecor + 1));
    if (cfg.auto) void this.run();
  }

  get running(): boolean {
    return this.waiter !== null && !this.waiter.done;
  }

  get outcome(): QuakeEnd | null {
    return this.result;
  }

  /** Shake until Dante reaches the target or the time is up. Always resolves. */
  run(signal?: AbortSignal): Promise<QuakeEnd> {
    if (this.waiter && !this.waiter.done) return this.waiter.promise as Promise<QuakeEnd>;
    const waiter = this.moment<'reached'>(Math.max(1000, num(this.cfg.durationMs, 12_000)), signal);
    this.waiter = waiter;
    this.untilShove = 600;
    this.untilShake = 0;
    this.w?.sfx('quake');
    return waiter.promise.then((r) => {
      this.result = r;
      this.waiter = null;
      if (r !== 'aborted') this.emitEvent(this.cfg.event);
      return r;
    });
  }

  private target(): Point | null {
    const r = this.cfg.reach ?? 'VIRGIL';
    if (typeof r === 'string') {
      const a = this.actorOf(r);
      return a && a.sprite.visible ? { x: a.x, y: a.y } : null;
    }
    return r;
  }

  protected override step(dt: number): void {
    const waiter = this.waiter;
    const w = this.w;
    if (!waiter || waiter.done || !w) return;
    const p = this.player;
    w.slow(num(this.cfg.slow, 0.75));
    this.untilShake -= dt;
    if (this.untilShake <= 0) {
      this.untilShake = 520;
      void this.level.camera.shake(540, 0.0035 + this.rnd() * 0.003);
    }
    this.untilShove -= dt;
    if (this.untilShove <= 0 && w.playable()) {
      this.untilShove = num(this.cfg.shoveEveryMs, 1700) * (0.7 + this.rnd() * 0.6);
      const a = this.rnd() * Math.PI * 2;
      const px = num(this.cfg.shovePx, 20);
      w.dante.knock(Math.cos(a) * px * 4, Math.sin(a) * px * 2.4, 220);
      dustPuff(this.scene, p.x, p.y);
      this.crack(p.x + (this.rnd() - 0.5) * 120, p.y + (this.rnd() - 0.5) * 60);
      waveRing(this.scene, p.x, p.y, { color: 0x3a2a1a, radius: 60, ms: 600, alpha: 0.4 });
    }
    const t = this.target();
    if (t && dist(t.x, t.y, p.x, p.y) <= num(this.cfg.reachDistance, 18)) waiter.finish('reached');
  }

  /** A jagged dark crack in the ground with dust at its end. */
  private crack(x: number, y: number): void {
    if (this.crackCount > 40) return;
    this.crackCount += 1;
    const g = this.cracks;
    g.lineStyle(1, 0x050403, 0.85);
    g.beginPath();
    let cx = x;
    let cy = y;
    g.moveTo(cx, cy);
    const n = 4 + Math.floor(this.rnd() * 4);
    for (let i = 0; i < n; i++) {
      cx += (this.rnd() - 0.3) * 10;
      cy += (this.rnd() - 0.5) * 6;
      g.lineTo(cx, cy);
    }
    g.strokePath();
    dustPuff(this.scene, cx, cy, 0x8a8070);
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), running: this.running, outcome: this.result, cracks: this.crackCount };
  }
}

export function createQuake(ctx: MechanicContext, cfg: QuakeConfig): Quake {
  return new Quake(ctx, cfg);
}
