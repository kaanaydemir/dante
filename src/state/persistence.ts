/**
 * Save-file format, versioning and validation; settings validation.
 *
 * Owner: team B (state). Pure: works on strings and plain objects; the store
 * does the (try/catch-wrapped) storage calls.
 *
 * Save file (`localStorage['dante.save.v1']`):
 *   { "format": "dante-save", "version": 1, "savedAt": <ms>, "state": GameStateData }
 * A bare GameStateData (version 1) is also accepted. Anything unreadable,
 * malformed or from a newer version loads as `null` (the game then starts
 * fresh) instead of throwing. Missing or mistyped fields are repaired from
 * a fresh state, so older saves keep working when fields are added.
 */

import { FONT_SCALES, RESOURCES, TEXT_SPEEDS, TRUST, type FontScale, type TextSpeed } from '../config';
import {
  DEFAULT_SETTINGS,
  type CheckpointRef,
  type ChoiceRecord,
  type ComposedVerse,
  type GameProfile,
  type GameStateData,
  type HeartLedgerEntry,
  type PendingReveal,
  type Position,
  type ReadingLogEntry,
  type RevealCard,
  type RevealHeading,
  type RevealSetting,
  type Settings,
  type Tercet,
  type VerseDisplay,
  type VerseRecord,
} from '../runtime/contracts';
import {
  CHOICE_WEIGHTS,
  OPTION_LETTERS,
  UNLOCK_FEATURES,
  VIRTUES,
  type ChoiceWeight,
  type OptionLetter,
  type UnlockFeature,
} from '../story/types';
import { createInitialState } from './initial';

export const SAVE_FORMAT = 'dante-save';
/** Current save-file version. Bump it and add a migration when GameStateData changes shape. */
export const SAVE_VERSION = 1;

export interface SaveEnvelope {
  readonly format: typeof SAVE_FORMAT;
  readonly version: number;
  readonly savedAt: number;
  readonly state: GameStateData;
}

type Json = Record<string, unknown>;

/**
 * Migrations from version N to N + 1, applied in order to the raw state
 * object. Version 1 is the first format, so there is nothing to migrate yet.
 */
const MIGRATIONS: Readonly<Record<number, (raw: Json) => Json>> = {};

// ---------------------------------------------------------------------------
// Small validators
// ---------------------------------------------------------------------------

export function isRecord(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number, lo = -Infinity, hi = Infinity): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Unique strings, in order; anything else dropped. */
function strings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) if (typeof x === 'string' && x.length > 0 && !out.includes(x)) out.push(x);
  return out;
}

function oneOf<T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;
}

function letter(v: unknown): OptionLetter | null {
  return (OPTION_LETTERS as readonly unknown[]).includes(v) ? (v as OptionLetter) : null;
}

function canon(v: unknown): OptionLetter[] | 'all' | 'none' | null {
  if (v === 'all' || v === 'none') return v;
  if (Array.isArray(v)) {
    const letters = v.map(letter).filter((l): l is OptionLetter => l !== null);
    return letters;
  }
  return null;
}

function heading(v: unknown): RevealHeading | null {
  return v === 'What Dante did' || v === 'As Dante did' ? v : null;
}

// ---------------------------------------------------------------------------
// Structured parts
// ---------------------------------------------------------------------------

function normalizeVerse(v: unknown): ComposedVerse | null {
  if (!isRecord(v) || !Array.isArray(v.tercets)) return null;
  const tercets: Tercet[] = [];
  for (const t of v.tercets) {
    if (Array.isArray(t) && t.length === 3 && t.every((w) => typeof w === 'string')) {
      tercets.push([t[0] as string, t[1] as string, t[2] as string]);
    }
  }
  return { tercets, coda: strOrNull(v.coda) };
}

function normalizeChoiceRecord(key: string, v: unknown): ChoiceRecord | null {
  if (!isRecord(v)) return null;
  const l = letter(v.letter);
  if (!l) return null;
  return {
    choice: str(v.choice, key),
    canto: str(v.canto, key.split('.')[0] ?? ''),
    beat: str(v.beat, ''),
    title: str(v.title, ''),
    weight: oneOf<ChoiceWeight>(v.weight, CHOICE_WEIGHTS, 'minor'),
    systemic: bool(v.systemic, false),
    letter: l,
    optionText: str(v.optionText, ''),
    canon: canon(v.canon),
    heading: heading(v.heading),
    note: strOrNull(v.note),
    order: num(v.order, 0, 0),
  };
}

function normalizeLogEntry(v: unknown): ReadingLogEntry | null {
  if (!isRecord(v) || typeof v.canto !== 'string' || typeof v.beat !== 'string') return null;
  switch (v.kind) {
    case 'narration':
    case 'page':
      return typeof v.text === 'string' ? { kind: v.kind, canto: v.canto, beat: v.beat, text: v.text } : null;
    case 'quote': {
      if (!Array.isArray(v.lines)) return null;
      const lines = v.lines.map((x) => (typeof x === 'string' ? x : ''));
      const nums = Array.isArray(v.lineNumbers) ? v.lineNumbers : [];
      return {
        kind: 'quote',
        canto: v.canto,
        beat: v.beat,
        voice: str(v.voice, 'POET'),
        citation: str(v.citation, ''),
        lines,
        lineNumbers: lines.map((_, i) => {
          const n = nums[i];
          return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
        }),
      };
    }
    case 'choice': {
      const l = letter(v.letter);
      if (!l || typeof v.choice !== 'string') return null;
      return {
        kind: 'choice',
        canto: v.canto,
        beat: v.beat,
        choice: v.choice,
        title: str(v.title, ''),
        letter: l,
        chosenText: str(v.chosenText, ''),
        heading: heading(v.heading),
        note: strOrNull(v.note),
      };
    }
    default:
      return null;
  }
}

function normalizePendingReveal(v: unknown): PendingReveal | null {
  if (!isRecord(v) || typeof v.canto !== 'string' || !isRecord(v.card)) return null;
  const card = v.card;
  if (typeof card.choice !== 'string' || !Array.isArray(card.quotes) || !letter(card.chosenLetter)) return null;
  // Cards are produced by the runner from parsed scripts; keep them as stored once the key fields check out.
  return { canto: v.canto, card: card as unknown as RevealCard };
}

function normalizeCheckpoint(v: unknown): CheckpointRef | null {
  if (!isRecord(v) || typeof v.canto !== 'string') return null;
  return { canto: v.canto, place: strOrNull(v.place), x: num(v.x, 0), y: num(v.y, 0) };
}

function normalizePosition(v: unknown): Position {
  if (!isRecord(v)) return { canto: null, scene: null, beat: null, checkpoint: null };
  return {
    canto: strOrNull(v.canto),
    scene: strOrNull(v.scene),
    beat: strOrNull(v.beat),
    checkpoint: normalizeCheckpoint(v.checkpoint),
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Validates and repairs a raw state object (already migrated to the current
 * version). Returns null when it is not a version-1 state at all.
 */
export function normalizeState(raw: unknown): GameStateData | null {
  if (!isRecord(raw) || raw.version !== SAVE_VERSION) return null;

  const profile = oneOf<GameProfile>(raw.profile, ['full', 'm0'], 'full');
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const base = createInitialState(profile, num(stats.startedAt, Date.now()));

  // Heart
  const heartRaw = isRecord(raw.heart) ? raw.heart : {};
  const ledger: Record<string, HeartLedgerEntry> = {};
  if (isRecord(heartRaw.ledger)) {
    for (const [sin, entry] of Object.entries(heartRaw.ledger)) {
      if (isRecord(entry)) ledger[sin] = { pity: num(entry.pity, 0, 0), justice: num(entry.justice, 0, 0) };
    }
  }

  // Words: sealed ⊆ owned; shed ∩ owned = ∅.
  const wordsRaw = isRecord(raw.words) ? raw.words : {};
  const shed = strings(wordsRaw.shed);
  const owned = strings(wordsRaw.owned).filter((w) => !shed.includes(w));
  const sealed = strings(wordsRaw.sealed).filter((w) => owned.includes(w));

  // Virtues
  const virtuesRaw = isRecord(raw.virtues) ? raw.virtues : {};
  const virtues = { ...base.virtues };
  for (const v of VIRTUES) virtues[v] = num(virtuesRaw[v], 0, 0);

  // Resources
  const gracemax = num(raw.gracemax, base.gracemax, 0, RESOURCES.graceMaxLimit);

  // Choices
  const choices: Record<string, ChoiceRecord> = {};
  if (isRecord(raw.choices)) {
    for (const [key, value] of Object.entries(raw.choices)) {
      const record = normalizeChoiceRecord(key, value);
      if (record) choices[record.choice] = record;
    }
  }

  // Verses
  const verses: VerseRecord[] = [];
  if (Array.isArray(raw.verses)) {
    for (const v of raw.verses) {
      if (!isRecord(v)) continue;
      const verse = normalizeVerse(v.verse);
      if (verse && typeof v.canto === 'string') verses.push({ canto: v.canto, verse, order: num(v.order, verses.length + 1, 0) });
    }
  }

  // Lines seen
  const linesSeen: Record<string, number[]> = {};
  if (isRecord(raw.linesSeen)) {
    for (const [key, list] of Object.entries(raw.linesSeen)) {
      if (!Array.isArray(list)) continue;
      const nums = [...new Set(list.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0))];
      nums.sort((a, b) => a - b);
      linesSeen[key] = nums;
    }
  }

  const log = Array.isArray(raw.log)
    ? raw.log.map(normalizeLogEntry).filter((e): e is ReadingLogEntry => e !== null)
    : [];
  const pendingReveals = Array.isArray(raw.pendingReveals)
    ? raw.pendingReveals.map(normalizePendingReveal).filter((e): e is PendingReveal => e !== null)
    : [];

  return {
    version: 1,
    profile,
    heart: {
      pity: num(heartRaw.pity, 0, 0),
      justice: num(heartRaw.justice, 0, 0),
      ledger,
    },
    trust: num(raw.trust, TRUST.start, TRUST.min, TRUST.max),
    virtues,
    resolve: num(raw.resolve, base.resolve, 0, RESOURCES.resolveMax),
    grace: num(raw.grace, base.grace, 0, gracemax),
    gracemax,
    words: { owned, sealed, shed },
    memories: strings(raw.memories),
    codex: strings(raw.codex),
    flags: strings(raw.flags),
    events: strings(raw.events),
    seen: strings(raw.seen),
    choices,
    unlocks: strings(raw.unlocks).filter((u): u is UnlockFeature =>
      (UNLOCK_FEATURES as readonly string[]).includes(u),
    ),
    verses,
    equippedVerse: normalizeVerse(raw.equippedVerse),
    log,
    linesSeen,
    pendingReveals,
    hintsUsed: strings(raw.hintsUsed),
    completedCantos: strings(raw.completedCantos),
    position: normalizePosition(raw.position),
    stats: {
      faints: num(stats.faints, 0, 0),
      choicesMade: num(stats.choicesMade, Object.keys(choices).length, 0),
      startedAt: base.stats.startedAt,
    },
  };
}

/** Serialises the state as a versioned save envelope. */
export function serializeSave(state: GameStateData, savedAt: number = Date.now()): string {
  const envelope: SaveEnvelope = { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt, state };
  return JSON.stringify(envelope);
}

/**
 * Parses a save file (envelope or bare state), migrating older versions.
 * Returns null for empty, unreadable, malformed or newer-version saves. Never throws.
 */
export function parseSave(text: string | null | undefined): GameStateData | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;

  let version: number;
  let stateRaw: unknown;
  if (raw.format === SAVE_FORMAT) {
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) return null;
    version = raw.version;
    stateRaw = raw.state;
  } else {
    // A bare state (no envelope) must still say which version it is.
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) return null;
    version = raw.version;
    stateRaw = raw;
  }
  if (version > SAVE_VERSION || version < 1 || !isRecord(stateRaw)) return null;

  let migrated: Json = stateRaw;
  for (let v = version; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return null;
    migrated = step(migrated);
  }
  return normalizeState({ ...migrated, version: SAVE_VERSION });
}

// ---------------------------------------------------------------------------
// Settings (stored apart from the save; survive new games)
// ---------------------------------------------------------------------------

const VERSE_DISPLAYS: readonly VerseDisplay[] = ['line_by_line', 'all_at_once'];
const REVEAL_SETTINGS: readonly RevealSetting[] = ['after_choice', 'end_of_canto', 'book_only'];

/** Merges `raw` over the defaults, keeping only valid values. */
export function normalizeSettings(raw: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const r = isRecord(raw) ? raw : {};
  return {
    textSpeed: oneOf<TextSpeed>(r.textSpeed, TEXT_SPEEDS, base.textSpeed),
    verseDisplay: oneOf<VerseDisplay>(r.verseDisplay, VERSE_DISPLAYS, base.verseDisplay),
    fontScale: oneOf<FontScale>(r.fontScale, FONT_SCALES, base.fontScale),
    highContrast: bool(r.highContrast, base.highContrast),
    revealTiming: oneOf<RevealSetting>(r.revealTiming, REVEAL_SETTINGS, base.revealTiming),
    masterVolume: num(r.masterVolume, base.masterVolume, 0, 1),
    musicVolume: num(r.musicVolume, base.musicVolume, 0, 1),
    sfxVolume: num(r.sfxVolume, base.sfxVolume, 0, 1),
    screenShake: bool(r.screenShake, base.screenShake),
    flashes: bool(r.flashes, base.flashes),
    easyMode: bool(r.easyMode, base.easyMode),
  };
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify({ version: 1, settings });
}

/** Parses stored settings (`{ version, settings }` or a bare object). Never throws. */
export function parseSettings(text: string | null | undefined): Settings {
  if (!text) return DEFAULT_SETTINGS;
  try {
    const raw: unknown = JSON.parse(text);
    if (isRecord(raw) && isRecord(raw.settings)) return normalizeSettings(raw.settings);
    return normalizeSettings(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Deep copy of JSON-safe data (game state, verses, cards). */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
