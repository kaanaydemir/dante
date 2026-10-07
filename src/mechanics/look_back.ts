/**
 * `look_back` (bible §7.0, Inferno I 22–27): hold the look-back key (R / pad
 * RB) and Dante turns to gaze at the pass behind him; the camera peeks that
 * way. Holding long enough emits the configured event once (it opens an
 * optional beat; it is never rewarded).
 *
 * Config:
 *   event?: EventId       emitted after `holdMs` of looking back
 *   holdMs?: number       default 1200
 *   where?: Rect | PlaceId  only here (default anywhere)
 *   dir?: Facing          where "back" is (default 'left')
 *   peek?: number         camera offset in px while looking (default 70)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Facing, MechanicContext, Rect } from '../runtime/contracts';
import type { EventId, PlaceId } from '../story/types';
import { rectContains } from '../world/geometry';
import { BaseMechanic, num } from './base';

export interface LookBackConfig {
  readonly event?: EventId;
  readonly holdMs?: number;
  readonly where?: Rect | PlaceId;
  readonly dir?: Facing;
  readonly peek?: number;
}

export class LookBack extends BaseMechanic {
  private readonly event: EventId | null;
  private readonly holdMs: number;
  private readonly where: Rect | null;
  private readonly dir: Facing;
  private readonly peek: number;
  private held = 0;
  private done = false;
  private looking = false;
  private readonly prompt: Phaser.GameObjects.Image | null;
  private readonly ring: Phaser.GameObjects.Graphics;

  constructor(ctx: MechanicContext, cfg: LookBackConfig) {
    super('look_back', ctx);
    this.event = cfg.event ?? null;
    if (this.event) this.emits = [this.event];
    this.holdMs = num(cfg.holdMs, 1200);
    const where = cfg.where;
    this.where = typeof where === 'string' ? ctx.level.place(where) : where ?? null;
    this.dir = cfg.dir ?? 'left';
    this.peek = num(cfg.peek, 70);
    const s = this.scene;
    this.prompt = s.textures.exists('prop-key-r') ? this.own(s.add.image(0, 0, 'prop-key-r').setDepth(DEPTH.fx).setVisible(false)) : null;
    this.ring = this.own(s.add.graphics().setDepth(DEPTH.fx));
  }

  private inArea(): boolean {
    const p = this.level.player;
    return this.where ? rectContains(this.where, p.x, p.y) : true;
  }

  override update(dt: number): void {
    const w = this.w;
    if (!w) return;
    const here = this.inArea() && w.playable();
    const holding = here && w.lookBackHeld() && !w.movedThisFrame();
    const cam = this.scene.cameras.main;
    if (holding) {
      if (!this.looking) {
        this.looking = true;
        w.setLookBack(true, this.dir);
      }
      this.held += dt;
      const dx = this.dir === 'left' ? 1 : this.dir === 'right' ? -1 : 0;
      const dy = this.dir === 'up' ? 1 : this.dir === 'down' ? -1 : 0;
      const k = Math.min(1, this.held / 500);
      cam.setFollowOffset(dx * this.peek * k, 12 + dy * this.peek * 0.5 * k);
      if (!this.done && this.held >= this.holdMs) {
        this.done = true;
        if (this.event) this.emitEvent(this.event);
      }
    } else {
      if (this.looking) {
        this.looking = false;
        w.setLookBack(false);
        cam.setFollowOffset(0, 12);
      }
      this.held = 0;
    }
    // Prompt: "hold R" with a filling ring while the look is not yet done.
    const p = this.level.player;
    const show = here && !this.done && this.event !== null;
    this.prompt?.setVisible(show).setPosition(p.x, p.y - 44);
    this.ring.clear();
    if (show && this.held > 0) {
      this.ring.lineStyle(1, 0xf3d77a, 0.9);
      this.ring.beginPath();
      this.ring.arc(p.x, p.y - 44, 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(1, this.held / this.holdMs)), false);
      this.ring.strokePath();
    }
  }

  get triggered(): boolean {
    return this.done;
  }

  override destroy(): void {
    try {
      this.scene.cameras.main.setFollowOffset(0, 12);
    } catch {
      // ignore
    }
    super.destroy();
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), held: Math.round(this.held), done: this.done, event: this.event };
  }
}

export function createLookBack(ctx: MechanicContext, cfg: LookBackConfig): LookBack {
  return new LookBack(ctx, cfg);
}
