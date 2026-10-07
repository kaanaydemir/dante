/**
 * The Book's content as plain data (pure): which tabs are open, the cantos to
 * list, "As you lived it", "The whole canto" with the reader's lines in gold,
 * the Verses tab (seen lines in canto and line order), the Codex by tab, the
 * Remembrance lists and the map of the circles.
 *
 * Bible §1.5, ENGINE §7.2.
 */

import { CHAPTERS, FIXTURE_CHAPTER } from '../../config';
import type { BookTab, GameStateView, ReadingLogEntry, StoryLibrary } from '../../runtime/contracts';
import { formatCitation, toRoman } from '../../story/cite';
import {
  CANTICLES,
  type Canticle,
  type CantoId,
  type CodexEntry,
  type CodexTab,
  type MemoryEntry,
  type SourceCanto,
  type UnlockFeature,
} from '../../story/types';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export interface TabDef {
  readonly id: BookTab;
  readonly label: string;
  /** Unlock that opens the tab; null = always open. */
  readonly unlock: UnlockFeature | null;
}

/** Bible §1.5 order, then Settings. */
export const BOOK_TABS: readonly TabDef[] = [
  { id: 'cantos', label: 'Cantos', unlock: 'book' },
  { id: 'verses', label: 'Verses', unlock: 'book' },
  { id: 'words', label: 'Words', unlock: 'words' },
  { id: 'codex', label: 'Souls · Places · Lore', unlock: 'codex' },
  { id: 'remembrance', label: 'Remembrance', unlock: 'remembrance' },
  { id: 'map', label: 'Map', unlock: 'codex' },
  { id: 'settings', label: 'Settings', unlock: null },
];

export function visibleTabs(unlocks: readonly UnlockFeature[]): TabDef[] {
  return BOOK_TABS.filter((t) => t.unlock === null || unlocks.includes(t.unlock));
}

/** The tab to open: the requested one if visible, else the first story tab, else Settings. */
export function initialTab(unlocks: readonly UnlockFeature[], wanted?: BookTab | null): BookTab {
  const tabs = visibleTabs(unlocks);
  if (wanted && tabs.some((t) => t.id === wanted)) return wanted;
  return (tabs.find((t) => t.id !== 'settings') ?? tabs[0] ?? BOOK_TABS[BOOK_TABS.length - 1])!.id;
}

// ---------------------------------------------------------------------------
// Cantos
// ---------------------------------------------------------------------------

export interface CantoListItem {
  readonly id: CantoId;
  readonly numeral: string;
  readonly title: string;
  readonly completed: boolean;
  /** The colophon has been reached: the whole Longfellow canto is readable. */
  readonly fullText: boolean;
}

function cantoNumber(id: CantoId): number {
  const n = Number(/\d+$/.exec(id)?.[0] ?? NaN);
  return Number.isFinite(n) ? n : 0;
}

/** Cantos the reader has played (any log entry, completed, or current), in chapter order. */
export function playedCantos(state: GameStateView, story: Pick<StoryLibrary, 'script'>): CantoListItem[] {
  const played = new Set<CantoId>();
  for (const e of state.log) played.add(e.canto);
  for (const c of state.completedCantos) played.add(c);
  if (state.position.canto) played.add(state.position.canto);
  const order: CantoId[] = [];
  for (const ch of [...CHAPTERS, FIXTURE_CHAPTER]) for (const c of ch.cantos) if (!order.includes(c)) order.push(c);
  for (const c of played) if (!order.includes(c)) order.push(c);
  return order
    .filter((id) => played.has(id))
    .map((id) => {
      const script = story.script(id);
      const n = script?.cantoNumber ?? cantoNumber(id);
      const completed = state.completedCantos.includes(id);
      // The colophon opens the whole canto (bible §1.3.8), even while its page is still up.
      const colophonReached =
        script?.scenes.some((s) => s.beats.some((b) => b.mode === 'colophon' && state.seen.includes(b.id))) ?? false;
      return {
        id,
        numeral: toRoman(n) || id,
        title: script?.front.title ?? id,
        completed,
        fullText: completed || colophonReached,
      };
    });
}

/** "As you lived it": the log of one canto, in order. */
export function livedEntries(state: GameStateView, canto: CantoId): ReadingLogEntry[] {
  return state.log.filter((e) => e.canto === canto) as ReadingLogEntry[];
}

export interface CantoLine {
  readonly n: number;
  readonly text: string;
  readonly seen: boolean;
  /** First line of a tercet (n − 1) % 3 === 0: a little space above it. */
  readonly tercetStart: boolean;
}

/** "The whole canto": every Longfellow line, numbered, the reader's lines marked (gold). */
export function wholeCanto(source: SourceCanto, seen: readonly number[]): CantoLine[] {
  const seenSet = new Set(seen);
  return source.lines.map((text, i) => {
    const n = i + 1;
    return { n, text, seen: seenSet.has(n), tercetStart: (n - 1) % 3 === 0 };
  });
}

/** Contiguous runs of sorted line numbers: [1,2,3,7,8] -> [{1,3},{7,8}]. */
export function lineRuns(numbers: readonly number[]): { first: number; last: number }[] {
  const sorted = [...new Set(numbers.filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  const runs: { first: number; last: number }[] = [];
  for (const n of sorted) {
    const last = runs[runs.length - 1];
    if (last && n === last.last + 1) last.last = n;
    else runs.push({ first: n, last: n });
  }
  return runs;
}

export interface VerseRun {
  readonly citation: string;
  readonly lines: readonly { n: number; text: string }[];
}

export interface VersesOfCanto {
  readonly canticle: Canticle;
  readonly canto: number;
  readonly heading: string;
  readonly runs: readonly VerseRun[];
}

/** Verses tab: every line the reader saw, grouped by canto, in canto and line order. */
export function versesSeen(
  state: GameStateView,
  source: (canticle: Canticle, canto: number) => SourceCanto | null,
): VersesOfCanto[] {
  const groups: VersesOfCanto[] = [];
  const keys = Object.keys(state.linesSeen)
    .map((key) => {
      const [canticle, num] = key.split(':');
      return { key, canticle: canticle as Canticle, canto: Number(num) };
    })
    .filter((k) => (CANTICLES as readonly string[]).includes(k.canticle) && Number.isFinite(k.canto))
    .sort((a, b) => CANTICLES.indexOf(a.canticle) - CANTICLES.indexOf(b.canticle) || a.canto - b.canto);
  for (const k of keys) {
    const src = source(k.canticle, k.canto);
    const numbers = state.linesSeen[k.key] ?? [];
    const runs: VerseRun[] = lineRuns(numbers).map((r) => {
      const lines: { n: number; text: string }[] = [];
      for (let n = r.first; n <= r.last; n++) lines.push({ n, text: src?.lines[n - 1] ?? '' });
      return { citation: formatCitation(k.canticle, k.canto, r.first, r.last), lines };
    });
    if (runs.length > 0) {
      groups.push({ canticle: k.canticle, canto: k.canto, heading: `${k.canticle} ${toRoman(k.canto)}`, runs });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Codex and Remembrance
// ---------------------------------------------------------------------------

export const CODEX_TAB_LABELS: Readonly<Record<CodexTab, string>> = {
  souls: 'Souls',
  places: 'Places',
  lore: 'Lore',
};

/** The reader's codex entries by tab, in the order they were given. */
export function codexByTab(state: GameStateView, story: Pick<StoryLibrary, 'codex'>): Record<CodexTab, CodexEntry[]> {
  const out: Record<CodexTab, CodexEntry[]> = { souls: [], places: [], lore: [] };
  for (const id of state.codex) {
    const entry = story.codex(id);
    if (entry) out[entry.tab].push(entry);
  }
  return out;
}

export function memoriesOf(state: GameStateView, story: Pick<StoryLibrary, 'memory'>): MemoryEntry[] {
  return state.memories.map((id) => story.memory(id)).filter((m): m is MemoryEntry => m !== null);
}

/** Bible §3.5 rule 3: Limbo's poets are already remembered (IV 76–78). */
export const REMEMBERED_BY_WORLD: readonly { readonly name: string; readonly note: string }[] = [
  { name: 'Homer', note: 'The first of the poets. He carried a sword.' },
  { name: 'Horace', note: 'The poet of satire and the quiet life.' },
  { name: 'Ovid', note: 'The poet of changes and of love.' },
  { name: 'Lucan', note: 'The poet of Rome at war with itself.' },
  { name: 'Virgil', note: 'Dante’s guide, the poet of Aeneas.' },
];

/** The lines that open the Remembrance tab (bible §3.5 rule 3). */
export const REMEMBRANCE_EPIGRAPH = { canticle: 'Inferno' as Canticle, canto: 4, first: 76, last: 78 };

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

export interface CircleDef {
  readonly id: string;
  /** Roman numeral for the nine circles; empty above Hell. */
  readonly numeral: string;
  readonly name: string;
  readonly cantos: readonly CantoId[];
}

const range = (from: number, to: number): CantoId[] => {
  const out: CantoId[] = [];
  for (let n = from; n <= to; n++) out.push(`inf${String(n).padStart(2, '0')}`);
  return out;
};

/** From the dark wood down to Cocytus (Botticelli's section, top to bottom). */
export const CIRCLES: readonly CircleDef[] = [
  { id: 'wood', numeral: '', name: 'The Dark Wood', cantos: ['inf01', 'inf02'] },
  { id: 'gate', numeral: '', name: 'The Gate and Acheron', cantos: ['inf03'] },
  { id: 'c1', numeral: 'I', name: 'Limbo', cantos: ['inf04'] },
  { id: 'c2', numeral: 'II', name: 'The Lustful', cantos: ['inf05'] },
  { id: 'c3', numeral: 'III', name: 'The Gluttonous', cantos: ['inf06'] },
  { id: 'c4', numeral: 'IV', name: 'The Hoarders and the Wasters', cantos: ['inf07'] },
  { id: 'c5', numeral: 'V', name: 'The Wrathful and the Sullen', cantos: ['inf07', 'inf08'] },
  { id: 'c6', numeral: 'VI', name: 'The Heretics', cantos: range(9, 11) },
  { id: 'c7', numeral: 'VII', name: 'The Violent', cantos: range(12, 17) },
  { id: 'c8', numeral: 'VIII', name: 'The Fraudulent', cantos: range(18, 30) },
  { id: 'c9', numeral: 'IX', name: 'The Traitors', cantos: range(31, 34) },
];

export interface CircleView extends CircleDef {
  readonly reached: boolean;
  /** Where Dante is now. */
  readonly current: boolean;
  /** Name shown (reached, or the order of Hell is known: codex inf05.order_of_hell). */
  readonly named: boolean;
}

export const ORDER_OF_HELL_CODEX = 'inf05.order_of_hell';

export function mapCircles(state: GameStateView): CircleView[] {
  const played = new Set<CantoId>([...state.completedCantos, ...state.log.map((e) => e.canto)]);
  if (state.position.canto) played.add(state.position.canto);
  const knowsOrder = state.codex.includes(ORDER_OF_HELL_CODEX);
  const current = state.position.canto;
  return CIRCLES.map((c) => {
    const reached = c.cantos.some((id) => played.has(id));
    return {
      ...c,
      reached,
      current: current !== null && c.cantos.includes(current),
      named: reached || knowsOrder,
    };
  });
}
