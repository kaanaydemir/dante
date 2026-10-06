/**
 * Phaser helpers for the book layer: scene readiness, text objects, text
 * measurement that matches Phaser's own canvas text, small tween promises.
 *
 * Owner: team C (presentation).
 */

import * as Phaser from 'phaser';
import { canvasFont, type TextStyleSpec } from '../theme';
import { typeset, type Measure } from '../text';
import { FONT_FAMILY } from '../../config';

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

/** Scenes of the book layer set this flag at the end of create() and clear it on shutdown. */
export interface ReadyFlag {
  uiReady: boolean;
}

const S = Phaser.Scenes;

export function sceneStatus(game: Phaser.Game, key: string): number {
  const scene = game.scene.getScene(key);
  return scene ? scene.sys.settings.status : -1;
}

/** RUNNING or PAUSED (the Book pauses scenes; they still exist and draw). */
export function isAlive(game: Phaser.Game, key: string): boolean {
  const s = sceneStatus(game, key);
  return s === S.RUNNING || s === S.PAUSED;
}

export function getScene<T>(game: Phaser.Game, key: string): T | null {
  const scene = game.scene.getScene(key);
  return (scene as unknown as T) ?? null;
}

/**
 * Make sure a scene runs and has finished create(). Starts it when stopped,
 * wakes it when sleeping, keeps it paused when paused. Resolves with the
 * scene (or null if it never came up within `timeoutMs`). Never rejects.
 */
export function ensureScene<T extends object>(game: Phaser.Game, key: string, timeoutMs = 3000): Promise<T | null> {
  const scene = game.scene.getScene(key);
  if (!scene) return Promise.resolve(null);
  const ready = (): boolean => {
    const st = scene.sys.settings.status;
    return (st === S.RUNNING || st === S.PAUSED) && (scene as unknown as Partial<ReadyFlag>).uiReady === true;
  };
  if (ready()) return Promise.resolve(scene as unknown as T);
  const st = scene.sys.settings.status;
  try {
    if (st === S.SLEEPING) game.scene.wake(key);
    else if (st !== S.START && st !== S.LOADING && st !== S.CREATING && st !== S.RUNNING && st !== S.PAUSED) game.scene.start(key);
  } catch {
    // fall through to polling
  }
  if (ready()) return Promise.resolve(scene as unknown as T);
  return new Promise<T | null>((resolve) => {
    const started = Date.now();
    let done = false;
    const finish = (value: T | null): void => {
      if (done) return;
      done = true;
      game.events.off(Phaser.Core.Events.POST_STEP, poll);
      resolve(value);
    };
    const poll = (): void => {
      if (ready()) finish(scene as unknown as T);
      else if (Date.now() - started > timeoutMs) finish(null);
    };
    game.events.on(Phaser.Core.Events.POST_STEP, poll);
    // Also check soon in case the game loop is throttled (hidden tab).
    setTimeout(poll, 50);
    setTimeout(() => finish(ready() ? (scene as unknown as T) : null), timeoutMs + 50);
  });
}

export function stopScene(game: Phaser.Game, key: string): void {
  try {
    const s = sceneStatus(game, key);
    if (s >= S.START && s <= S.SLEEPING) game.scene.stop(key);
  } catch {
    // already stopped
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** A text object; book-face text gets curly quotes (display typography). */
export function addText(scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyleSpec): Phaser.GameObjects.Text {
  const shown = style.fontFamily === FONT_FAMILY.book ? typeset(text) : text;
  return scene.add.text(x, y, shown, style as Phaser.Types.GameObjects.Text.TextStyle);
}

let measureCtx: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();

/** A measuring function for a style (same font string Phaser uses). Falls back to an estimate without canvas. */
export function measurer(style: Pick<TextStyleSpec, 'fontFamily' | 'fontSize' | 'fontStyle' | 'letterSpacing'>): Measure {
  const font = canvasFont(style);
  const spacing = style.letterSpacing ?? 0;
  const px = Number.parseFloat(style.fontSize) || 20;
  return (text: string): number => {
    const key = `${font}|${spacing}|${text}`;
    const cached = widthCache.get(key);
    if (cached !== undefined) return cached;
    let w = text.length * px * 0.5;
    try {
      if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
      if (measureCtx) {
        measureCtx.font = font;
        w = measureCtx.measureText(text).width + spacing * Math.max(0, text.length - 1);
      }
    } catch {
      // keep the estimate
    }
    if (widthCache.size > 4000) widthCache.clear();
    widthCache.set(key, w);
    return w;
  };
}

// ---------------------------------------------------------------------------
// Tweens and time
// ---------------------------------------------------------------------------

/** A tween as a promise (resolves on complete or when the tween is stopped / the scene shuts down). */
export function tweenTo(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const userComplete = config.onComplete;
      const tween = scene.tweens.add({
        ...config,
        onComplete: (...args: unknown[]) => {
          if (typeof userComplete === 'function') (userComplete as (...a: unknown[]) => void)(...args);
          done();
        },
        onStop: done,
      });
      if (!tween) done();
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, done);
    } catch {
      done();
    }
  });
}

/** Stop every tween of a target so promise-wrapped tweens settle (killTweensOf would leave them pending). */
export function stopTweens(scene: Phaser.Scene, target: object): void {
  try {
    for (const t of scene.tweens.getTweensOf(target)) t.stop();
  } catch {
    // nothing to stop
  }
}

/** scene.time based delay (pauses with the scene). Resolves early on shutdown. */
export function delay(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    if (ms <= 0) {
      done();
      return;
    }
    try {
      scene.time.delayedCall(ms, done);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, done);
    } catch {
      setTimeout(done, ms);
    }
  });
}

/**
 * Destroy a game object safely (it may already be gone). Tweens on it and on
 * every child of a container are killed first, so nothing animates a corpse.
 */
export function destroy(obj: { destroy(): void; active?: boolean } | null | undefined): void {
  if (!obj) return;
  try {
    const go = obj as unknown as Phaser.GameObjects.GameObject;
    const scene = go.scene;
    if (scene && scene.tweens) {
      const kill = (o: Phaser.GameObjects.GameObject): void => {
        // stop() (not destroy) so promise-wrapped tweens settle through onStop.
        for (const t of scene.tweens.getTweensOf(o)) {
          try {
            t.stop();
          } catch {
            // already finished
          }
        }
        if (o instanceof Phaser.GameObjects.Container) for (const child of o.list) kill(child);
      };
      kill(go);
    }
  } catch {
    // no scene or tweens: just destroy
  }
  try {
    obj.destroy();
  } catch {
    // already destroyed
  }
}

export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
