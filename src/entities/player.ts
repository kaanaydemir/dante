/**
 * Dante, the player: 8-way walking, the dash (brief invulnerability, then a
 * cooldown), knockback, external pushes (wind, crowds), poses (casting a
 * verse, sitting on Virgil's bench, fainting, looking back) and collision of
 * the feet against solid rectangles.
 *
 * Owner: team D (entities).
 */

import type * as Phaser from 'phaser';
import { PLAYER, TIMINGS } from '../config';
import type { Facing, Rect } from '../runtime/contracts';
import { moveBox } from '../world/geometry';
import type { WorldInputState } from '../world/input';
import { Actor, facingFromVector, facingVector } from './actor';

/** The feet: what collides with walls (10 x 6 px, centred under the actor's point). */
export const FEET = { w: 10, h: 6 } as const;

export function feetBox(x: number, y: number): Rect {
  return { x: x - FEET.w / 2, y: y - FEET.h, w: FEET.w, h: FEET.h };
}

export type PlayerPose = 'none' | 'cast' | 'sit' | 'faint' | 'lookBack';

export interface PlayerStep {
  /** The player may act on input. */
  readonly control: boolean;
  readonly solids: readonly Rect[];
  readonly bounds: Rect | null;
  /** Multiplier on walking speed (low Resolve, the she-wolf's weight …). */
  readonly speedFactor: number;
}

export class Player {
  readonly actor: Actor;
  /** The direction of the last input (unit vector), for dashes and Virgil's lead. */
  heading = { x: 1, y: 0 };
  private dashMs = 0;
  private dashDir = { x: 1, y: 0 };
  private dashSpeed: number = PLAYER.dashSpeed;
  private cooldownMs = 0;
  private invulnMs = 0;
  private shieldMs = 0;
  private force = { x: 0, y: 0 };
  private impulse = { x: 0, y: 0, ms: 0 };
  private poseKind: PlayerPose = 'none';
  private poseMs = 0;
  private flashMs = 0;
  private speedBoostMs = 0;
  /** Distance actually travelled this frame (stillness checks). */
  moved = 0;
  /** True while the last frame had movement input. */
  walkingInput = false;
  lookBackFacing: Facing = 'left';

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.actor = new Actor(scene, {
      id: 'dante',
      speaker: 'DANTE',
      texture: 'dante',
      x,
      y,
      directions: 'four',
      facing: 'right',
      speed: PLAYER.walkSpeed,
    });
  }

  get x(): number {
    return this.actor.x;
  }

  get y(): number {
    return this.actor.y;
  }

  get dashing(): boolean {
    return this.dashMs > 0;
  }

  get invulnerable(): boolean {
    return this.invulnMs > 0 || this.shieldMs > 0;
  }

  get shielded(): boolean {
    return this.shieldMs > 0;
  }

  get pose(): PlayerPose {
    return this.poseKind;
  }

  /** A push for this frame only (px/s): wind lanes, a crowd. */
  addForce(vx: number, vy: number): void {
    this.force.x += vx;
    this.force.y += vy;
  }

  /** A knock that fades over `ms` (px/s at the start). */
  knock(vx: number, vy: number, ms = 260): void {
    this.impulse = { x: vx, y: vy, ms };
  }

  /** Brief invulnerability (after a hit, or a dash). */
  grantInvulnerability(ms: number): void {
    this.invulnMs = Math.max(this.invulnMs, ms);
  }

  /** Ward verse: a shield that turns blows aside. */
  shield(ms: number): void {
    this.shieldMs = Math.max(this.shieldMs, ms);
  }

  /** Swift verse: a long, fast dash and a short burst of speed. */
  swiftDash(power: number): void {
    this.dashDir = { ...this.heading };
    this.dashSpeed = PLAYER.dashSpeed * (1.25 + 0.15 * power);
    this.dashMs = TIMINGS.dashMs * (2 + power);
    this.invulnMs = Math.max(this.invulnMs, this.dashMs);
    this.speedBoostMs = 2500 + 800 * power;
  }

  /** Red flash after a hurt. */
  flash(): void {
    this.flashMs = 240;
  }

  setPose(kind: PlayerPose, ms = 0): void {
    this.poseKind = kind;
    this.poseMs = ms;
    this.applyPose();
  }

  clearPose(): void {
    if (this.poseKind === 'none') return;
    this.poseKind = 'none';
    this.poseMs = 0;
    this.actor.poseLocked = false;
    this.actor.playIdle();
  }

  teleport(x: number, y: number): void {
    this.actor.teleport(x, y);
    this.dashMs = 0;
    this.impulse.ms = 0;
    this.force = { x: 0, y: 0 };
  }

  /** One frame. Returns the distance moved. */
  update(dt: number, input: WorldInputState | null, step: PlayerStep, onDash: () => void): number {
    const s = dt / 1000;
    this.cooldownMs = Math.max(0, this.cooldownMs - dt);
    this.invulnMs = Math.max(0, this.invulnMs - dt);
    this.shieldMs = Math.max(0, this.shieldMs - dt);
    this.speedBoostMs = Math.max(0, this.speedBoostMs - dt);
    if (this.poseMs > 0) {
      this.poseMs -= dt;
      if (this.poseMs <= 0 && (this.poseKind === 'cast' || this.poseKind === 'lookBack')) this.clearPose();
    }

    // Scripted walks (hooks, cutscenes) move the actor themselves.
    if (this.actor.walking) {
      this.actor.update(dt);
      this.force = { x: 0, y: 0 };
      this.moved = 0;
      this.tint(dt);
      return 0;
    }

    let vx = 0;
    let vy = 0;
    const control = step.control && input !== null && this.poseKind !== 'faint' && this.poseKind !== 'sit';
    this.walkingInput = false;
    if (control && input) {
      if (Math.hypot(input.moveX, input.moveY) > 0.05) {
        this.walkingInput = true;
        this.heading = normalise(input.moveX, input.moveY);
        if (this.poseKind === 'lookBack') this.clearPose();
      }
      if (input.dashPressed && this.cooldownMs <= 0 && this.dashMs <= 0) {
        this.dashDir = this.walkingInput ? { ...this.heading } : facingVector(this.actor.facing);
        this.dashSpeed = PLAYER.dashSpeed;
        this.dashMs = TIMINGS.dashMs;
        this.cooldownMs = TIMINGS.dashCooldownMs;
        this.invulnMs = Math.max(this.invulnMs, TIMINGS.dashInvulnerableMs);
        onDash();
      }
      const boost = this.speedBoostMs > 0 ? 1.45 : 1;
      vx = input.moveX * PLAYER.walkSpeed * step.speedFactor * boost;
      vy = input.moveY * PLAYER.walkSpeed * step.speedFactor * boost;
    }
    if (this.dashMs > 0) {
      this.dashMs -= dt;
      vx = this.dashDir.x * this.dashSpeed;
      vy = this.dashDir.y * this.dashSpeed;
    }
    // Pushes: a dash cuts through most of the wind (GDD 4.3: the dash is the way against it).
    const forceScale = this.dashMs > 0 ? 0.25 : 1;
    vx += this.force.x * forceScale;
    vy += this.force.y * forceScale;
    this.force = { x: 0, y: 0 };
    if (this.impulse.ms > 0) {
      const k = Math.min(1, this.impulse.ms / 260);
      vx += this.impulse.x * k;
      vy += this.impulse.y * k;
      this.impulse.ms -= dt;
    }

    const box = { x: this.x - 5, y: this.y - 6, w: 10, h: 6 };
    const res = moveBox(box, vx * s, vy * s, step.solids, step.bounds);
    const nx = res.x + 5;
    const ny = res.y + 6;
    const moved = Math.hypot(nx - this.x, ny - this.y);
    this.actor.setPosition(nx, ny);
    this.moved = moved;

    // Animation.
    if (this.poseKind === 'none') {
      if (this.dashMs > 0) {
        const f = facingFromVector(this.dashDir.x, this.dashDir.y);
        this.actor.facing = f;
        this.actor.pose(`dash-${f}`);
      } else if (this.walkingInput && control) {
        this.actor.playWalk(this.heading.x, this.heading.y);
      } else if (moved > 0.05 && !control) {
        this.actor.playIdle();
      } else {
        this.actor.playIdle();
      }
    }
    this.tint(dt);
    this.actor.sync();
    return moved;
  }

  private applyPose(): void {
    const a = this.actor;
    switch (this.poseKind) {
      case 'none':
        a.poseLocked = false;
        a.playIdle();
        return;
      case 'cast': {
        a.poseLocked = false;
        const ok = a.pose(`cast-${a.facing}`);
        a.poseLocked = ok;
        return;
      }
      case 'sit':
        a.poseLocked = false;
        a.pose('sit');
        a.poseLocked = true;
        return;
      case 'faint':
        a.poseLocked = false;
        a.pose(a.facing === 'left' ? 'faint-left' : 'faint');
        a.poseLocked = true;
        return;
      case 'lookBack':
        a.poseLocked = false;
        a.face(this.lookBackFacing);
        a.poseLocked = true;
        return;
    }
  }

  private tint(dt: number): void {
    const sprite = this.actor.sprite;
    if (this.flashMs > 0) {
      this.flashMs -= dt;
      sprite.setTint(0xff7a6a);
    } else if (this.invulnMs > 0 && this.dashMs <= 0 && this.shieldMs <= 0) {
      sprite.setAlpha(Math.floor(this.invulnMs / 80) % 2 === 0 ? 0.55 : 1);
      sprite.clearTint();
    } else {
      sprite.setAlpha(1);
      sprite.clearTint();
    }
  }

  destroy(): void {
    this.actor.destroy();
  }
}

function normalise(x: number, y: number): { x: number; y: number } {
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 1, y: 0 };
}
