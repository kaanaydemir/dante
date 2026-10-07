/**
 * Virgil, the companion (GDD 2.5, bible §3.3): follows Dante along his trail
 * at a distance that shows trust (closer when trusted, a step ahead when
 * Wayward), hurries when far behind, reappears when lost, waits seated at his
 * bench (the checkpoint), never blocks and is never attacked. Hooks can hold
 * him and walk him around.
 *
 * Owner: team D (entities).
 */

import type * as Phaser from 'phaser';
import { TRUST, VIRGIL } from '../config';
import { dist } from '../world/geometry';
import { followStep, leadStep, Trail } from '../world/follow';
import type { Vec } from '../world/geometry';
import { Actor } from './actor';

export type CompanionMode = 'follow' | 'hold' | 'wait';

export class Companion {
  readonly actor: Actor;
  readonly trail = new Trail(4, 640);
  mode: CompanionMode = 'follow';
  trust: number = TRUST.start;
  /** The bench he waits at (seated while Dante stays near it). */
  private bench: { x: number; y: number } | null = null;
  private gestureMs = 0;
  private present = true;
  /** Waypoints while he leads the way (empty: he follows). */
  private leadPath: Vec[] = [];
  private leadWaiting = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.actor = new Actor(scene, {
      id: 'virgil',
      speaker: 'VIRGIL',
      texture: 'virgil',
      x,
      y,
      directions: 'four',
      facing: 'right',
      speed: VIRGIL.walkSpeed,
    });
  }

  get visible(): boolean {
    return this.present;
  }

  /** On stage or not (Canto I keeps him away until the shade appears). */
  setPresent(on: boolean): void {
    this.present = on;
    this.actor.setVisible(on);
  }

  /** Place him beside Dante (teleports, respawns). */
  placeNear(x: number, y: number, side: -1 | 1 = -1): void {
    this.actor.teleport(x + side * 18, y + 2);
    this.trail.reset(x, y);
  }

  /** A checkpoint: he walks to the bench and sits while Dante stays near. */
  waitAt(x: number, y: number): void {
    this.bench = { x, y };
    if (this.mode === 'follow') this.mode = 'wait';
  }

  clearBench(): void {
    this.bench = null;
    if (this.mode === 'wait') this.mode = 'follow';
  }

  /** Lead the way along `waypoints` (the last is where the story waits); null: follow again. */
  lead(waypoints: readonly Vec[] | null): void {
    this.leadPath = waypoints ? waypoints.map((p) => ({ x: p.x, y: p.y })) : [];
    this.leadWaiting = false;
  }

  get leading(): boolean {
    return this.leadPath.length > 0;
  }

  /** Trust shown by posture: a nod when it grows, a turn away when it falls. */
  gesture(delta: number): void {
    if (!this.present || delta === 0) return;
    this.gestureMs = 700;
    this.actor.poseLocked = false;
    if (delta > 0) {
      this.actor.pose('bow');
    } else {
      this.actor.face(this.actor.facing === 'left' ? 'right' : 'left');
    }
    this.actor.poseLocked = true;
  }

  /** Point ahead (naming the shades, showing the road). */
  point(dir: 'left' | 'right', ms = 1200): void {
    this.gestureMs = ms;
    this.actor.poseLocked = false;
    this.actor.pose(`point-${dir}`);
    this.actor.poseLocked = true;
  }

  update(dt: number, player: { x: number; y: number; heading: { x: number; y: number } }): void {
    const a = this.actor;
    if (this.gestureMs > 0) {
      this.gestureMs -= dt;
      if (this.gestureMs <= 0) {
        a.poseLocked = false;
        a.playIdle();
      }
    }
    this.trail.push(player.x, player.y);
    if (a.walking) {
      a.update(dt);
      return;
    }
    if (!this.present || this.mode === 'hold') {
      a.sync();
      return;
    }

    if (this.mode === 'wait' && this.bench) {
      const near = dist(player.x, player.y, this.bench.x, this.bench.y) < 90;
      if (near) {
        const seat = { x: this.bench.x + 6, y: this.bench.y + 1 };
        const d = dist(a.x, a.y, seat.x, seat.y);
        if (d > 2) this.stepToward(seat.x, seat.y, dt, d > 120 ? 1.6 : 1);
        else if (this.gestureMs <= 0) {
          a.poseLocked = false;
          a.pose('sit');
          a.poseLocked = true;
          this.gestureMs = 0;
        }
        a.sync();
        return;
      }
      // Dante walked on: Virgil rises and follows again.
      if (a.poseLocked && this.gestureMs <= 0) {
        a.poseLocked = false;
        a.playIdle();
      }
    }

    if (this.leadPath.length > 0) {
      const lead = leadStep({ companion: { x: a.x, y: a.y }, player: { x: player.x, y: player.y }, waypoints: this.leadPath, waiting: this.leadWaiting });
      if (lead.reached > 0) this.leadPath.splice(0, lead.reached);
      this.leadWaiting = lead.waiting;
      if (lead.target) this.stepToward(lead.target.x, lead.target.y, dt, lead.speedFactor);
      else if (this.gestureMs <= 0) {
        a.poseLocked = false;
        a.faceToward(player.x, player.y);
        a.playIdle();
      }
      a.sync();
      return;
    }

    const step = followStep({
      companion: { x: a.x, y: a.y },
      player: { x: player.x, y: player.y },
      facing: player.heading,
      trust: this.trust,
      trail: this.trail,
    });
    if (step.teleport) {
      this.placeNear(player.x, player.y, player.heading.x >= 0 ? -1 : 1);
      a.sync();
      return;
    }
    if (step.target) {
      this.stepToward(step.target.x, step.target.y, dt, step.speedFactor);
    } else if (this.gestureMs <= 0) {
      a.poseLocked = false;
      if (dist(a.x, a.y, player.x, player.y) < 80) a.faceToward(player.x, player.y);
      a.playIdle();
    }
    a.sync();
  }

  private stepToward(x: number, y: number, dt: number, factor: number): void {
    const a = this.actor;
    if (a.poseLocked && this.gestureMs <= 0) a.poseLocked = false;
    const dx = x - a.x;
    const dy = y - a.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, (VIRGIL.walkSpeed * factor * dt) / 1000);
    if (d < 0.01) return;
    a.setPosition(a.x + (dx / d) * step, a.y + (dy / d) * step);
    a.playWalk(dx, dy);
  }

  destroy(): void {
    this.actor.destroy();
  }
}
