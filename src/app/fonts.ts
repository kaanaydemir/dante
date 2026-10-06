/**
 * Font loading. The @font-face rules come from the @fontsource CSS imported in
 * main.ts (bundled locally, no network). Phaser Text measures glyphs when it
 * is created, so Boot waits for the faces before any scene draws text.
 * Architect-owned.
 */

import { FONT_FACES_TO_LOAD } from '../config';

/** Resolves when the book and UI fonts are ready, or after `timeoutMs` (then system fallbacks are used). */
export async function loadFonts(timeoutMs = 4000): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = FONT_FACES_TO_LOAD.map((face) => document.fonts.load(face).catch(() => []));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([Promise.all(loads).then(() => undefined), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
