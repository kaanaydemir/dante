/**
 * How the canvas is scaled to the window. The game renders at 1280×720;
 * the browser stretches the canvas to fit the window. With `pixelArt` on,
 * Phaser asks for nearest-neighbour scaling (`image-rendering: pixelated`),
 * which is perfect at whole-number factors but makes book text uneven at
 * 1.125× or 1.5× (some pixel columns doubled, others not). Text is read
 * more than pixels are admired, so at fractional factors the canvas is
 * smoothed instead; at whole factors it stays crisp.
 *
 * Owner: team C (presentation). Guarded: never throws.
 */

import * as Phaser from 'phaser';
import { crispScaling } from './models/display';

export function watchCanvasQuality(game: Phaser.Game): void {
  const apply = (): void => {
    try {
      const canvas = game.canvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      canvas.style.imageRendering = crispScaling(rect.width, dpr) ? 'pixelated' : 'auto';
    } catch {
      // cosmetic only
    }
  };
  try {
    if (game.isBooted) apply();
    else game.events.once(Phaser.Core.Events.READY, apply);
    game.scale.on(Phaser.Scale.Events.RESIZE, apply);
    window.addEventListener('resize', () => setTimeout(apply, 50));
  } catch {
    // no window (tests) or no scale manager yet
  }
}
