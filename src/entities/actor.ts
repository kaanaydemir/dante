/**
 * Actor: a character standing in the world (Dante, Virgil, an NPC, a beast).
 * Implements the contract's ActorHandle: scripted walks that settle (on
 * arrival, on abort, on teleport or when the actor is destroyed), facing,
 * visibility, a soft shadow under the feet and y-sorted depth.
 *
 * Sprites use origin (0.5, 1): the actor's (x, y) is the point between its feet.
 *
 * Owner: team D (entities).
 */

import type * as Phaser from 'phaser';
import { DEPTH, actorDepth } from '../config';
import type { ActorHandle, Facing } from '../runtime/contracts';
import type { SpeakerId } from '../story/types';

export type DirectionSet = 'four' | 'sides' | 'none';

export interface ActorOptions {
  readonly id: string;
  readonly speaker: SpeakerId | null;
  readonly texture: string;
  readonly x: number;
  readonly y: number;
  /** Which directional frames the texture has (`down-0` …, `left-0` / `right-0`, or a single frame). */
  readonly directions?: DirectionSet;
  /** Animation key prefix; walk animations are `<prefix>-walk-<dir>` (default: the texture key). */
  readonly animPrefix?: string;
  readonly facing?: Facing;
  /** Base speed for scripted walks, px/s. */
  readonly speed?: number;
  readonly shadow?: boolean;
  readonly alpha?: number;
}

interface Walk {
  readonly x: number;
  readonly y: number;
  readonly speed: number;
  readonly resolve: () => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: () => void;
}

export class Actor implements ActorHandle {
  readonly id: string;
  readonly speaker: SpeakerId | null;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image | null;
  readonly directions: DirectionSet;
  facing: Facing;
  speed: number;
  /** Extra vertical offset of the drawing (bobbing, floating shades). */
  bob = 0;
  /** Set while something else drives the frame (poses, behaviours). */
  poseLocked = false;
  private walk: Walk | null = null;
  private appliedBob = 0;
  private readonly animPrefix: string;
  private destroyed = false;

  constructor(
    protected readonly scene: Phaser.Scene,
    opts: ActorOptions,
  ) {
    this.id = opts.id;
    this.speaker = opts.speaker;
    this.directions = opts.directions ?? 'four';
    this.facing = opts.facing ?? (this.directions === 'sides' ? 'right' : 'down');
    this.speed = opts.speed ?? 60;
    this.animPrefix = opts.animPrefix ?? opts.texture;
    this.shadow =
      opts.shadow === false || !scene.textures.exists('fx-shadow')
        ? null
        : scene.add.image(opts.x, opts.y, 'fx-shadow').setOrigin(0.5, 0.75).setDepth(DEPTH.shadows);
    this.sprite = scene.add.sprite(opts.x, opts.y, opts.texture, this.idleFrame(opts.texture)).setOrigin(0.5, 1);
    if (opts.alpha !== undefined) this.sprite.setAlpha(opts.alpha);
    this.sync();
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get alive(): boolean {
    return !this.destroyed;
  }

  get walking(): boolean {
    return this.walk !== null;
  }

  /** The idle frame name for the current facing, if the texture has it. */
  idleFrame(texture = this.sprite?.texture.key): string | undefined {
    const tex = this.scene.textures.get(texture ?? '');
    const candidates =
      this.directions === 'four'
        ? [`${this.facing}-0`, 'down-0']
        : this.directions === 'sides'
          ? [`${this.facing === 'left' ? 'left' : 'right'}-0`, 'right-0', 'down-0']
          : ['down-0', 'idle'];
    for (const c of candidates) if (tex.has(c)) return c;
    return undefined;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sync();
  }

  /** Walk to a point (scripted: no collisions). Resolves on arrival or when `signal` aborts. */
  moveTo(x: number, y: number, opts: { readonly speed?: number; readonly signal?: AbortSignal } = {}): Promise<void> {
    this.stopWalk();
    if (this.destroyed) return Promise.resolve();
    if (opts.signal?.aborted) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const onAbort = (): void => this.stopWalk();
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      this.walk = { x, y, speed: opts.speed ?? this.speed, resolve, signal: opts.signal, onAbort };
    });
  }

  /** Settle a scripted walk where the actor stands. */
  stopWalk(): void {
    const w = this.walk;
    if (!w) return;
    this.walk = null;
    w.signal?.removeEventListener('abort', w.onAbort);
    w.resolve();
    this.playIdle();
  }

  teleport(x: number, y: number): void {
    this.stopWalk();
    this.setPosition(x, y);
  }

  face(dir: Facing): void {
    this.facing = this.directions === 'sides' && (dir === 'up' || dir === 'down') ? this.facing : dir;
    if (!this.walk) this.playIdle();
  }

  /** Face toward a point. */
  faceToward(x: number, y: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    if (this.directions === 'sides' || Math.abs(dx) >= Math.abs(dy)) this.face(dx < 0 ? 'left' : 'right');
    else this.face(dy < 0 ? 'up' : 'down');
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow?.setVisible(visible);
  }

  /** Advance a scripted walk. `dt` in ms. Returns true while walking. */
  update(dt: number): boolean {
    if (this.destroyed) return false;
    const w = this.walk;
    if (w) {
      const dx = w.x - this.x;
      const dy = w.y - this.y;
      const d = Math.hypot(dx, dy);
      const step = (w.speed * dt) / 1000;
      if (d <= Math.max(0.5, step)) {
        this.setPosition(w.x, w.y);
        this.stopWalk();
      } else {
        this.setPosition(this.x + (dx / d) * step, this.y + (dy / d) * step);
        this.playWalk(dx, dy);
      }
    }
    this.sync();
    return this.walk !== null;
  }

  /** Play the walk animation for a movement direction. */
  playWalk(dx: number, dy: number): void {
    if (this.poseLocked) return;
    if (this.directions === 'none') return;
    let dir: Facing;
    if (this.directions === 'sides' || Math.abs(dx) >= Math.abs(dy) * 0.9) dir = dx < 0 ? 'left' : 'right';
    else dir = dy < 0 ? 'up' : 'down';
    if (this.directions === 'sides' && dx === 0) dir = this.facing === 'left' ? 'left' : 'right';
    this.facing = dir;
    const key = `${this.animPrefix}-walk-${dir}`;
    if (this.scene.anims.exists(key)) {
      if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) this.sprite.play(key, true);
    } else {
      const f = this.idleFrame();
      if (f !== undefined) this.sprite.setFrame(f);
    }
  }

  playIdle(): void {
    if (this.poseLocked || this.destroyed) return;
    this.sprite.anims.stop();
    const f = this.idleFrame();
    if (f !== undefined) this.sprite.setFrame(f);
  }

  /** Show one frame (a pose) if the texture has it. */
  pose(frame: string): boolean {
    const tex = this.sprite.texture;
    if (!tex.has(frame)) return false;
    this.sprite.anims.stop();
    this.sprite.setFrame(frame);
    return true;
  }

  /** Keep depth, shadow and bob in step with the position. */
  sync(): void {
    this.sprite.setDepth(actorDepth(this.sprite.y));
    if (this.bob !== this.appliedBob) {
      this.appliedBob = this.bob;
      this.sprite.setDisplayOrigin(this.sprite.width * 0.5, this.sprite.height + this.bob);
    }
    if (this.shadow) this.shadow.setPosition(this.sprite.x, this.sprite.y);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.stopWalk();
    this.destroyed = true;
    this.sprite.destroy();
    this.shadow?.destroy();
  }
}

/** Unit vector for a facing. */
export function facingVector(f: Facing): { x: number; y: number } {
  switch (f) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
  }
  return { x: 0, y: 1 };
}

export function oppositeFacing(f: Facing): Facing {
  return f === 'left' ? 'right' : f === 'right' ? 'left' : f === 'up' ? 'down' : 'up';
}

/** Phaser-free helper so tests and mechanics agree on facing from a vector. */
export function facingFromVector(dx: number, dy: number, sidesOnly = false): Facing {
  if (sidesOnly || Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}
