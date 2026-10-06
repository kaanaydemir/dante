/**
 * Level registry. Per-canto levels live in `src/levels/<cantoId>/index.ts` and
 * default-export a LevelModule; they are discovered here at build time, so
 * adding a level never touches a shared list.
 *
 * STARTER IMPLEMENTATION written by the architect. Owner: team D (world).
 * Keep the exports getLevel, listLevels, registerLevel.
 */

import type { LevelModule } from '../../runtime/contracts';
import type { CantoId } from '../../story/types';

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
