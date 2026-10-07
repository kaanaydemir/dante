/**
 * Companion following: a breadcrumb trail of the player's positions, so Virgil
 * walks where Dante walked (and never cuts through walls), at a distance that
 * depends on trust (bible §3.3: trust is shown, never numbered).
 *
 * Owner: team D (world). Pure: no Phaser.
 */

import { TRUST, VIRGIL, virgilFollowDistance } from '../config';
import { dist, type Vec } from './geometry';

/** Recent player positions, newest last. */
export class Trail {
  private readonly points: Vec[] = [];

  constructor(
    /** Minimum spacing between stored points (px). */
    private readonly spacing = 4,
    /** Maximum stored length along the trail (px). */
    private readonly maxLength = 640,
  ) {}

  get length(): number {
    return this.points.length;
  }

  head(): Vec | null {
    return this.points[this.points.length - 1] ?? null;
  }

  /** Record the player's position; ignored when closer than `spacing` to the last point. */
  push(x: number, y: number): void {
    const last = this.head();
    if (last && dist(last.x, last.y, x, y) < this.spacing) return;
    this.points.push({ x, y });
    this.trim();
  }

  /** Start over from one point (teleports). */
  reset(x: number, y: number): void {
    this.points.length = 0;
    this.points.push({ x, y });
  }

  /** The point `distance` px behind the head, measured along the trail (the oldest point if the trail is shorter). */
  pointBehind(distance: number): Vec | null {
    const n = this.points.length;
    if (n === 0) return null;
    let remaining = Math.max(0, distance);
    for (let i = n - 1; i > 0; i--) {
      const a = this.points[i] as Vec;
      const b = this.points[i - 1] as Vec;
      const seg = dist(a.x, a.y, b.x, b.y);
      if (seg >= remaining) {
        const t = seg > 0 ? remaining / seg : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      remaining -= seg;
    }
    return this.points[0] as Vec;
  }

  private trim(): void {
    let total = 0;
    for (let i = this.points.length - 1; i > 0; i--) {
      const a = this.points[i] as Vec;
      const b = this.points[i - 1] as Vec;
      total += dist(a.x, a.y, b.x, b.y);
      if (total > this.maxLength) {
        this.points.splice(0, i - 1);
        return;
      }
    }
  }
}

export interface FollowInput {
  readonly companion: Vec;
  readonly player: Vec;
  /** Unit vector of the player's facing (for the Wayward lead). */
  readonly facing: Vec;
  readonly trust: number;
  readonly trail: Trail;
}

export interface FollowStep {
  /** Where the companion should walk to, or null to stand still. */
  readonly target: Vec | null;
  /** Speed multiplier (hurrying when far behind). */
  readonly speedFactor: number;
  /** Too far away: reappear near the player instead of walking. */
  readonly teleport: boolean;
}

/** Distance beyond which the companion simply reappears near the player. */
export const FOLLOW_TELEPORT_DISTANCE = 420;

/**
 * One follow decision. Faithful and Steady: trail behind at the trust distance.
 * Wayward (trust ≤ 2): walk a step ahead of Dante (GDD 3.7). Beyond the leash he
 * hurries; very far away he reappears (he never abandons Dante).
 */
export function followStep(input: FollowInput): FollowStep {
  const { companion, player, trust } = input;
  const gap = dist(companion.x, companion.y, player.x, player.y);
  if (gap > FOLLOW_TELEPORT_DISTANCE) return { target: null, speedFactor: 1, teleport: true };
  const want = virgilFollowDistance(trust);
  const hurry = gap > VIRGIL.leash ? 1.9 : gap > want * 2 ? 1.35 : 1;

  if (trust <= TRUST.wayward) {
    const ahead = { x: player.x + input.facing.x * 18, y: player.y + input.facing.y * 12 };
    const d = dist(companion.x, companion.y, ahead.x, ahead.y);
    return { target: d > 6 ? ahead : null, speedFactor: hurry, teleport: false };
  }

  if (gap <= want) return { target: null, speedFactor: 1, teleport: false };
  const behind = input.trail.pointBehind(want) ?? player;
  const d = dist(companion.x, companion.y, behind.x, behind.y);
  return { target: d > 3 ? behind : null, speedFactor: hurry, teleport: false };
}

// ---------------------------------------------------------------------------
// Leading the way (Virgil walks ahead to where the story waits)
// ---------------------------------------------------------------------------

/** Virgil stops to wait when Dante is farther behind than this (px)… */
export const LEAD_WAIT = 96;
/** …and walks on once Dante has come this close again. */
export const LEAD_RESUME = 60;
/** A waypoint counts as reached within this distance (px). */
export const LEAD_REACHED = 6;

export interface LeadInput {
  readonly companion: Vec;
  readonly player: Vec;
  /** Remaining waypoints; the last one is the destination. */
  readonly waypoints: readonly Vec[];
  /** Was he waiting for Dante in the last step (hysteresis)? */
  readonly waiting: boolean;
}

export interface LeadStep {
  /** Where to walk now, or null to stand (arrived, or waiting for Dante). */
  readonly target: Vec | null;
  readonly speedFactor: number;
  /** How many leading waypoints are behind him now (drop them). */
  readonly reached: number;
  readonly waiting: boolean;
  readonly arrived: boolean;
}

/**
 * One step of leading: walk the waypoints toward the destination, a little
 * ahead of Dante; stop and wait when he falls behind; hurry when he is ahead.
 */
export function leadStep(input: LeadInput): LeadStep {
  const { companion, player } = input;
  let reached = 0;
  while (reached < input.waypoints.length - 1) {
    const w = input.waypoints[reached] as Vec;
    if (dist(companion.x, companion.y, w.x, w.y) > LEAD_REACHED) break;
    reached += 1;
  }
  const rest = input.waypoints.slice(reached);
  const dest = rest[rest.length - 1];
  const next = rest[0];
  if (!dest || !next) return { target: null, speedFactor: 1, reached, waiting: false, arrived: true };
  if (rest.length === 1 && dist(companion.x, companion.y, dest.x, dest.y) <= LEAD_REACHED) {
    return { target: null, speedFactor: 1, reached, waiting: false, arrived: true };
  }
  const gap = dist(companion.x, companion.y, player.x, player.y);
  const playerAhead = dist(player.x, player.y, dest.x, dest.y) + 24 < dist(companion.x, companion.y, dest.x, dest.y);
  if (playerAhead) return { target: next, speedFactor: gap > VIRGIL.leash ? 1.9 : 1.4, reached, waiting: false, arrived: false };
  const waiting = input.waiting ? gap > LEAD_RESUME : gap > LEAD_WAIT;
  if (waiting) return { target: null, speedFactor: 1, reached, waiting: true, arrived: false };
  return { target: next, speedFactor: 1, reached, waiting: false, arrived: false };
}

/**
 * Waypoints from `from` to `to` along a level's spine (`path`): the spine's
 * vertices that lie between them (in the direction of travel), then `to`.
 * Without a spine, a straight line.
 */
export function leadWaypoints(from: Vec, to: Vec, path: readonly Vec[] | null): Vec[] {
  if (!path || path.length < 2) return [to];
  const forward = to.x >= from.x;
  const between = path.filter((p) => (forward ? p.x > from.x + LEAD_REACHED && p.x < to.x : p.x < from.x - LEAD_REACHED && p.x > to.x));
  between.sort((a, b) => (forward ? a.x - b.x : b.x - a.x));
  return [...between, to];
}
