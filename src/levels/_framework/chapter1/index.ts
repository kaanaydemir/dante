/**
 * Chapter 1 (Inferno I–V): the per-canto levels built on the generic layout
 * of each script plus the canto's own moments (docs/ENGINE.md §8.2). The
 * registry uses them unless `src/levels/<cantoId>/index.ts` provides a level.
 *
 * Owner: team D (levels framework).
 */

import type { LevelModule } from '../../../runtime/contracts';
import { createInf01Level } from './inf01';
import { createInf02Level } from './inf02';
import { createInf03Level } from './inf03';
import { createInf04Level } from './inf04';
import { createInf05Level } from './inf05';

export { createInf01Level, createInf02Level, createInf03Level, createInf04Level, createInf05Level };

/** One fresh LevelModule per Chapter 1 canto. */
export function createChapter1Levels(): LevelModule[] {
  return [createInf01Level(), createInf02Level(), createInf03Level(), createInf04Level(), createInf05Level()];
}
