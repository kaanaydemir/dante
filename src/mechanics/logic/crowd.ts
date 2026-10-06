/**
 * The runners behind the banner (Canto III; GDD 4.1, `PatternHazard`): the
 * banner turns on a schedule and the crowd follows it, pushing whoever stands
 * in the way.
 *
 * Owner: team D (mechanics). Pure: no Phaser.
 */

import type { Vec } from '../../world/geometry';

export interface FlowSchedule {
  /** Directions in degrees (0 = east, 90 = south), visited in order, looping. */
  readonly angles: readonly number[];
  /** How long the banner keeps one heading. */
  readonly everyMs: number;
  /** How long a turn takes (the crowd bends smoothly). */
  readonly turnMs: number;
}

export const DEFAULT_FLOW: FlowSchedule = { angles: [0, 160, 300, 110, 220], everyMs: 6500, turnMs: 1200 };

/** Index of the heading at `time` (ms). */
export function headingIndex(schedule: FlowSchedule, time: number): number {
  const n = Math.max(1, schedule.angles.length);
  return Math.floor(Math.max(0, time) / Math.max(1, schedule.everyMs)) % n;
}

/** Shortest signed difference b - a in degrees (-180, 180]. */
export function angleDelta(a: number, b: number): number {
  let d = (((b - a) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** The banner's heading (degrees) at `time`, easing from the previous heading during a turn. */
export function flowAngle(schedule: FlowSchedule, time: number): number {
  const n = Math.max(1, schedule.angles.length);
  const i = headingIndex(schedule, time);
  const target = schedule.angles[i] ?? 0;
  const prev = schedule.angles[(i - 1 + n) % n] ?? target;
  const into = Math.max(0, time) % Math.max(1, schedule.everyMs);
  if (time < schedule.everyMs || into >= schedule.turnMs) return target;
  const t = into / Math.max(1, schedule.turnMs);
  const eased = t * t * (3 - 2 * t);
  return prev + angleDelta(prev, target) * eased;
}

export function flowVector(schedule: FlowSchedule, time: number): Vec {
  const a = (flowAngle(schedule, time) * Math.PI) / 180;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Did the heading change between two times (the banner turned)? */
export function turnedBetween(schedule: FlowSchedule, before: number, after: number): boolean {
  return headingIndex(schedule, before) !== headingIndex(schedule, after) && after >= schedule.everyMs;
}
