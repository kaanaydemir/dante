/**
 * HUD maths (pure): resource bar segments, the heart scale's pose (beam tilt
 * and the weight in each pan, never a number: bible §3.1), and the fear
 * vignette's intensity.
 */

import { HEART_TILT_CLAMP, RESOURCES } from '../../config';

/** Fill (0–1) of each unit segment of a bar holding `value` of `max` units. */
export function segments(value: number, max: number): number[] {
  const units = Math.max(0, Math.round(max));
  const v = Math.max(0, Math.min(units, Number.isFinite(value) ? value : 0));
  const out: number[] = [];
  for (let i = 0; i < units; i++) out.push(Math.max(0, Math.min(1, v - i)));
  return out;
}

export interface ScalePose {
  /** Beam rotation in degrees; negative lifts the right (justice) end, i.e. the pity side sinks. */
  readonly beamDeg: number;
  /** Vertical drop of each pan in px (relative to level), follows the beam. */
  readonly pityDrop: number;
  readonly justiceDrop: number;
  /** 0–1 heap of weight drawn in each pan (counters, softly capped; no numbers). */
  readonly pityLoad: number;
  readonly justiceLoad: number;
  /** Both pans empty: the neutrals' scale (bible §3.1, III 50). */
  readonly empty: boolean;
}

/** Degrees of beam rotation per point of balance at the clamp. */
export const SCALE_MAX_DEG = 16;

/**
 * Pose of the scale for pity and justice counters. The tilt is the balance
 * (pity − justice) clamped to ±HEART_TILT_CLAMP; pity sits in the left pan.
 * `armPx` is the half-length of the beam (pan drop = arm × sin(angle)).
 */
export function scalePose(pity: number, justice: number, armPx = 14): ScalePose {
  const p = Math.max(0, pity);
  const j = Math.max(0, justice);
  const balance = Math.max(-HEART_TILT_CLAMP, Math.min(HEART_TILT_CLAMP, p - j));
  // Pity heavier -> left end down. Screen rotation is clockwise-positive, so left-down is negative.
  const beamDeg = -(balance / HEART_TILT_CLAMP) * SCALE_MAX_DEG;
  const rad = (beamDeg * Math.PI) / 180;
  const drop = armPx * Math.sin(rad);
  const load = (n: number): number => (n <= 0 ? 0 : Math.min(1, 0.25 + 0.75 * (1 - Math.exp(-n / 3))));
  return {
    beamDeg,
    pityDrop: -drop,
    justiceDrop: drop,
    pityLoad: load(p),
    justiceLoad: load(j),
    empty: p === 0 && j === 0,
  };
}

/**
 * Fear vignette intensity (0–1): grows while Resolve keeps falling (fear zones,
 * hits), and with how low Resolve is. `fallingRecently` is true when the last
 * decrease was within the last second.
 */
export function fearIntensity(resolve: number, fallingRecently: boolean): number {
  const low = 1 - Math.max(0, Math.min(1, resolve / RESOURCES.resolveMax));
  const base = fallingRecently ? 0.35 + 0.5 * low : 0.6 * Math.max(0, low - 0.5);
  return Math.max(0, Math.min(1, base));
}
