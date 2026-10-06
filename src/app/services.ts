/**
 * Service registry: the one place scenes get the session, store, story,
 * presenter, world and audio from. Set once by bootstrap() before the Phaser
 * game boots. Architect-owned.
 *
 *   import { services } from '../app/services';
 *   const { session, store } = services();
 */

import type * as Phaser from 'phaser';
import type { CoreServices, StoryPresenter, WorldBridge } from '../runtime/contracts';

export interface Services extends CoreServices {
  readonly game: Phaser.Game;
  readonly presenter: StoryPresenter;
  readonly world: WorldBridge;
  /** window.__dante is installed (?debug=1 or vite dev). */
  readonly debug: boolean;
}

let current: Services | null = null;

export function setServices(s: Services): void {
  current = s;
}

/** Throws if bootstrap() has not run: scenes are only created after it. */
export function services(): Services {
  if (!current) throw new Error('services() called before bootstrap()');
  return current;
}

export function tryServices(): Services | null {
  return current;
}
