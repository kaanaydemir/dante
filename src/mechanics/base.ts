/**
 * Shared plumbing for library mechanics: ids unique per level (`fear#1`),
 * owned game objects destroyed with the mechanic, unsubscribe bookkeeping,
 * and access to the world's extended API.
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import type { LevelRuntime, Mechanic, MechanicContext } from '../runtime/contracts';
import type { EventId } from '../story/types';
import { worldExtras, type MechanicHooks, type VerseCast, type WorldExtras } from '../world/extras';

const counters = new WeakMap<object, Map<string, number>>();

function nextId(level: LevelRuntime, name: string): string {
  let m = counters.get(level);
  if (!m) {
    m = new Map();
    counters.set(level, m);
  }
  const n = (m.get(name) ?? 0) + 1;
  m.set(name, n);
  return `${name}#${n}`;
}

export abstract class BaseMechanic implements Mechanic, MechanicHooks {
  readonly id: string;
  enabled = true;
  emits?: readonly EventId[];
  protected readonly level: LevelRuntime;
  protected readonly w: WorldExtras | null;
  private readonly owned: Phaser.GameObjects.GameObject[] = [];
  private readonly cleanups: Array<() => void> = [];
  private destroyed = false;

  constructor(
    readonly name: string,
    ctx: MechanicContext,
    id?: string,
  ) {
    this.level = ctx.level;
    this.w = worldExtras(ctx.level);
    this.id = id ?? nextId(ctx.level, name);
  }

  get scene(): Phaser.Scene {
    return this.level.scene;
  }

  update(_dt: number, _time: number): void {
    // Most mechanics override this.
  }

  onVerse?(cast: VerseCast): void;
  onRespawn?(): void;

  /** Keep a game object; it is destroyed with the mechanic. */
  protected own<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.owned.push(obj);
    return obj;
  }

  protected onDispose(fn: () => void): void {
    this.cleanups.push(fn);
  }

  /** Emit a gameplay event (once per canto when `once`). */
  protected emitEvent(event: EventId, once = true): void {
    if (once && this.w) this.w.emitOnce(event);
    else this.level.emit(event);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.enabled = false;
    for (const fn of this.cleanups.splice(0)) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
    for (const o of this.owned.splice(0)) {
      try {
        o.destroy();
      } catch {
        // ignore
      }
    }
  }

  debugInfo(): Record<string, unknown> {
    return { name: this.name, id: this.id, enabled: this.enabled };
  }
}

/** Reads a number from a loose config. */
export function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
