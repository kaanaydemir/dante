/**
 * `guardian` (bible §7.0; Canto III s6 Charon's oar, Canto V s2 Minos's tail;
 * GDD 2.5 "guardian encounters"): a guardian who strikes the ground on a
 * rhythm. Each blow is telegraphed (a shadow grows where it will land), then
 * falls; Dante caught under it loses a little Resolve and is thrown aside.
 * The guardian never chases and is never hurt: a Force verse that reaches him
 * turns the blow aside (it is wasted), a Still verse slows his rhythm.
 *
 * Config:
 *   actor?: SpeakerId            the guardian (an NPC of the level)
 *   texture?: string; at?: Point a guardian spawned for this mechanic
 *   aim?: 'player' | 'behind'    land on Dante, or just behind him ("whoever lags behind", III 111)
 *   everyMs?: number             a blow this often (default 2600)
 *   telegraphMs?: number         the shadow grows this long (default 900)
 *   radius?: number              size of the blow (default 18)
 *   reach?: number               no blows farther than this from the guardian (default 230)
 *   damage?: number              Resolve per blow (default 1)
 *   knock?: number               how hard it throws Dante (default 200)
 *   area?: Rect | PlaceId        blows only while Dante is inside
 *   deflectEvent?: EventId       a Force verse turned a blow aside (emitted once)
 *   strikeFrame?: string         the guardian's frame for the blow (default 'strike')
 *   auto?: boolean               strike on the rhythm (default true; else call `strike()`)
 *
 * Owner: team D (mechanics).
 */

import type { MechanicContext } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import type { Npc } from '../entities/npc';
import { dist, rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num, type AreaRef, type Point, type Waiter } from './base';
import { dustPuff, GroundMark } from './visuals';

export interface GuardianConfig {
  readonly actor?: SpeakerId;
  readonly texture?: string;
  readonly at?: Point;
  readonly aim?: 'player' | 'behind';
  readonly everyMs?: number;
  readonly telegraphMs?: number;
  readonly radius?: number;
  readonly reach?: number;
  readonly damage?: number;
  readonly knock?: number;
  readonly area?: AreaRef;
  readonly deflectEvent?: EventId;
  readonly strikeFrame?: string;
  readonly auto?: boolean;
}

interface Blow {
  readonly x: number;
  readonly y: number;
  elapsed: number;
  readonly waiter: Waiter<'hit' | 'miss'>;
}

export class Guardian extends BaseMechanic {
  private readonly cfg: GuardianConfig;
  private readonly guard: Npc | null;
  private readonly mark: GroundMark;
  private blow: Blow | null = null;
  private untilNext: number;
  private slowUntil = 0;
  private deflectedUntil = 0;
  private auto: boolean;
  private hits = 0;
  private deflections = 0;

  constructor(ctx: MechanicContext, cfg: GuardianConfig) {
    super('guardian', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.deflectEvent);
    const w = this.w;
    let guard: Npc | null = cfg.actor ? (w?.npcOf(cfg.actor) ?? null) : null;
    if (!guard && w && cfg.texture && cfg.at) {
      guard = w.spawnActor({ id: `guardian-${this.id}`, speaker: cfg.actor ?? null, texture: cfg.texture, x: cfg.at.x, y: cfg.at.y });
    }
    this.guard = guard;
    this.mark = new GroundMark(this.scene);
    this.onDispose(() => this.mark.destroy());
    this.auto = cfg.auto !== false;
    this.untilNext = num(cfg.everyMs, 2600);
  }

  get blows(): number {
    return this.hits;
  }

  start(): void {
    this.auto = true;
  }

  stop(): void {
    this.auto = false;
    this.cancelBlow();
  }

  private origin(): Point {
    const g = this.guard;
    if (g) return { x: g.x, y: g.y };
    return this.cfg.at ?? { x: this.player.x + 60, y: this.player.y };
  }

  /** One telegraphed blow at `at` (default: aimed at Dante). Resolves true when it hit him. */
  strike(at?: Point): Promise<boolean> {
    if (this.blow) return this.blow.waiter.promise.then((r) => r === 'hit');
    const p = this.player;
    let target = at;
    if (!target) {
      if (this.cfg.aim === 'behind') {
        const h = this.w?.dante.heading ?? { x: 1, y: 0 };
        target = { x: p.x - h.x * 14, y: p.y - h.y * 10 };
      } else {
        target = { x: p.x, y: p.y };
      }
    }
    const waiter = this.moment<'hit' | 'miss'>(num(this.cfg.telegraphMs, 900) * 2 + 4000);
    this.blow = { x: target.x, y: target.y, elapsed: 0, waiter };
    if (this.guard) {
      this.guard.actor.faceToward(target.x, target.y);
      this.guard.actor.poseLocked = false;
      this.guard.actor.pose(this.cfg.strikeFrame ?? 'strike');
      this.guard.actor.poseLocked = true;
    }
    return waiter.promise.then((r) => r === 'hit');
  }

  private cancelBlow(): void {
    const b = this.blow;
    this.blow = null;
    this.mark.clear();
    this.releasePose();
    b?.waiter.finish('miss');
  }

  private releasePose(): void {
    if (!this.guard) return;
    this.guard.actor.poseLocked = false;
    this.guard.actor.playIdle();
  }

  protected override step(dt: number): void {
    const w = this.w;
    if (!w) return;
    const p = this.player;
    const area = this.areaOf(this.cfg.area);
    const inside = !area || rectContains(area, p.x, p.y);
    const slow = this.now() < this.slowUntil || w.stilled() ? 0.5 : 1;
    if (this.auto && !this.blow && w.playable() && inside) {
      const o = this.origin();
      if (dist(o.x, o.y, p.x, p.y) <= num(this.cfg.reach, 230)) {
        this.untilNext -= dt * slow;
        if (this.untilNext <= 0) {
          this.untilNext = num(this.cfg.everyMs, 2600);
          void this.strike();
        }
      }
    }
    const b = this.blow;
    if (!b) return;
    if (b.waiter.done) {
      this.cancelBlow();
      return;
    }
    b.elapsed += dt * slow;
    const tele = num(this.cfg.telegraphMs, 900);
    const radius = num(this.cfg.radius, 18);
    this.mark.draw(b.x, b.y, radius, b.elapsed / tele);
    if (b.elapsed < tele) return;
    // The blow lands.
    this.blow = null;
    this.mark.clear();
    dustPuff(this.scene, b.x, b.y + 2);
    void this.level.camera.shake(160, 0.003);
    w.sfx('hurt');
    let hit = false;
    if (this.now() >= this.deflectedUntil && Math.abs(p.x - b.x) <= radius && Math.abs(p.y - b.y) <= radius * 0.7) {
      hit = w.hurt(num(this.cfg.damage, 1), 'guardian', { x: b.x, y: b.y - 6 }, num(this.cfg.knock, 200));
      if (hit) this.hits += 1;
    }
    this.scene.time.delayedCall(260, () => this.releasePose());
    b.waiter.finish(hit ? 'hit' : 'miss');
  }

  override onVerse(cast: VerseCast): void {
    const o = this.origin();
    if (cast.category === 'Force' && (dist(cast.x, cast.y, o.x, o.y) < 110 * Math.max(1, cast.power) || this.blow)) {
      // The blow is turned aside; the guardian's rhythm breaks for a moment.
      this.deflectedUntil = this.now() + 1200;
      this.deflections += 1;
      if (this.blow) this.cancelBlow();
      this.untilNext = Math.max(this.untilNext, 2400 * cast.power);
      this.emitEvent(this.cfg.deflectEvent);
    } else if (cast.category === 'Still') {
      this.slowUntil = this.now() + 4500 * cast.power;
    }
  }

  override onRespawn(): void {
    this.cancelBlow();
    this.untilNext = num(this.cfg.everyMs, 2600) * 1.5;
  }

  override destroy(): void {
    this.cancelBlow();
    super.destroy();
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), auto: this.auto, striking: this.blow !== null, hits: this.hits, deflections: this.deflections };
  }
}

export function createGuardian(ctx: MechanicContext, cfg: GuardianConfig): Guardian {
  return new Guardian(ctx, cfg);
}
