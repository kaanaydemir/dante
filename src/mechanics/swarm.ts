/**
 * `swarm` (bible §7.0, Canto III s3; GDD 4.1 `PatternHazard`): wasps and
 * hornets. Swarms ride above the runners of a crowd (or patrol a loop, or
 * hover round a point); when Dante comes close, a swarm breaks off and chases
 * him for a while, stinging (a little Resolve). A dash's invulnerability and a
 * Ward shield turn the stings aside; a Force verse scatters the swarms near
 * him for a few seconds; a Still verse slows them.
 *
 * Config:
 *   count?: number             swarms (default 3)
 *   size?: number              wasps per swarm (default 6)
 *   follow?: string            id or name of a crowd_flow mechanic to ride above
 *   path?: Point[]             …or a loop to patrol
 *   center?: Point; radius?: number   …or hover round a point (default: round Dante's start)
 *   speed?: number             chase speed px/s (default 52; Dante walks 72)
 *   chaseRadius?: number       break off when Dante is this close (default 60)
 *   chaseMs?: number           a chase lasts this long (default 2600)
 *   restMs?: number            then the swarm rests before it can chase again (default 2600)
 *   damage?: number            Resolve per sting (default 0.4)
 *   area?: Rect | PlaceId      chases only while Dante is inside
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext } from '../runtime/contracts';
import { dist, normalize, rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num, type AreaRef, type Point } from './base';
import { PolyPath } from './logic/path';

export interface SwarmConfig {
  readonly count?: number;
  readonly size?: number;
  readonly follow?: string;
  readonly path?: readonly Point[];
  readonly center?: Point;
  readonly radius?: number;
  readonly speed?: number;
  readonly chaseRadius?: number;
  readonly chaseMs?: number;
  readonly restMs?: number;
  readonly damage?: number;
  readonly area?: AreaRef;
}

type SwarmState = 'ride' | 'chase' | 'return' | 'scattered';

interface OneSwarm {
  x: number;
  y: number;
  state: SwarmState;
  stateMs: number;
  restMs: number;
  readonly anchor: number;
  readonly wasps: { sprite: Phaser.GameObjects.Sprite; phase: number; rx: number; ry: number }[];
}

/** What a swarm can ride on: anything that lists points (a crowd). */
interface PointSource {
  runnerPoints(): Point[];
}

function isPointSource(m: unknown): m is PointSource {
  return typeof m === 'object' && m !== null && typeof (m as PointSource).runnerPoints === 'function';
}

export class Swarm extends BaseMechanic {
  private readonly cfg: SwarmConfig;
  private readonly swarms: OneSwarm[] = [];
  private readonly patrol: PolyPath | null;
  private readonly center: Point;
  private t = 0;
  private slowUntil = 0;
  private stings = 0;
  private stingCooldown = 0;

  constructor(ctx: MechanicContext, cfg: SwarmConfig) {
    super('swarm', ctx, cfg);
    this.cfg = cfg;
    this.patrol = cfg.path && cfg.path.length > 1 ? new PolyPath(cfg.path, true) : null;
    const p = ctx.level.player;
    this.center = cfg.center ?? { x: p.x + 80, y: p.y - 20 };
    const scene = this.scene;
    const count = Math.max(1, Math.round(num(cfg.count, 3)));
    const size = Math.max(1, Math.round(num(cfg.size, 6)));
    const hasTex = scene.textures.exists('fx-wasp');
    for (let i = 0; i < count; i++) {
      const wasps: OneSwarm['wasps'] = [];
      for (let k = 0; k < size && hasTex; k++) {
        const sprite = this.own(scene.add.sprite(this.center.x, this.center.y, 'fx-wasp', '0').setDepth(DEPTH.fx));
        if (scene.anims.exists('fx-wasp-buzz')) sprite.play({ key: 'fx-wasp-buzz', startFrame: k % 3 });
        wasps.push({ sprite, phase: (k / size) * Math.PI * 2 + i, rx: 5 + ((k * 7) % 6), ry: 3 + ((k * 5) % 4) });
      }
      this.swarms.push({ x: this.center.x, y: this.center.y, state: 'ride', stateMs: 0, restMs: 0, anchor: i, wasps });
    }
  }

  private anchorPoint(s: OneSwarm): Point {
    const followId = this.cfg.follow;
    if (followId) {
      const m = this.level.mechanic(followId);
      if (isPointSource(m)) {
        const pts = m.runnerPoints();
        if (pts.length > 0) {
          const i = Math.floor(((s.anchor + 0.5) / this.swarms.length) * pts.length) % pts.length;
          const q = pts[i] as Point;
          return { x: q.x, y: q.y - 26 };
        }
      }
    }
    if (this.patrol) {
      const q = this.patrol.at(this.t * 0.03 + (s.anchor / this.swarms.length) * this.patrol.length);
      return { x: q.x, y: q.y - 18 };
    }
    const r = num(this.cfg.radius, 70);
    const a = this.t / 1400 + (s.anchor / this.swarms.length) * Math.PI * 2;
    return { x: this.center.x + Math.cos(a) * r, y: this.center.y + Math.sin(a) * r * 0.5 - 18 };
  }

  protected override step(dt: number): void {
    this.t += dt;
    this.stingCooldown = Math.max(0, this.stingCooldown - dt);
    const w = this.w;
    const p = this.player;
    const area = this.areaOf(this.cfg.area);
    const inside = !area || rectContains(area, p.x, p.y);
    const playable = w?.playable() ?? false;
    const slow = this.now() < this.slowUntil || (w?.stilled() ?? false) ? 0.35 : 1;
    const chaseSpeed = num(this.cfg.speed, 52) * slow;
    for (const s of this.swarms) {
      s.stateMs -= dt;
      s.restMs = Math.max(0, s.restMs - dt);
      const anchor = this.anchorPoint(s);
      let tx = anchor.x;
      let ty = anchor.y;
      let speed = 90;
      switch (s.state) {
        case 'ride':
          if (playable && inside && s.restMs <= 0 && dist(s.x, s.y, p.x, p.y - 14) < num(this.cfg.chaseRadius, 60)) {
            s.state = 'chase';
            s.stateMs = num(this.cfg.chaseMs, 2600);
          }
          break;
        case 'chase':
          tx = p.x;
          ty = p.y - 14;
          speed = chaseSpeed;
          if (s.stateMs <= 0 || !playable || !inside) {
            s.state = 'return';
            s.restMs = num(this.cfg.restMs, 2600);
          } else if (w && dist(s.x, s.y, p.x, p.y - 14) < 9 && this.stingCooldown <= 0) {
            this.stingCooldown = 650;
            if (w.hurt(num(this.cfg.damage, 0.4), 'swarm', { x: s.x, y: s.y + 14 }, 60)) this.stings += 1;
          }
          break;
        case 'return':
          if (dist(s.x, s.y, anchor.x, anchor.y) < 8) s.state = 'ride';
          break;
        case 'scattered':
          speed = 30;
          if (s.stateMs <= 0) s.state = 'return';
          break;
      }
      const d = dist(s.x, s.y, tx, ty);
      if (d > 0.5) {
        const k = Math.min(d, (speed * dt) / 1000);
        s.x += ((tx - s.x) / d) * k;
        s.y += ((ty - s.y) / d) * k;
      }
      const spread = s.state === 'scattered' ? 4 : 1;
      const alpha = s.state === 'scattered' ? 0.45 : 1;
      for (const wasp of s.wasps) {
        const a = this.t / 160 + wasp.phase;
        wasp.sprite.setPosition(Math.round(s.x + Math.cos(a) * wasp.rx * spread), Math.round(s.y + Math.sin(a * 1.3) * wasp.ry * spread));
        wasp.sprite.setAlpha(alpha);
      }
    }
  }

  override onVerse(cast: VerseCast): void {
    if (cast.category === 'Force') {
      for (const s of this.swarms) {
        if (dist(s.x, s.y, cast.x, cast.y - 14) < 80 * Math.max(1, cast.power)) {
          s.state = 'scattered';
          s.stateMs = 4000 * cast.power;
          const away = normalize(s.x - cast.x, s.y - cast.y);
          s.x += away.x * 30;
          s.y += away.y * 30;
        }
      }
    } else if (cast.category === 'Still') {
      this.slowUntil = this.now() + 4500 * cast.power;
    }
  }

  override onRespawn(): void {
    for (const s of this.swarms) {
      s.state = 'return';
      s.restMs = num(this.cfg.restMs, 2600);
    }
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), swarms: this.swarms.map((s) => s.state), stings: this.stings };
  }
}

export function createSwarm(ctx: MechanicContext, cfg: SwarmConfig): Swarm {
  return new Swarm(ctx, cfg);
}
