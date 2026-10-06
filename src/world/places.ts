/**
 * Named map areas: which places the player stands in, and the enter / exit
 * transitions that become `world:signal` events.
 *
 * Owner: team D (world). Pure: no Phaser.
 */

import type { PlaceDef } from '../runtime/contracts';
import type { PlaceId } from '../story/types';
import { rectCenter, rectContains, type Vec } from './geometry';

export interface PlaceTransition {
  readonly entered: readonly PlaceId[];
  readonly exited: readonly PlaceId[];
}

const NO_CHANGE: PlaceTransition = { entered: [], exited: [] };

/** Tracks the set of places that contain a point and reports transitions in place order. */
export class PlaceTracker {
  private readonly defs: PlaceDef[] = [];
  private inside = new Set<PlaceId>();

  constructor(places: readonly PlaceDef[] = []) {
    for (const p of places) this.add(p);
  }

  /** Add or replace a place (same id replaces). */
  add(place: PlaceDef): void {
    const i = this.defs.findIndex((p) => p.id === place.id);
    if (i >= 0) this.defs[i] = place;
    else this.defs.push(place);
  }

  get places(): readonly PlaceDef[] {
    return this.defs;
  }

  get(id: PlaceId): PlaceDef | null {
    return this.defs.find((p) => p.id === id) ?? null;
  }

  has(id: PlaceId): boolean {
    return this.defs.some((p) => p.id === id);
  }

  /** Places that contain (x, y), in definition order. */
  at(x: number, y: number): PlaceId[] {
    return this.defs.filter((p) => rectContains(p, x, y)).map((p) => p.id);
  }

  /** Was the point inside `id` at the last update? */
  contains(id: PlaceId): boolean {
    return this.inside.has(id);
  }

  current(): PlaceId[] {
    return this.defs.filter((p) => this.inside.has(p.id)).map((p) => p.id);
  }

  /** Recompute membership for (x, y); returns the places entered and exited since the last update. */
  update(x: number, y: number): PlaceTransition {
    const now = new Set(this.at(x, y));
    let changed = now.size !== this.inside.size;
    if (!changed) for (const id of now) if (!this.inside.has(id)) changed = true;
    if (!changed) return NO_CHANGE;
    const exited = this.defs.filter((p) => this.inside.has(p.id) && !now.has(p.id)).map((p) => p.id);
    const entered = this.defs.filter((p) => now.has(p.id) && !this.inside.has(p.id)).map((p) => p.id);
    this.inside = now;
    return { entered, exited };
  }

  /** Forget membership (the next update reports every containing place as entered). */
  reset(): void {
    this.inside = new Set();
  }

  clear(): void {
    this.defs.length = 0;
    this.inside = new Set();
  }
}

/** Where the player stands when moved into a place: its spawn point, else its centre. */
export function placeSpawn(place: PlaceDef): Vec {
  return place.spawn ? { x: place.spawn.x, y: place.spawn.y } : rectCenter(place);
}
