/**
 * Minos's court (bible §7.5, GDD 3.7): three nameless souls confess; the
 * player guesses how many times Minos girds himself with his tail (the circle,
 * 2–9). Two right answers or more emit `inf05.minos_two_right`.
 *
 * Owner: team D (mechanics). Pure: no Phaser.
 */

import { seededRandom } from '../../world/geometry';

export interface Confession {
  /** The soul's own words (modern, nameless; one balloon). */
  readonly text: string;
  /** The circle Minos sends it to: the number of coils of his tail. */
  readonly circle: number;
}

/** The bible's sample confessions (EKLEME), answers 2–9 in order. */
export const DEFAULT_CONFESSIONS: readonly Confession[] = [
  { text: 'I lived for pleasure and called it love.', circle: 2 },
  { text: 'I ate and drank while my house went hungry.', circle: 3 },
  { text: 'I kept every coin. I gave nothing away.', circle: 4 },
  { text: 'I raged at everyone, every day of my life.', circle: 5 },
  { text: 'I taught that the soul dies with the body.', circle: 6 },
  { text: 'I took my own life.', circle: 7 },
  { text: 'I sold holy things for silver.', circle: 8 },
  { text: 'I betrayed the friend who trusted me at my own table.', circle: 9 },
];

export const MIN_CIRCLE = 2;
export const MAX_CIRCLE = 9;
/** Right answers needed for the event (bible §4.9). */
export const RIGHT_NEEDED = 2;

/** `count` different confessions, picked deterministically from `seed`, in a stable order. */
export function pickConfessions(seed: number, count = 3, pool: readonly Confession[] = DEFAULT_CONFESSIONS): Confession[] {
  const rnd = seededRandom(seed);
  const rest = [...pool];
  const out: Confession[] = [];
  while (out.length < count && rest.length > 0) {
    const i = Math.floor(rnd() * rest.length);
    out.push(rest.splice(i, 1)[0] as Confession);
  }
  return out;
}

export interface GuessResult {
  readonly guess: number;
  readonly answer: number;
  readonly correct: boolean;
  /** The game is over after this guess. */
  readonly done: boolean;
}

export class JudgementGame {
  private index = 0;
  private right = 0;
  private readonly results: GuessResult[] = [];

  constructor(private readonly confessions: readonly Confession[]) {}

  get total(): number {
    return this.confessions.length;
  }

  get rightCount(): number {
    return this.right;
  }

  get done(): boolean {
    return this.index >= this.confessions.length;
  }

  /** At least two right (the event's condition). */
  get passed(): boolean {
    return this.right >= RIGHT_NEEDED;
  }

  get history(): readonly GuessResult[] {
    return this.results;
  }

  current(): Confession | null {
    return this.confessions[this.index] ?? null;
  }

  /** Judge the current soul. Out-of-range guesses are clamped to 2–9. */
  guess(n: number): GuessResult | null {
    const c = this.current();
    if (!c) return null;
    const g = Math.max(MIN_CIRCLE, Math.min(MAX_CIRCLE, Math.round(n)));
    const correct = g === c.circle;
    if (correct) this.right += 1;
    this.index += 1;
    const res: GuessResult = { guess: g, answer: c.circle, correct, done: this.done };
    this.results.push(res);
    return res;
  }
}

/** Roman numerals for the circle stones (II–IX). */
export function circleNumeral(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n] ?? String(n);
}
