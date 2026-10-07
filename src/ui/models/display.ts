/**
 * Display maths (pure): whether the canvas can be scaled with nearest
 * neighbour without making text uneven.
 *
 * Owner: team C (presentation).
 */

import { GAME_WIDTH } from '../../config';

/**
 * Nearest-neighbour scaling only when every canvas pixel maps onto a whole
 * block of device pixels (1×, 2×, 3×…); fractional factors are smoothed.
 */
export function crispScaling(cssWidth: number, devicePixelRatio: number, gameWidth: number = GAME_WIDTH): boolean {
  if (!(cssWidth > 0) || !(gameWidth > 0)) return true;
  const factor = (cssWidth * (devicePixelRatio > 0 ? devicePixelRatio : 1)) / gameWidth;
  return Math.round(factor) >= 1 && Math.abs(factor - Math.round(factor)) < 0.02;
}
