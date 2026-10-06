/**
 * The tercet composer on the Words page (bible §3.4.5): A · B · A slots, a
 * second tercet and a coda once chains are open. Pure state; validation and
 * the cento come from the verse module (team B's evaluateVerse).
 */

import type { ComposedVerse, Tercet, VerseContext, VerseEvaluation } from '../../runtime/contracts';
import { evaluateVerse } from '../../verse/tercet';
import { getWord, isRhyme } from '../../story/words';
import type { WordName } from '../../story/types';

export type SlotRef = { readonly kind: 'tercet'; readonly tercet: number; readonly slot: 0 | 1 | 2 } | { readonly kind: 'coda' };

export function slotKey(ref: SlotRef): string {
  return ref.kind === 'coda' ? 'coda' : `${ref.tercet}:${ref.slot}`;
}

export function sameSlot(a: SlotRef, b: SlotRef): boolean {
  return slotKey(a) === slotKey(b);
}

export type WordUse = 'usable' | 'sealed' | 'burden' | 'unknown';

export interface ComposerWord {
  readonly name: WordName;
  readonly use: WordUse;
}

export class ComposerModel {
  /** tercets[t][slot] */
  readonly tercets: (WordName | null)[][];
  coda: WordName | null = null;
  focus: SlotRef = { kind: 'tercet', tercet: 0, slot: 0 };

  constructor(
    readonly maxTercets: number,
    readonly codaOpen: boolean,
  ) {
    this.tercets = Array.from({ length: Math.max(1, maxTercets) }, () => [null, null, null]);
  }

  /** Start from an existing verse (the equipped one). Words beyond the open slots are dropped. */
  static from(verse: ComposedVerse | null, maxTercets: number, codaOpen: boolean): ComposerModel {
    const m = new ComposerModel(maxTercets, codaOpen);
    if (!verse) return m;
    verse.tercets.slice(0, m.tercets.length).forEach((t, i) => {
      m.tercets[i] = [t[0] ?? null, t[1] ?? null, t[2] ?? null];
    });
    if (codaOpen) m.coda = verse.coda ?? null;
    return m;
  }

  /** Every slot in reading order: tercet 1 (A B A), tercet 2 (A B A), coda. */
  slots(): SlotRef[] {
    const out: SlotRef[] = [];
    this.tercets.forEach((_, t) => {
      for (const slot of [0, 1, 2] as const) out.push({ kind: 'tercet', tercet: t, slot });
    });
    if (this.codaOpen) out.push({ kind: 'coda' });
    return out;
  }

  get(ref: SlotRef): WordName | null {
    if (ref.kind === 'coda') return this.coda;
    return this.tercets[ref.tercet]?.[ref.slot] ?? null;
  }

  private setSlot(ref: SlotRef, word: WordName | null): void {
    if (ref.kind === 'coda') {
      this.coda = word;
      return;
    }
    const t = this.tercets[ref.tercet];
    if (t) t[ref.slot] = word;
  }

  /** Where a word sits now, if anywhere. */
  find(word: WordName): SlotRef | null {
    for (const ref of this.slots()) if (this.get(ref) === word) return ref;
    return null;
  }

  /**
   * Put a word in the focused slot (moving it if it sits elsewhere), then move
   * the focus to the next empty slot. Returns false when nothing changed.
   */
  place(word: WordName, at: SlotRef = this.focus): boolean {
    const from = this.find(word);
    if (from && sameSlot(from, at)) return false;
    const previous = this.get(at);
    if (from) this.setSlot(from, previous);
    this.setSlot(at, word);
    const next = this.nextEmpty(at);
    if (next) this.focus = next;
    return true;
  }

  clear(ref: SlotRef = this.focus): boolean {
    if (this.get(ref) === null) return false;
    this.setSlot(ref, null);
    return true;
  }

  clearAll(): void {
    for (const ref of this.slots()) this.setSlot(ref, null);
    this.focus = { kind: 'tercet', tercet: 0, slot: 0 };
  }

  /** The next empty slot after `ref` in reading order (wrapping), or null when all are full. */
  nextEmpty(ref: SlotRef): SlotRef | null {
    const all = this.slots();
    const i = all.findIndex((s) => sameSlot(s, ref));
    for (let k = 1; k <= all.length; k++) {
      const s = all[(i + k) % all.length] as SlotRef;
      // The second tercet and the coda are optional: only suggest them once the first tercet is full.
      if (this.get(s) === null && (this.isFirstTercet(s) || this.firstTercetFull())) return s;
    }
    return null;
  }

  moveFocus(delta: number): SlotRef {
    const all = this.slots();
    const i = all.findIndex((s) => sameSlot(s, this.focus));
    const next = all[(((i + delta) % all.length) + all.length) % all.length] as SlotRef;
    this.focus = next;
    return next;
  }

  private isFirstTercet(ref: SlotRef): boolean {
    return ref.kind === 'tercet' && ref.tercet === 0;
  }

  private firstTercetFull(): boolean {
    const t = this.tercets[0];
    return !!t && t.every((w) => w !== null);
  }

  /** The verse as composed: empty optional tercets and an empty coda are left out. */
  toVerse(): ComposedVerse {
    const tercets: Tercet[] = [];
    this.tercets.forEach((t, i) => {
      const filled = t.some((w) => w !== null);
      if (i === 0 || filled) tercets.push([t[0] ?? '', t[1] ?? '', t[2] ?? ''] as Tercet);
    });
    return { tercets, coda: this.codaOpen ? this.coda : null };
  }

  isEmpty(): boolean {
    return this.slots().every((s) => this.get(s) === null);
  }

  evaluate(ctx: VerseContext): VerseEvaluation {
    return evaluateVerse(this.toVerse(), ctx);
  }

  /**
   * Would `word` fit the slot given what is already placed? A gentle hint for
   * the word list (the evaluation is the judge).
   */
  fits(word: WordName, ref: SlotRef = this.focus): boolean {
    const def = getWord(word);
    if (!def || def.role === 'burden') return false;
    if (ref.kind === 'coda') {
      const last = this.lastFilledTercet();
      const middle = last ? last[1] : null;
      return middle !== null && isRhyme(middle, word) && this.find(word) === null;
    }
    const t = this.tercets[ref.tercet] ?? [null, null, null];
    if (def.role === 'closer' && ref.slot !== 1) return false;
    if (ref.slot === 1) {
      const outer = t[0] ?? t[2];
      if (!outer) return true;
      const outerFamily = getWord(outer)?.family ?? null;
      return def.family === null || def.family !== outerFamily;
    }
    const other = ref.slot === 0 ? t[2] : t[0];
    if (ref.tercet > 0 && ref.slot === 0) {
      const prevMiddle = this.tercets[ref.tercet - 1]?.[1] ?? null;
      if (prevMiddle && !isRhyme(prevMiddle, word)) return false;
    }
    if (!other) return def.family !== null;
    return isRhyme(other, word);
  }

  private lastFilledTercet(): (WordName | null)[] | null {
    for (let i = this.tercets.length - 1; i >= 0; i--) {
      const t = this.tercets[i];
      if (t && t.some((w) => w !== null)) return t;
    }
    return null;
  }
}

/** The words of the composer's list: owned ones, with what can be done with them. */
export function composerWords(owned: readonly WordName[], sealed: readonly WordName[]): ComposerWord[] {
  return owned.map((name) => {
    const def = getWord(name);
    if (!def) return { name, use: 'unknown' as const };
    if (def.role === 'burden') return { name: def.name, use: 'burden' as const };
    if (sealed.includes(def.name)) return { name: def.name, use: 'sealed' as const };
    return { name: def.name, use: 'usable' as const };
  });
}

/** The first issue worth showing for a partly composed verse (empty-slot notes are quiet until the tercet is full). */
export function headlineIssue(evaluation: VerseEvaluation, model: ComposerModel): string | null {
  if (evaluation.valid) return null;
  const filled = model.toVerse().tercets[0]?.every((w) => w) ?? false;
  const issue = evaluation.issues.find((i) => i.code !== 'empty') ?? (filled ? evaluation.issues[0] : null);
  return issue ? issue.message : null;
}
