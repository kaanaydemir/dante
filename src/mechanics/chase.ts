/**
 * `chase` (bible §7.0, Canto I): the escape sequences. Three modes:
 *
 * - `pursue`: something follows Dante (the creeping shadow at the wood's
 *   edge, I s1). Touching it hurts; after a few catches it slows down (the
 *   script: "being caught here is not an end").
 * - `block`: a beast keeps itself between Dante and a goal (the panther
 *   always in front of him, I 34–36), sliding across his way; touching it
 *   turns him back with a little fear.
 * - `lunge`: a beast paces, then marks a line in the dust and charges along
 *   it (the lion, I 44–48); a dash sideways makes it miss.
 *
 * Beasts are never hurt (bible §0.4 rule 5): a Force verse only stuns them, a
 * Still verse slows them.
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext, Rect } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import type { Npc } from '../entities/npc';
import { clamp, dist, normalize, rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num, type Waiter } from './base';

export interface ChaseConfig {
  readonly mode: 'pursue' | 'block' | 'lunge';
  /** The beast (an NPC of the level, or spawned with `texture`). */
  readonly actor?: SpeakerId;
  readonly texture?: string;
  readonly start?: { readonly x: number; readonly y: number };
  readonly speed?: number;
  readonly damage?: number;
  /** pursue: the chase ends when Dante enters this area. */
  readonly safe?: Rect;
  /** pursue: emitted once when Dante reaches `safe`. */
  readonly escapedEvent?: EventId;
  /** block: the point the beast denies (the hilltop). */
  readonly goal?: { readonly x: number; readonly y: number };
  /** block: how far in front of Dante, toward the goal, the beast stands. */
  readonly gap?: number;
  /** block / lunge: the beast stays inside this area. */
  readonly area?: Rect;
  /** lunge: time between charges, the telegraph, the charge's speed and length. */
  readonly everyMs?: number;
  readonly telegraphMs?: number;
  readonly lungeSpeed?: number;
  readonly lungeMs?: number;
  /** lunge: charge on its own rhythm (default true); false = only when `lungeOnce()` is called. */
  readonly auto?: boolean;
  /** Start hidden and switched off (a level reveals it with `show(true)` and `enabled = true`). */
  readonly hidden?: boolean;
}

type LungeState = 'pace' | 'mark' | 'charge' | 'recover';

export class Chase extends BaseMechanic {
  readonly mode: ChaseConfig['mode'];
  private readonly beast: Npc | null;
  private readonly shadow: Phaser.GameObjects.Image | null = null;
  private pos: { x: number; y: number };
  private readonly speed: number;
  private readonly damage: number;
  private readonly cfg: ChaseConfig;
  private catches = 0;
  private stunnedUntil = 0;
  private slowUntil = 0;
  private escaped = false;
  // lunge state
  private state: LungeState = 'pace';
  private stateMs = 0;
  private lungeDir = { x: 1, y: 0 };
  private paceDir = 1;
  private readonly mark: Phaser.GameObjects.Graphics;
  private touchCooldown = 0;
  private scripted: Waiter<'done'> | null = null;
  private lunges = 0;

  constructor(ctx: MechanicContext, cfg: ChaseConfig) {
    super('chase', ctx, cfg);
    this.cfg = cfg;
    this.mode = cfg.mode;
    if (cfg.escapedEvent) this.emits = [cfg.escapedEvent];
    this.speed = num(cfg.speed, cfg.mode === 'pursue' ? 52 : cfg.mode === 'block' ? 95 : 40);
    this.damage = num(cfg.damage, cfg.mode === 'block' ? 0.3 : 1);
    const start = cfg.start ?? { x: ctx.level.player.x - 120, y: ctx.level.player.y };
    this.pos = { ...start };
    const w = this.w;
    let beast: Npc | null = null;
    if (cfg.actor) beast = w?.npcOf(cfg.actor) ?? null;
    if (!beast && (cfg.texture || cfg.actor) && w) {
      beast = w.spawnActor({
        id: `${(cfg.actor ?? 'beast').toLowerCase()}-${this.id}`,
        speaker: cfg.actor ?? null,
        texture: cfg.texture ?? `npc-${(cfg.actor ?? 'generic').toLowerCase()}`,
        x: start.x,
        y: start.y,
      });
    }
    this.beast = beast;
    if (beast) this.pos = { x: beast.x, y: beast.y };
    else if (cfg.mode === 'pursue' && this.scene.textures.exists('fx-glow')) {
      // A creeping shadow: a dark, breathing stain.
      this.shadow = this.own(
        this.scene.add.image(start.x, start.y, 'fx-glow').setTint(0x000000).setDepth(DEPTH.fxBelow).setDisplaySize(90, 60).setAlpha(0.85),
      );
    }
    this.mark = this.own(this.scene.add.graphics().setDepth(DEPTH.groundDecor + 2));
    if (cfg.hidden) {
      this.show(false);
      this.enabled = false;
    }
  }


  private slowed(): number {
    const stilled = this.w?.stilled() ?? false;
    return this.now() < this.slowUntil || stilled ? 0.35 : 1;
  }

  protected override step(dt: number): void {
    if (!this.w) return;
    this.touchCooldown = Math.max(0, this.touchCooldown - dt);
    if (this.now() < this.stunnedUntil) {
      this.beast?.actor.playIdle();
      return;
    }
    switch (this.mode) {
      case 'pursue':
        this.updatePursue(dt);
        break;
      case 'block':
        this.updateBlock(dt);
        break;
      case 'lunge':
        this.updateLunge(dt);
        break;
    }
  }

  private moveBeast(x: number, y: number): void {
    const area = this.cfg.area;
    if (area) {
      x = clamp(x, area.x, area.x + area.w);
      y = clamp(y, area.y, area.y + area.h);
    }
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    this.pos = { x, y };
    if (this.beast) {
      this.beast.actor.setPosition(x, y);
      if (Math.hypot(dx, dy) > 0.05) this.beast.actor.playWalk(dx, dy);
      else this.beast.actor.playIdle();
    }
    if (this.shadow) {
      this.shadow.setPosition(x, y - 10);
      this.shadow.setDisplaySize(90 + Math.sin(this.now() / 200) * 8, 60 + Math.cos(this.now() / 260) * 6);
    }
  }

  private updatePursue(dt: number): void {
    const w = this.w;
    if (!w) return;
    const p = this.level.player;
    if (this.cfg.safe && rectContains(this.cfg.safe, p.x, p.y)) {
      if (!this.escaped) {
        this.escaped = true;
        if (this.cfg.escapedEvent) this.emitEvent(this.cfg.escapedEvent);
      }
      // The shadow falls back into the wood.
      const away = normalize(this.pos.x - p.x, this.pos.y - p.y);
      this.moveBeast(this.pos.x + away.x * this.speed * 0.5 * (dt / 1000), this.pos.y + away.y * this.speed * 0.5 * (dt / 1000));
      this.shadow?.setAlpha(Math.max(0, (this.shadow.alpha ?? 0.85) - dt / 2000));
      return;
    }
    if (!w.playable()) return;
    const slowBy = Math.max(0.45, 1 - this.catches * 0.18);
    const d = normalize(p.x - this.pos.x, p.y - this.pos.y);
    const step = (this.speed * slowBy * this.slowed() * dt) / 1000;
    this.moveBeast(this.pos.x + d.x * step, this.pos.y + d.y * step);
    if (dist(this.pos.x, this.pos.y, p.x, p.y) < 18 && this.touchCooldown <= 0) {
      if (w.hurt(this.damage, 'chase', this.pos, 170)) {
        this.catches += 1;
        this.touchCooldown = 900;
        // Thrown clear: the shadow draws back a little.
        const back = normalize(this.pos.x - p.x, this.pos.y - p.y);
        this.moveBeast(this.pos.x + back.x * 40, this.pos.y + back.y * 40);
      }
    }
  }

  private updateBlock(dt: number): void {
    const w = this.w;
    const goal = this.cfg.goal;
    if (!w || !goal) return;
    const p = this.level.player;
    // Stand on the line from Dante to the goal, `gap` px in front of him.
    const d = normalize(goal.x - p.x, goal.y - p.y);
    const gap = num(this.cfg.gap, 34);
    const tx = p.x + d.x * gap;
    const ty = p.y + d.y * gap;
    const dx = tx - this.pos.x;
    const dy = ty - this.pos.y;
    const len = Math.hypot(dx, dy);
    const step = Math.min(len, (this.speed * this.slowed() * dt) / 1000);
    if (len > 0.5) this.moveBeast(this.pos.x + (dx / len) * step, this.pos.y + (dy / len) * step);
    else this.beast?.actor.playIdle();
    this.beast?.actor.face(p.x < this.pos.x ? 'left' : 'right');
    if (dist(this.pos.x, this.pos.y, p.x, p.y) < 20 && this.touchCooldown <= 0 && w.playable()) {
      this.touchCooldown = 700;
      // Turned back toward the wood (I 36): a shove away from the goal and a little fear.
      w.hurt(this.damage, 'panther', this.pos, 190);
      w.dante.actor.face(d.x > 0 ? 'left' : 'right');
    }
  }

  private updateLunge(dt: number): void {
    const w = this.w;
    if (!w) return;
    const p = this.level.player;
    this.stateMs -= dt;
    const every = num(this.cfg.everyMs, 3600);
    const tele = num(this.cfg.telegraphMs, 700);
    const lungeSpeed = num(this.cfg.lungeSpeed, 210);
    const lungeMs = num(this.cfg.lungeMs, 650);
    switch (this.state) {
      case 'pace': {
        const area = this.cfg.area;
        const step = (this.speed * this.slowed() * dt) / 1000;
        let nx = this.pos.x + this.paceDir * step;
        if (area && (nx < area.x + 8 || nx > area.x + area.w - 8)) {
          this.paceDir *= -1;
          nx = this.pos.x + this.paceDir * step;
        }
        this.moveBeast(nx, this.pos.y);
        if (this.cfg.auto !== false && this.stateMs <= 0 && w.playable() && dist(this.pos.x, this.pos.y, p.x, p.y) < 200) this.beginLunge(tele);
        break;
      }
      case 'mark': {
        // The charge's line shows in the dust a moment before (inf01 s4).
        this.mark.clear();
        this.mark.lineStyle(2, 0xd8ccb0, 0.25 + 0.35 * Math.abs(Math.sin(this.now() / 90)));
        this.mark.lineBetween(this.pos.x, this.pos.y - 2, this.pos.x + this.lungeDir.x * lungeSpeed * (lungeMs / 1000), this.pos.y - 2 + this.lungeDir.y * lungeSpeed * (lungeMs / 1000));
        if (this.stateMs <= 0) {
          this.mark.clear();
          this.state = 'charge';
          this.stateMs = lungeMs;
          this.w?.sfx('roar');
        }
        break;
      }
      case 'charge': {
        const step = (lungeSpeed * this.slowed() * dt) / 1000;
        this.moveBeast(this.pos.x + this.lungeDir.x * step, this.pos.y + this.lungeDir.y * step);
        if (dist(this.pos.x, this.pos.y, p.x, p.y) < 18 && this.touchCooldown <= 0) {
          if (w.hurt(this.damage, 'lunge', this.pos, 220)) this.touchCooldown = 900;
        }
        if (this.stateMs <= 0) {
          this.state = 'recover';
          this.stateMs = 900;
        }
        break;
      }
      case 'recover': {
        this.beast?.actor.playIdle();
        if (this.stateMs <= 0) {
          this.state = 'pace';
          this.stateMs = every;
          if (this.scripted) {
            this.scripted.finish('done');
            this.scripted = null;
          }
        }
        break;
      }
    }
  }

  private beginLunge(teleMs: number): void {
    const p = this.level.player;
    this.state = 'mark';
    this.stateMs = teleMs;
    this.lunges += 1;
    this.lungeDir = normalize(p.x - this.pos.x, p.y - this.pos.y);
    this.beast?.actor.face(this.lungeDir.x < 0 ? 'left' : 'right');
    this.beast?.actor.pose(`${this.lungeDir.x < 0 ? 'left' : 'right'}-lunge`);
  }

  /** lunge mode: mark the line now and charge once; resolves when the beast has recovered. Always settles. */
  lungeOnce(): Promise<void> {
    if (this.mode !== 'lunge') return Promise.resolve();
    if (this.scripted) return this.scripted.promise.then(() => undefined);
    const tele = num(this.cfg.telegraphMs, 700);
    const waiter = this.moment<'done'>(tele + num(this.cfg.lungeMs, 650) + 900 + 4000);
    this.scripted = waiter;
    this.enabled = true;
    this.stunnedUntil = 0;
    this.beginLunge(tele);
    return waiter.promise.then(() => {
      if (this.scripted === waiter) this.scripted = null;
    });
  }

  /** Show or hide the beast (or the creeping shadow) without stopping the mechanic. */
  show(on: boolean): void {
    this.beast?.setVisible(on);
    this.shadow?.setVisible(on);
    if (!on) this.mark.clear();
  }

  /** Charges so far. */
  get lungeCount(): number {
    return this.lunges;
  }

  /** Move the beast (scripted: a level places it, the mechanic keeps it there). */
  placeAt(x: number, y: number): void {
    this.moveBeast(x, y);
  }

  override onVerse(cast: VerseCast): void {
    const near = dist(cast.x, cast.y, this.pos.x, this.pos.y) < 70 * Math.max(1, cast.power);
    if (cast.category === 'Force' && near) {
      this.stunnedUntil = this.now() + 1800 * cast.power;
      const away = normalize(this.pos.x - cast.x, this.pos.y - cast.y);
      this.moveBeast(this.pos.x + away.x * 26, this.pos.y + away.y * 26);
      this.state = 'recover';
      this.stateMs = 1200;
      this.mark.clear();
    } else if (cast.category === 'Still') {
      this.slowUntil = this.now() + 4000 * cast.power;
    }
  }

  /** Stop / restart from outside (a hook calls this when the beast withdraws). */
  stand(): void {
    this.enabled = false;
    this.mark.clear();
    this.beast?.actor.playIdle();
    if (this.scripted) {
      this.scripted.finish('done');
      this.scripted = null;
    }
  }

  override onRespawn(): void {
    const s = this.cfg.start;
    if (this.mode === 'pursue' && s) this.moveBeast(s.x, s.y);
    this.state = 'pace';
    this.stateMs = num(this.cfg.everyMs, 3600);
  }

  get position(): { x: number; y: number } {
    return { ...this.pos };
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), mode: this.mode, catches: this.catches, state: this.state, x: Math.round(this.pos.x), y: Math.round(this.pos.y) };
  }
}

export function createChase(ctx: MechanicContext, cfg: ChaseConfig): Chase {
  return new Chase(ctx, cfg);
}
