/**
 * What the presenter needs from the book layer's scenes, as interfaces, so it
 * reaches them through `game.scene.getScene(key)` without importing scene
 * classes (ENGINE §3.2).
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import type { BookTab } from '../runtime/contracts';
import type { BookSpread } from './components/BookSpread';
import type { Hud } from './components/Hud';
import type { OverlaySet } from './components/OverlaySet';
import type { ScreenFx } from './components/ScreenFx';
import type { ReadyFlag } from './phaser/helpers';

export interface OverlayHost extends ReadyFlag {
  readonly overlays: OverlaySet;
}

export interface UiSceneApi extends OverlayHost {
  readonly hud: Hud;
  readonly fx: ScreenFx;
  setCanto(location: string, label: string): void;
}

export interface BookPageApi extends OverlayHost {
  readonly spread: BookSpread;
  /** Dark backdrop that hides the world while the book is closed between pages. */
  showCurtain(alpha?: number): void;
  hideCurtain(ms: number): Promise<void>;
  /** Tween the curtain to `alpha` (the book read on a dark table). */
  dimCurtain(alpha: number, ms: number): Promise<void>;
  readonly curtainUp: boolean;
  /** The opening page's vignette left alone on the dark after the page is turned (bible §1.3.2). */
  holdVignette(image: Phaser.GameObjects.Image | null): void;
  /** Unengrave: the vignette grows to fill the screen and fades into the world. */
  growVignette(ms: number): Promise<void>;
  dropVignette(ms: number): Promise<void>;
  readonly holding: boolean;
  /** Small Book icon over pages (word cards fly here). */
  pulseBook(): void;
  /** Jump running transitions (vignette, curtain) to their end (autoplay / skip). */
  finishTransitions(): void;
  /** Remove everything at once. */
  reset(): void;
}

export interface BookMenuOpenData {
  readonly tab?: BookTab | null;
  /** Opened from the title (only Settings matters; nothing to pause). */
  readonly fromTitle?: boolean;
}
