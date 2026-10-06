/**
 * Choice margin navigation (pure): which option is highlighted, how keys move
 * it, and which letter a key or a click picks. Bible §1.3.5: 2–3 options, no
 * timer, no numbers on screen (number keys still work).
 */

import type { OptionLetter } from '../../story/types';
import type { ChoiceOptionView } from '../../runtime/contracts';

export class ChoiceCursor {
  private idx = 0;

  constructor(private readonly options: readonly ChoiceOptionView[]) {}

  get index(): number {
    return this.idx;
  }

  get count(): number {
    return this.options.length;
  }

  get letter(): OptionLetter | null {
    return this.options[this.idx]?.letter ?? null;
  }

  /** Move by `delta` with wrap-around. */
  move(delta: number): number {
    const n = this.options.length;
    if (n === 0) return 0;
    this.idx = (((this.idx + delta) % n) + n) % n;
    return this.idx;
  }

  set(index: number): boolean {
    if (index < 0 || index >= this.options.length) return false;
    this.idx = index;
    return true;
  }

  /** Number key 1–3 -> option index (by position on screen), or -1. */
  indexForNumber(n: number): number {
    return n >= 1 && n <= this.options.length ? n - 1 : -1;
  }

  indexOfLetter(letter: OptionLetter): number {
    return this.options.findIndex((o) => o.letter === letter);
  }
}

/** True when a spoken option's text is shown inside its quotes (bible §2.9: `["…"]`). */
export function isSpokenText(text: string): boolean {
  const t = text.trim();
  return t.startsWith('"') && t.endsWith('"') && t.length >= 2;
}
