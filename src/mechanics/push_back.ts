/**
 * `push_back` (bible §7.0, Canto I s5 the she-wolf; GDD 4.0 "the she-wolf
 * cannot be passed"): an unwinnable push. A beast walks at Dante step by slow
 * step; every step shoves him back along `dir` and makes him heavier. After
 * `fallAfter` steps he stumbles and falls back down (`fallPx`), and the beast
 * stops and waits above. She never touches him and never hurts him; Resolve
 * never falls below `floor` (no faint here, bible §7.1).
 *
 * Config:
 *   actor?: SpeakerId            the beast (an NPC of the level), or
 *   texture?: string + start?: Point   a beast spawned for this mechanic
 *   dir?: Point                  the way Dante is pushed (default: away from the beast)
 *   stepMs?: number              one step of hers this often (default 1400)
 *   stepPx?: number              how far one step shoves him (default 14)
 *   gap?: number                 she keeps this far from him (default 30)
 *   slowPerStep?: number         he gets this much heavier per step (default 0.06, floor 0.45)
 *   fallAfter?: number           steps before the fall (default 6; 0 = never)
 *   fallPx?: number              length of the tumble (default 64)
 *   fallEvent?: EventId          emitted (repeatable) at each fall
 *   drainPerStep?: number        Resolve per step (default 0.15)
 *   floor?: number               Resolve floor (default 1)
 *   area?: Rect | PlaceId        she only advances while Dante is inside
 *   auto?: boolean               start pushing at once (default true; else call `start()`)
 *
 * Methods: `start()`, `stop()`, `push(steps?)` (resolves after the fall).
 *
 * Owner: team D (mechanics).
 */

import type { MechanicContext } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import type { Npc } from '../entities/npc';
import { clamp, normalize, rectContains } from '../world/geometry';
import { BaseMechanic, num, type AreaRef, type Point, type Waiter } from './base';
import { dustPuff } from './visuals';

export interface PushBackConfig {
  readonly actor?: SpeakerId;
  readonly texture?: string;
  readonly start?: Point;
  readonly dir?: Point;
  readonly stepMs?: number;
  readonly stepPx?: number;
  readonly gap?: number;
  readonly slowPerStep?: number;
  readonly fallAfter?: number;
  readonly fallPx?: number;
  readonly fallEvent?: EventId;
  readonly drainPerStep?: number;
  readonly floor?: number;
  readonly area?: AreaRef;
  readonly auto?: boolean;
}

export class PushBack extends BaseMechanic {
  private readonly cfg: PushBackConfig;
  private readonly beast: Npc | null;
  private pushing: boolean;
  private untilStep: number;
  private steps = 0;
  private falls = 0;
  private heaviness = 1;
  private busy = false;
  private waiter: Waiter<'fell'> | null = null;
  private stepsGoal = 0;

  constructor(ctx: MechanicContext, cfg: PushBackConfig) {
    super('push_back', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.fallEvent);
    const w = this.w;
    let beast: Npc | null = cfg.actor ? (w?.npcOf(cfg.actor) ?? null) : null;
    if (!beast && w && (cfg.texture || cfg.actor)) {
      const p = this.player;
      const start = cfg.start ?? { x: p.x + 80, y: p.y - 30 };
      beast = w.spawnActor({
        id: `${(cfg.actor ?? 'beast').toLowerCase()}-${this.id}`,
        speaker: cfg.actor ?? null,
        texture: cfg.texture ?? `npc-${(cfg.actor ?? 'she_wolf').toLowerCase()}`,
        x: start.x,
        y: start.y,
      });
    }
    this.beast = beast;
    this.pushing = cfg.auto !== false;
    this.untilStep = num(cfg.stepMs, 1400);
  }

  get stepCount(): number {
    return this.steps;
  }

  get fallCount(): number {
    return this.falls;
  }

  start(): void {
    this.pushing = true;
    this.untilStep = num(this.cfg.stepMs, 1400) * 0.5;
  }

  stop(): void {
    this.pushing = false;
    this.heaviness = 1;
    this.beast?.actor.playIdle();
  }

  /** Push until the next fall (or `steps` steps); resolves when he has fallen. Bounded in time. */
  push(steps?: number, signal?: AbortSignal): Promise<'fell' | 'timeout' | 'aborted'> {
    this.start();
    this.stepsGoal = steps ?? Math.max(1, num(this.cfg.fallAfter, 6));
    const stepMs = num(this.cfg.stepMs, 1400);
    const waiter = this.moment<'fell'>(stepMs * (this.stepsGoal + 3) + 4000, signal);
    this.waiter = waiter;
    return waiter.promise;
  }

  private dir(): Point {
    const d = this.cfg.dir;
    if (d) return normalize(d.x, d.y);
    const b = this.beast;
    const p = this.player;
    return b ? normalize(p.x - b.x, p.y - b.y) : { x: -1, y: 0 };
  }

  protected override step(dt: number): void {
    const w = this.w;
    if (!w) return;
    // He is heavier the closer she has come (cleared when she stops).
    if (this.pushing && this.heaviness < 1) w.slow(this.heaviness);
    if (!this.pushing || this.busy || !w.playable()) return;
    const area = this.areaOf(this.cfg.area);
    const p = this.player;
    if (area && !rectContains(area, p.x, p.y)) return;
    this.untilStep -= dt;
    // Between steps she closes in slowly to her keeping distance.
    const b = this.beast;
    const d = this.dir();
    const gap = num(this.cfg.gap, 30);
    if (b) {
      const tx = p.x - d.x * gap;
      const ty = p.y - d.y * gap;
      const dx = tx - b.x;
      const dy = ty - b.y;
      const len = Math.hypot(dx, dy);
      const speed = 22 * (dt / 1000);
      if (len > 1) {
        b.actor.setPosition(b.x + (dx / len) * Math.min(len, speed), b.y + (dy / len) * Math.min(len, speed));
        b.actor.playWalk(dx, dy);
      } else {
        b.actor.face(p.x < b.x ? 'left' : 'right');
        b.actor.playIdle();
      }
    }
    if (this.untilStep > 0) return;
    this.untilStep = num(this.cfg.stepMs, 1400);
    this.takeStep(d);
  }

  private takeStep(d: Point): void {
    const w = this.w;
    if (!w) return;
    this.steps += 1;
    const stepPx = num(this.cfg.stepPx, 14);
    // A shove, not a blow: a short knock along the push direction.
    w.dante.knock(d.x * stepPx * 4.2, d.y * stepPx * 4.2, 240);
    this.heaviness = clamp(this.heaviness - num(this.cfg.slowPerStep, 0.06), 0.45, 1);
    const drain = num(this.cfg.drainPerStep, 0.15);
    if (drain > 0) {
      const floor = num(this.cfg.floor, 1);
      const r = this.level.store.state.resolve;
      if (r - drain > floor) this.level.store.adjustResolve(-drain, 'push_back');
      else if (r > floor) this.level.store.adjustResolve(-(r - floor), 'push_back');
    }
    w.sfx('step');
    if (this.beast) dustPuff(this.scene, this.beast.x, this.beast.y);
    const fallAfter = this.stepsGoal > 0 ? this.stepsGoal : num(this.cfg.fallAfter, 6);
    if (fallAfter > 0 && this.steps % fallAfter === 0) void this.fall(d);
  }

  /** The tumble: Dante is thrown down `fallPx` and lies a moment; she stops above. */
  private async fall(d: Point): Promise<void> {
    const w = this.w;
    if (!w || this.busy) return;
    this.busy = true;
    const unlock = w.lock('push_back-fall');
    try {
      const fallPx = num(this.cfg.fallPx, 64);
      const p = this.player;
      dustPuff(this.scene, p.x, p.y);
      w.dante.setPose('faint');
      const tx = p.x + d.x * fallPx;
      const ty = p.y + d.y * fallPx;
      await Promise.race([p.moveTo(tx, ty, { speed: 150 }), this.level.wait(900)]);
      p.teleport(p.x, p.y);
      dustPuff(this.scene, p.x, p.y);
      void this.level.camera.shake(220, 0.003);
      await this.level.wait(700);
      if (!this.destroyed) w.dante.clearPose();
    } finally {
      unlock();
      this.busy = false;
    }
    this.falls += 1;
    this.heaviness = 1;
    this.emitEvent(this.cfg.fallEvent, false);
    if (this.waiter && !this.waiter.done) {
      this.waiter.finish('fell');
      this.waiter = null;
      this.stepsGoal = 0;
      this.pushing = false;
    }
  }

  override onRespawn(): void {
    this.heaviness = 1;
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), pushing: this.pushing, steps: this.steps, falls: this.falls, heaviness: Math.round(this.heaviness * 100) / 100 };
  }
}

export function createPushBack(ctx: MechanicContext, cfg: PushBackConfig): PushBack {
  return new PushBack(ctx, cfg);
}
