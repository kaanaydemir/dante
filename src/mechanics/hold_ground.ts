/**
 * `hold_ground` (bible §7.0; Canto I s4 the lion's roar, Canto III s5
 * Charon's command): a wave of fear rolls out from a source. Whoever walks or
 * dashes while it passes panics (the fear works twice as hard); whoever stands
 * still through a whole wave has held his ground, and the configured event is
 * emitted (once). Nothing on screen states the rule (bible §7.3: the rule is
 * never written).
 *
 * Config:
 *   source?: SpeakerId | Point   who roars / shouts (default: a little ahead of Dante)
 *   event?: EventId               emitted once, after a wave held through
 *   cueMs?: number                length of one wave (default 1800)
 *   everyMs?: number              automatic waves this often (0 = only `cue()`; default 0)
 *   firstMs?: number              delay before the first automatic wave (default everyMs)
 *   maxCues?: number              automatic waves stop after this many (default unlimited)
 *   tolerancePx?: number          movement allowed during a wave (default 3)
 *   awayOnly?: boolean            only movement away from the source counts (stepping back from Charon)
 *   drainPerSecond?: number       fear while a wave passes (default 0.25; doubled for a panicking Dante)
 *   floor?: number                Resolve never falls below this (default 1)
 *   sfx?: SfxName                 default 'roar'
 *   area?: Rect | PlaceId         waves only reach Dante inside this area (default everywhere)
 *
 * Methods: `cue(ms?)` runs one wave and resolves true when Dante held still
 * through it; `held` tells whether any wave was held.
 *
 * Owner: team D (mechanics).
 */

import { DEPTH } from '../config';
import type { MechanicContext, SfxName } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import { dist, normalize, rectContains } from '../world/geometry';
import { BaseMechanic, num, type AreaRef, type Point, type Waiter } from './base';
import { waveRing } from './visuals';

export interface HoldGroundConfig {
  readonly source?: SpeakerId | Point;
  readonly event?: EventId;
  readonly cueMs?: number;
  readonly everyMs?: number;
  readonly firstMs?: number;
  readonly maxCues?: number;
  readonly tolerancePx?: number;
  readonly awayOnly?: boolean;
  readonly drainPerSecond?: number;
  readonly floor?: number;
  readonly sfx?: SfxName;
  readonly area?: AreaRef;
}

interface Wave {
  readonly waiter: Waiter<'held' | 'broken'>;
  readonly origin: Point;
  readonly away: Point;
  readonly ms: number;
  elapsed: number;
  broken: boolean;
}

export class HoldGround extends BaseMechanic {
  private readonly cfg: HoldGroundConfig;
  private readonly cueMs: number;
  private readonly everyMs: number;
  private readonly tolerance: number;
  private readonly rate: number;
  private readonly floor: number;
  private wave: Wave | null = null;
  private untilNext: number;
  private autoCues = 0;
  private heldAny = false;
  private brokenCount = 0;
  private readonly edge: Phaser.GameObjects.Image | null;
  private edgeAlpha = 0;

  constructor(ctx: MechanicContext, cfg: HoldGroundConfig) {
    super('hold_ground', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.event);
    this.cueMs = Math.max(200, num(cfg.cueMs, 1800));
    this.everyMs = Math.max(0, num(cfg.everyMs, 0));
    this.untilNext = num(cfg.firstMs, this.everyMs);
    this.tolerance = Math.max(0, num(cfg.tolerancePx, 3));
    this.rate = Math.max(0, num(cfg.drainPerSecond, 0.25));
    this.floor = num(cfg.floor, 1);
    const s = this.scene;
    this.edge = s.textures.exists('fx-vignette')
      ? this.own(s.add.image(0, 0, 'fx-vignette').setOrigin(0, 0).setDepth(DEPTH.worldOverlay + 3).setAlpha(0).setTint(0x1a0000))
      : null;
  }

  /** Has Dante stood still through at least one wave? */
  get held(): boolean {
    return this.heldAny;
  }

  get waves(): number {
    return this.autoCues;
  }

  private sourcePoint(): Point {
    const src = this.cfg.source;
    if (typeof src === 'string') {
      const a = this.actorOf(src);
      if (a) return { x: a.x, y: a.y - 12 };
    } else if (src) {
      return src;
    }
    const p = this.player;
    return { x: p.x + 60, y: p.y - 20 };
  }

  private inArea(): boolean {
    const area = this.areaOf(this.cfg.area);
    return area ? rectContains(area, this.player.x, this.player.y) : true;
  }

  /** Run one wave. Resolves true when Dante held still through all of it. */
  cue(ms = this.cueMs, signal?: AbortSignal): Promise<boolean> {
    if (this.wave) return this.wave.waiter.promise.then((r) => r === 'held');
    const src = this.sourcePoint();
    const p = this.player;
    const away = normalize(p.x - src.x, p.y - src.y);
    const waiter = this.moment<'held' | 'broken'>(Math.max(ms, 200) + 2000, signal);
    this.wave = { waiter, origin: { x: p.x, y: p.y }, away, ms: Math.max(200, ms), elapsed: 0, broken: false };
    this.w?.sfx(this.cfg.sfx ?? 'roar');
    this.posture(true);
    waveRing(this.scene, src.x, src.y + 10, { radius: 170, ms: Math.max(400, ms * 0.8) });
    void this.level.camera.shake(Math.min(700, ms * 0.4), 0.004);
    return waiter.promise.then((r) => r === 'held');
  }

  protected override step(dt: number): void {
    const w = this.w;
    if (!w) return;
    // Automatic waves.
    if (this.everyMs > 0 && !this.wave && w.playable()) {
      const max = this.cfg.maxCues;
      if (max === undefined || this.autoCues < max) {
        this.untilNext -= dt;
        if (this.untilNext <= 0) {
          this.untilNext = this.everyMs;
          this.autoCues += 1;
          void this.cue();
        }
      }
    }
    const wave = this.wave;
    let target = 0;
    if (wave) {
      wave.elapsed += dt;
      const p = this.player;
      const inside = this.inArea();
      if (inside && w.playable()) {
        // Did he move (or step back, when only stepping back counts)?
        const dx = p.x - wave.origin.x;
        const dy = p.y - wave.origin.y;
        const moved = this.cfg.awayOnly ? dx * wave.away.x + dy * wave.away.y : Math.hypot(dx, dy);
        const dashing = w.dante.dashing;
        const dashedAway = dashing && (!this.cfg.awayOnly || w.dante.heading.x * wave.away.x + w.dante.heading.y * wave.away.y > 0.3);
        if (moved > this.tolerance || dashedAway) wave.broken = true;
        const panic = wave.broken ? 2 : 1;
        if (this.rate > 0) w.drain(this.rate * panic, dt, 'fear', this.floor);
        target = wave.broken ? 0.9 : 0.55;
      }
      if (wave.elapsed >= wave.ms) {
        this.wave = null;
        this.posture(false);
        const ok = !wave.broken && inside;
        if (ok) {
          this.heldAny = true;
          this.emitEvent(this.cfg.event);
        } else {
          this.brokenCount += 1;
        }
        wave.waiter.finish(ok ? 'held' : 'broken');
      }
    }
    // The edges of the view darken while the wave passes.
    this.edgeAlpha += (target - this.edgeAlpha) * Math.min(1, dt / 250);
    if (this.edge) {
      const v = this.scene.cameras.main.worldView;
      this.edge.setPosition(v.x, v.y).setDisplaySize(v.width, v.height).setAlpha(this.edgeAlpha);
    }
  }

  /** The source shows its roar (a `<dir>-roar` frame, when its drawing has one). */
  private posture(on: boolean): void {
    const src = this.cfg.source;
    if (typeof src !== 'string') return;
    const npc = this.w?.npcOf(src);
    if (!npc) return;
    const a = npc.actor;
    if (on) {
      const frame = `${a.facing === 'left' ? 'left' : 'right'}-roar`;
      a.poseLocked = false;
      if (a.pose(frame)) a.poseLocked = true;
    } else {
      a.poseLocked = false;
      a.playIdle();
    }
  }

  override onRespawn(): void {
    if (this.wave) {
      this.wave.waiter.finish('broken');
      this.wave = null;
    }
  }

  override debugInfo(): Record<string, unknown> {
    const src = this.sourcePoint();
    return {
      ...super.debugInfo(),
      waving: this.wave !== null,
      held: this.heldAny,
      broken: this.brokenCount,
      autoCues: this.autoCues,
      sourceDistance: Math.round(dist(src.x, src.y, this.player.x, this.player.y)),
    };
  }
}

export function createHoldGround(ctx: MechanicContext, cfg: HoldGroundConfig): HoldGround {
  return new HoldGround(ctx, cfg);
}
