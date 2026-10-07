/**
 * Shared plumbing for library mechanics: ids unique per level (`fear#1`),
 * owned game objects destroyed with the mechanic, unsubscribe bookkeeping,
 * areas given as rectangles or place ids, game-time helpers and access to the
 * world's extended API.
 *
 * Every mechanic must stay harmless when the world's extras are missing
 * (unit tests, a level built outside WorldScene): `this.w` is then null and
 * update() does nothing.
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import type { ActorHandle, LevelRuntime, Mechanic, MechanicContext, Rect } from '../runtime/contracts';
import type { EventId, PlaceId, SpeakerId } from '../story/types';
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

/** A point in world pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** An area given as a rectangle or as a place id of the level. */
export type AreaRef = Rect | PlaceId;

export abstract class BaseMechanic implements Mechanic, MechanicHooks {
  readonly id: string;
  emits?: readonly EventId[];
  protected readonly level: LevelRuntime;
  protected readonly w: WorldExtras | null;
  private readonly owned: Phaser.GameObjects.GameObject[] = [];
  private readonly cleanups: Array<() => void> = [];
  private readonly waiters = new Set<Waiter<string>>();
  private disposed = false;
  private on = true;

  /**
   * `idOrConfig`: an explicit id, or the mechanic's config whose optional `id`
   * names it (levels find it again with `level.mechanic(id)`).
   */
  constructor(
    readonly name: string,
    ctx: MechanicContext,
    idOrConfig?: string | object,
  ) {
    this.level = ctx.level;
    this.w = worldExtras(ctx.level);
    const given = typeof idOrConfig === 'string' ? idOrConfig : (idOrConfig as { readonly id?: unknown } | undefined)?.id;
    this.id = typeof given === 'string' && given.length > 0 ? given : nextId(ctx.level, name);
  }

  get scene(): Phaser.Scene {
    return this.level.scene;
  }

  /** Switched off mechanics are skipped by the world; their scripted moments end at once. */
  get enabled(): boolean {
    return this.on;
  }

  set enabled(v: boolean) {
    this.on = v;
    if (!v) this.endWaiters('aborted');
  }

  /** True once destroy() ran. */
  get destroyed(): boolean {
    return this.disposed;
  }

  /** Called by the world every frame while enabled. Subclasses implement `step`. */
  update(dt: number, time: number): void {
    for (const w of [...this.waiters]) {
      w.tick(dt);
      if (w.done) this.waiters.delete(w);
    }
    this.step(dt, time);
  }

  /** The mechanic's own frame (ms since the last frame, scene time). */
  protected step(_dt: number, _time: number): void {
    // Most mechanics override this.
  }

  /** A scripted moment bound to this mechanic (ticked by update, ended on destroy / disable). */
  protected moment<T extends string>(limitMs: number, signal?: AbortSignal): Waiter<T> {
    const w = new Waiter<T>(limitMs, signal);
    if (!w.done) this.waiters.add(w as unknown as Waiter<string>);
    return w;
  }

  private endWaiters(value: 'aborted' | 'timeout'): void {
    for (const w of [...this.waiters]) w.finish(value);
    this.waiters.clear();
  }

  onVerse?(cast: VerseCast): void;
  onRespawn?(): void;

  /** Scene time in ms (pauses with the Book); 0 without a world. */
  protected now(): number {
    return this.w?.now() ?? 0;
  }

  protected get player(): ActorHandle {
    return this.level.player;
  }

  /** Keep a game object; it is destroyed with the mechanic. */
  protected own<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.owned.push(obj);
    return obj;
  }

  protected onDispose(fn: () => void): void {
    this.cleanups.push(fn);
  }

  /** Declare event ids this mechanic can emit (canSatisfy then answers true for them). */
  protected declareEmits(...events: readonly (EventId | null | undefined)[]): void {
    const list = new Set<EventId>(this.emits ?? []);
    for (const e of events) if (e) list.add(e);
    this.emits = [...list];
  }

  /** Emit a gameplay event (once per canto when `once`). */
  protected emitEvent(event: EventId | null | undefined, once = true): void {
    if (!event) return;
    if (once && this.w) this.w.emitOnce(event);
    else this.level.emit(event);
  }

  /** A rectangle for an area reference (a place id is looked up in the level). */
  protected areaOf(ref: AreaRef | null | undefined): Rect | null {
    if (!ref) return null;
    if (typeof ref === 'string') {
      const p = this.level.place(ref);
      return p ? { x: p.x, y: p.y, w: p.w, h: p.h } : null;
    }
    return { x: ref.x, y: ref.y, w: ref.w, h: ref.h };
  }

  /** The actor of a speaker (NPC, Virgil or Dante), or null. */
  protected actorOf(speaker: SpeakerId | null | undefined): ActorHandle | null {
    if (!speaker) return null;
    try {
      return this.level.npc(speaker);
    } catch {
      return null;
    }
  }

  /** Report a problem on the bus (never throws). */
  protected warn(message: string): void {
    try {
      this.level.bus.emit('debug:log', { level: 'warn', message: `[${this.id}] ${message}` });
    } catch {
      // nothing else to do
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.on = false;
    this.endWaiters('aborted');
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

/**
 * A scripted moment that must always end (no soft-locks): it settles when the
 * owner calls `finish(value)`, after `limitMs` of game time ('timeout',
 * advanced by `tick`), when `signal` aborts ('aborted'), or — as a last
 * resort, should its owner stop ticking it — after a real-time cap.
 */
export class Waiter<T extends string = 'done'> {
  private resolveFn: ((v: T | 'timeout' | 'aborted') => void) | null = null;
  private elapsed = 0;
  private settled = false;
  private hardTimer: ReturnType<typeof setTimeout> | null = null;
  readonly promise: Promise<T | 'timeout' | 'aborted'>;

  constructor(
    private readonly limitMs: number,
    signal?: AbortSignal,
  ) {
    this.promise = new Promise((resolve) => {
      this.resolveFn = resolve;
    });
    if (signal) {
      if (signal.aborted) this.finish('aborted');
      else signal.addEventListener('abort', () => this.finish('aborted'), { once: true });
    }
    if (!this.settled && limitMs > 0) {
      this.hardTimer = setTimeout(() => this.finish('timeout'), Math.max(limitMs * 3, limitMs + 30_000));
    }
  }

  get done(): boolean {
    return this.settled;
  }

  /** Game time spent so far (ms). */
  get time(): number {
    return this.elapsed;
  }

  /** Advance game time; settles with 'timeout' past the limit. */
  tick(dt: number): void {
    if (this.settled) return;
    this.elapsed += dt;
    if (this.limitMs > 0 && this.elapsed >= this.limitMs) this.finish('timeout');
  }

  finish(value: T | 'timeout' | 'aborted'): void {
    if (this.settled) return;
    this.settled = true;
    if (this.hardTimer !== null) clearTimeout(this.hardTimer);
    this.hardTimer = null;
    const r = this.resolveFn;
    this.resolveFn = null;
    r?.(value);
  }
}
