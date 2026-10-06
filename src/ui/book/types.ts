/**
 * Shared types of the Book's tab views (BookMenuScene).
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import type { EventBus, GameSession, GameStateStore, StoryLibrary } from '../../runtime/contracts';
import type { UiAction } from '../inputMap';
import type { ActionMeta } from '../router';
import type { Box } from './widgets';

export interface BookCtx {
  readonly scene: Phaser.Scene;
  /** The tab's own container (emptied when the tab changes). */
  readonly root: Phaser.GameObjects.Container;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly bus: EventBus;
  readonly session: GameSession;
  readonly left: Box;
  readonly right: Box;
  /** Opened during play (not from the title). */
  readonly inGame: boolean;
  /** Rebuild the current tab (after settings changes). */
  rerender(): void;
  close(): void;
  /** Hints at the foot of the pages. */
  footer(left: string, right?: string): void;
}

export interface BookTabView {
  /** Left / Right are used inside the tab (else they switch tabs). */
  readonly capturesHorizontal: boolean;
  onAction(action: UiAction, meta: ActionMeta): boolean;
  onWheel?(dy: number): void;
  destroy(): void;
}
