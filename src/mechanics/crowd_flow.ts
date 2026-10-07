/**
 * `crowd_flow` (bible §7.0, Canto III s3; GDD 4.1 `PatternHazard`): the
 * runners behind the banner. A pale banner travels a closed loop and a long
 * line of the Neutrals runs after it; where the loop bends, the line swings
 * after the banner, and every few runners the line thins into a gap. Dante
 * caught by the line is dragged along with it for a few tiles; a dash slips
 * through (its brief invulnerability). Nobody is hurt.
 *
 * Config:
 *   path: Point[]               the banner's loop (closed), world px
 *   speed?: number              banner speed, px/s (default 46)
 *   runners?: number            length of the line (default 24)
 *   spacing?: number            px between runners (default 11)
 *   gapEvery?: number           a gap after this many runners (default 6)
 *   gapLength?: number          runner slots left empty in a gap (default 2)
 *   radius?: number             contact reach (default 9)
 *   drag?: number               how far the line throws Dante along it (default 54)
 *   damage?: number             Resolve per collision (default 0)
 *   turnEvent?: EventId         emitted once, the first time the banner turns a corner Dante can see
 *   texture?: string            runner texture (default npc-neutral)
 *   banner?: boolean            carry the banner at the head (default true)
 *   area?: Rect | PlaceId       collisions only while Dante is inside
 *
 * Other mechanics read `runnerPoints()` (the swarms ride above the runners).
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { actorDepth } from '../config';
import type { MechanicContext } from '../runtime/contracts';
import type { EventId } from '../story/types';
import { dist, rectContains } from '../world/geometry';
import { BaseMechanic, num, type AreaRef, type Point } from './base';
import { PolyPath, type PathPoint } from './logic/path';
import { dustPuff } from './visuals';

export interface CrowdFlowConfig {
  readonly path: readonly Point[];
  readonly speed?: number;
  readonly runners?: number;
  readonly spacing?: number;
  readonly gapEvery?: number;
  readonly gapLength?: number;
  readonly radius?: number;
  readonly drag?: number;
  readonly damage?: number;
  readonly turnEvent?: EventId;
  readonly texture?: string;
  readonly banner?: boolean;
  readonly area?: AreaRef;
}

interface Runner {
  readonly sprite: Phaser.GameObjects.Sprite | null;
  readonly offset: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: 'left' | 'right';
}

export class CrowdFlow extends BaseMechanic {
  private readonly cfg: CrowdFlowConfig;
  private readonly path: PolyPath;
  private readonly runners: Runner[] = [];
  private readonly banner: Phaser.GameObjects.Sprite | null;
  private s = 0;
  private speed: number;
  private lastSegment = -1;
  private turns = 0;
  private touchCooldown = 0;
  private hits = 0;

  constructor(ctx: MechanicContext, cfg: CrowdFlowConfig) {
    super('crowd_flow', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.turnEvent);
    this.path = new PolyPath(cfg.path ?? [], true);
    this.speed = Math.max(4, num(cfg.speed, 46));
    const scene = this.scene;
    const texture = cfg.texture ?? 'npc-neutral';
    const count = Math.max(1, Math.round(num(cfg.runners, 24)));
    const spacing = Math.max(4, num(cfg.spacing, 11));
    const gapEvery = Math.max(1, Math.round(num(cfg.gapEvery, 6)));
    const gapLength = Math.max(0, Math.round(num(cfg.gapLength, 2)));
    let slot = 1;
    for (let i = 0; i < count; i++) {
      if (i > 0 && i % gapEvery === 0) slot += gapLength;
      const sprite = scene.textures.exists(texture) ? this.own(scene.add.sprite(0, 0, texture, 'right-1').setOrigin(0.5, 1)) : null;
      this.runners.push({ sprite, offset: slot * spacing, x: 0, y: 0, tx: 1, ty: 0, dir: 'right' });
      slot += 1;
    }
    this.banner =
      cfg.banner !== false && scene.textures.exists('prop-banner')
        ? this.own(scene.add.sprite(0, 0, 'prop-banner', '0').setOrigin(0.5, 1))
        : null;
    if (this.banner && scene.anims.exists('prop-banner-wave')) this.banner.play('prop-banner-wave');
    this.place(0);
  }

  /** Positions of the runners now (swarms ride above them). */
  runnerPoints(): Point[] {
    return this.runners.map((r) => ({ x: r.x, y: r.y }));
  }

  /** Where the banner is now. */
  bannerPoint(): Point {
    const p = this.path.at(this.s);
    return { x: p.x, y: p.y };
  }

  /** Change the pace (a level may hurry the line). */
  setSpeed(pxPerSecond: number): void {
    this.speed = Math.max(4, pxPerSecond);
  }

  private place(dt: number): void {
    this.s += (this.speed * dt) / 1000;
    if (this.path.length > 0 && this.s > this.path.length * 1000) this.s -= this.path.length * 1000;
    const head = this.path.at(this.s);
    if (this.banner) {
      this.banner.setPosition(Math.round(head.x), Math.round(head.y - 10));
      this.banner.setDepth(actorDepth(head.y) + 0.0001);
    }
    if (this.lastSegment !== head.segment) {
      if (this.lastSegment >= 0) this.onTurn(head);
      this.lastSegment = head.segment;
    }
    for (const r of this.runners) {
      const p = this.path.at(this.s - r.offset);
      r.x = p.x;
      r.y = p.y;
      r.tx = p.tx;
      r.ty = p.ty;
      const dir = p.tx < -0.05 ? 'left' : p.tx > 0.05 ? 'right' : r.dir;
      if (r.sprite) {
        r.sprite.setPosition(Math.round(p.x), Math.round(p.y));
        r.sprite.setDepth(actorDepth(p.y));
        if (dir !== r.dir || !r.sprite.anims.isPlaying) {
          const key = `npc-neutral-run-${dir}`;
          if (this.scene.anims.exists(key)) r.sprite.play({ key, startFrame: Math.floor(Math.random() * 2) }, true);
        }
      }
      r.dir = dir;
    }
  }

  private onTurn(head: PathPoint): void {
    this.turns += 1;
    // The banner turns where Dante can see it (or anywhere when he is close to the line).
    const v = this.scene.cameras.main.worldView;
    if (this.cfg.turnEvent && (v.contains(head.x, head.y) || dist(head.x, head.y, this.player.x, this.player.y) < 260)) {
      this.emitEvent(this.cfg.turnEvent);
    }
  }

  protected override step(dt: number): void {
    this.place(dt);
    const w = this.w;
    if (!w) return;
    this.touchCooldown = Math.max(0, this.touchCooldown - dt);
    if (!w.playable() || this.touchCooldown > 0) return;
    const p = this.player;
    const area = this.areaOf(this.cfg.area);
    if (area && !rectContains(area, p.x, p.y)) return;
    if (w.dante.dashing || w.dante.invulnerable) return;
    const radius = num(this.cfg.radius, 9);
    for (const r of this.runners) {
      if (Math.abs(r.x - p.x) > radius || Math.abs(r.y - p.y) > radius * 0.8) continue;
      // Caught: dragged along with the line.
      const drag = num(this.cfg.drag, 54);
      w.dante.knock(r.tx * drag * 4.4, r.ty * drag * 4.4, 260);
      w.dante.grantInvulnerability(450);
      dustPuff(this.scene, p.x, p.y);
      const damage = num(this.cfg.damage, 0);
      if (damage > 0) this.level.store.adjustResolve(-damage, 'crowd');
      w.sfx('step');
      this.hits += 1;
      this.touchCooldown = 520;
      break;
    }
  }

  override debugInfo(): Record<string, unknown> {
    const b = this.bannerPoint();
    return { ...super.debugInfo(), banner: { x: Math.round(b.x), y: Math.round(b.y) }, turns: this.turns, hits: this.hits, runners: this.runners.length };
  }
}

export function createCrowdFlow(ctx: MechanicContext, cfg: CrowdFlowConfig): CrowdFlow {
  return new CrowdFlow(ctx, cfg);
}
