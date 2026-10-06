/**
 * The presenter's interaction elements: one awaited thing on screen (a strip,
 * a balloon, a verse, a page, a choice, a card…) with its promise and its
 * input / skip / cancel handlers. Registered synchronously when the runner
 * calls the presenter, so `skip()`, `answer()` and `cancelAll()` work even
 * before the scene has drawn it.
 *
 * Owner: team C (presentation). Pure (no Phaser).
 */

import type { OptionLetter } from '../story/types';
import type { UiAction } from './inputMap';
import type { ActionMeta, PointerMeta } from './router';

export interface ElementHandlers {
  onAction?(action: UiAction, meta: ActionMeta): boolean;
  onPointer?(meta: PointerMeta): boolean;
  /** Debug / autoplay: finish now (take words, end animations). Must settle. */
  skip?(): void;
  /** Settle immediately without animation. */
  cancel?(): void;
  /** The GLOSS of the verse on screen, for Q. */
  gloss?(): string | null;
  /** Answer a choice. */
  answer?(letter: OptionLetter): boolean;
}

/** Ignore advance input this long after an element appears (no accidental skips). */
export const INPUT_GRACE_MS = 140;

export class Pending<T> {
  readonly promise: Promise<T>;
  readonly createdAt: number;
  done = false;
  handlers: ElementHandlers = {};
  private resolveFn: (value: T) => void = () => undefined;

  constructor(
    readonly kind: string,
    public blocking: boolean,
    private readonly fallback: T,
    private readonly onSettle: (p: Pending<T>) => void,
    clock: () => number,
  ) {
    this.createdAt = clock();
    this.promise = new Promise<T>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  settle(value?: T): void {
    if (this.done) return;
    this.done = true;
    try {
      this.onSettle(this);
    } finally {
      this.resolveFn(value === undefined ? this.fallback : value);
    }
  }

  onAction(action: UiAction, meta: ActionMeta, clockNow: number): boolean {
    if (this.done) return false;
    if (clockNow - this.createdAt < INPUT_GRACE_MS && (action === 'advance' || action === 'interact')) return true;
    return this.handlers.onAction?.(action, meta) ?? false;
  }

  onPointer(meta: PointerMeta, clockNow: number): boolean {
    if (this.done) return false;
    if (clockNow - this.createdAt < INPUT_GRACE_MS) return true;
    return this.handlers.onPointer?.(meta) ?? false;
  }

  skip(): void {
    if (this.done) return;
    try {
      this.handlers.skip?.();
    } finally {
      if (!this.handlers.skip) this.settle();
    }
  }

  cancel(): void {
    if (this.done) return;
    try {
      this.handlers.cancel?.();
    } catch {
      // settle below
    }
    this.settle();
  }

  gloss(): string | null {
    return this.handlers.gloss?.() ?? null;
  }

  answer(letter: OptionLetter): boolean {
    if (this.done) return false;
    return this.handlers.answer?.(letter) ?? false;
  }
}
