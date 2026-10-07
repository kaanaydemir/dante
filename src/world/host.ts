/**
 * Connects the WorldBridge (created at boot, before any scene exists) with the
 * World living inside WorldScene (created when the scene starts, destroyed
 * when it stops). The bridge waits here for the world to be ready.
 *
 * Owner: team D (world).
 */

import type { World } from './world';

type Waiter = (world: World) => void;

class WorldHost {
  private current: World | null = null;
  private waiters: Waiter[] = [];
  private readonly attachListeners = new Set<(world: World) => void>();

  get world(): World | null {
    return this.current;
  }

  attach(world: World): void {
    this.current = world;
    for (const fn of this.attachListeners) {
      try {
        fn(world);
      } catch {
        // ignore
      }
    }
    for (const w of this.waiters.splice(0)) w(world);
  }

  detach(world: World): void {
    if (this.current === world) this.current = null;
  }

  /** Called every time a world attaches (the bridge re-applies control, armed beats, trust). */
  onAttach(fn: (world: World) => void): () => void {
    this.attachListeners.add(fn);
    return () => this.attachListeners.delete(fn);
  }

  /** Resolves with the world once its scene has been created, or null after `timeoutMs`. */
  whenReady(timeoutMs: number): Promise<World | null> {
    if (this.current) return Promise.resolve(this.current);
    return new Promise<World | null>((resolve) => {
      let done = false;
      const waiter: Waiter = (w) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(w);
      };
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        this.waiters = this.waiters.filter((x) => x !== waiter);
        resolve(null);
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }
}

export const worldHost = new WorldHost();
