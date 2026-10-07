/**
 * Level registry. Per-canto levels live in `src/levels/<cantoId>/index.ts` and
 * default-export a LevelModule; they are discovered here at build time, so
 * adding a level never touches a shared list. Chapter 1 falls back to the
 * framework's story levels (`./chapter1`), the fixture to the demo level.
 *
 * Owner: team D (world). Keep the exports getLevel, listLevels, registerLevel.
 */

import type { LevelModule } from '../../runtime/contracts';
import { FIXTURE_CANTO_ID, type CantoId } from '../../story/types';
import { createChapter1Levels } from './chapter1';
import { createDemoLevel } from './demo';

const discovered = import.meta.glob<{ default?: LevelModule }>('/src/levels/{inf,pur,par}*/index.ts', {
  eager: true,
});

const levels = new Map<CantoId, LevelModule>();

for (const [path, mod] of Object.entries(discovered)) {
  const level = mod.default;
  if (level && typeof level.build === 'function') {
    levels.set(level.id, level);
  } else {
    console.warn(`[levels] ${path} has no default-exported LevelModule; ignored.`);
  }
}

// Chapter 1 plays on the framework's story levels (generic layout + the canto's moments)
// unless src/levels/<cantoId>/ provides a level of its own.
for (const level of createChapter1Levels()) if (!levels.has(level.id)) levels.set(level.id, level);

// The engine fixture plays on the framework's demo level unless src/levels/inf99/ provides one.
if (!levels.has(FIXTURE_CANTO_ID)) levels.set(FIXTURE_CANTO_ID, createDemoLevel());

/** Register (or replace) a level at runtime, e.g. from tests or debug tools. */
export function registerLevel(level: LevelModule): void {
  levels.set(level.id, level);
}

/** The level for a canto, or null (the world then builds the generic fallback level). */
export function getLevel(id: CantoId): LevelModule | null {
  return levels.get(id) ?? null;
}

export function listLevels(): readonly LevelModule[] {
  return [...levels.values()];
}
