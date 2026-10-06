/**
 * Measuring stillness: did the player stand firm through a cue (the lion's
 * roar, Charon's command), and how long has the player stood still in total
 * (waiting for the dawn)? Used by `hold_ground` and level scripts.
 *
 * Owner: team D (mechanics). Pure: no Phaser.
 */

import { dist } from '../../world/geometry';

/** Watches one cue window: it fails as soon as the player moves farther than the tolerance or dashes. */
export class CueWatch {
  private origin: { x: number; y: number } | null = null;
  private broken = false;

  constructor(private readonly tolerancePx = 3) {}

  get active(): boolean {
    return this.origin !== null;
  }

  /** True while a cue runs and the player has not moved. */
  get holding(): boolean {
    return this.origin !== null && !this.broken;
  }

  begin(x: number, y: number): void {
    this.origin = { x, y };
    this.broken = false;
  }

  /** Feed the player's position each frame while the cue runs. */
  sample(x: number, y: number, dashing: boolean): void {
    if (!this.origin || this.broken) return;
    if (dashing || dist(this.origin.x, this.origin.y, x, y) > this.tolerancePx) this.broken = true;
  }

  /** Close the window: true when the player held still the whole time. */
  end(): boolean {
    const ok = this.origin !== null && !this.broken;
    this.origin = null;
    this.broken = false;
    return ok;
  }

  cancel(): void {
    this.origin = null;
    this.broken = false;
  }
}

/** Accumulates the time the player stands still (speed under a threshold). */
export class StillTimer {
  private last: { x: number; y: number } | null = null;
  private stillMs = 0;

  constructor(private readonly epsilonPxPerSecond = 6) {}

  get total(): number {
    return this.stillMs;
  }

  /** Feed one frame: `dt` in ms. Returns the accumulated still time. */
  sample(x: number, y: number, dt: number): number {
    if (this.last && dt > 0) {
      const speed = (dist(this.last.x, this.last.y, x, y) * 1000) / dt;
      if (speed <= this.epsilonPxPerSecond) this.stillMs += dt;
    }
    this.last = { x, y };
    return this.stillMs;
  }

  reset(): void {
    this.last = null;
    this.stillMs = 0;
  }
}
