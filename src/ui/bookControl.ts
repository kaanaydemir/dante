/**
 * Opening and closing the Book (the pause menu, bible §1.5): pauses the World,
 * UI and page scenes, launches BookMenuScene, tells the runner through the
 * bus ('ui:book'), and resumes exactly what it paused.
 *
 * Owner: team C (presentation).
 */

import * as Phaser from 'phaser';
import type { BookTab, EventBus } from '../runtime/contracts';
import { SceneKeys } from '../scenes/keys';
import { sfx } from './context';
import { isAlive, sceneStatus } from './phaser/helpers';

let open = false;
let paused: string[] = [];

export function isBookOpen(): boolean {
  return open;
}

export function openBook(game: Phaser.Game, bus: EventBus | null, opts: { tab?: BookTab | null; fromTitle?: boolean } = {}): void {
  if (open) return;
  open = true;
  paused = [];
  for (const key of [SceneKeys.World, SceneKeys.UI, SceneKeys.BookPage, SceneKeys.Title]) {
    if (sceneStatus(game, key) === Phaser.Scenes.RUNNING) {
      try {
        game.scene.pause(key);
        paused.push(key);
      } catch {
        // keep going
      }
    }
  }
  try {
    game.scene.start(SceneKeys.BookMenu, { tab: opts.tab ?? null, fromTitle: opts.fromTitle ?? false });
  } catch {
    // the Book failed to open: undo
    open = false;
    resumePaused(game);
    return;
  }
  sfx('page');
  bus?.emit('ui:book', opts.tab ? { open: true, tab: opts.tab } : { open: true });
}

function resumePaused(game: Phaser.Game): void {
  for (const key of paused) {
    try {
      if (sceneStatus(game, key) === Phaser.Scenes.PAUSED) game.scene.resume(key);
    } catch {
      // keep going
    }
  }
  paused = [];
}

export function closeBook(game: Phaser.Game, bus: EventBus | null): void {
  if (!open) return;
  open = false;
  try {
    if (isAlive(game, SceneKeys.BookMenu)) game.scene.stop(SceneKeys.BookMenu);
  } catch {
    // already stopped
  }
  resumePaused(game);
  sfx('page');
  bus?.emit('ui:book', { open: false });
}

/** Forget the Book without resuming anything (showTitle stops every scene anyway). */
export function forgetBook(game: Phaser.Game): void {
  if (open) {
    try {
      if (isAlive(game, SceneKeys.BookMenu)) game.scene.stop(SceneKeys.BookMenu);
    } catch {
      // already stopped
    }
  }
  open = false;
  paused = [];
}
