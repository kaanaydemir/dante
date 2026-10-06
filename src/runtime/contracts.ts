/**
 * Interfaces between the engine's modules. SHARED CONTRACT (architect-owned).
 *
 * Who implements what (see docs/ENGINE.md for the full ownership map):
 *   A story-core   -> StoryLibrary                          (src/story/**)
 *   B runtime      -> EventBus, GameStateStore, StoryRunner,
 *                     GameSession, verse evaluation         (src/state/**, src/runtime/**, src/verse/**)
 *   C presentation -> StoryPresenter, AudioService          (src/ui/**, src/audio/**, book/UI scenes)
 *   D world        -> WorldBridge, LevelModule framework,
 *                     Mechanic library                      (src/world/**, src/levels/_framework/**, src/mechanics/**)
 *
 * Rules:
 * - This file contains types (and the DEFAULT_SETTINGS constant) only.
 * - Phaser is imported as a TYPE only, so pure modules (runner, state) can
 *   import from here and still run under Node/vitest.
 * - Every Promise returned by a presenter or world method must settle; after
 *   `cancelAll()` / `cancel()` every pending promise resolves promptly.
 */

import type * as Phaser from 'phaser';
import type { CantoPalette, ChapterDef, FontScale, TextSpeed } from '../config';
import type {
  Beat,
  BeatId,
  BeatMode,
  CamVerb,
  Canticle,
  CantoId,
  CantoScript,
  ChoiceId,
  ChoiceWeight,
  Citation,
  CodexEntry,
  CodexId,
  ConditionContext,
  Diagnostic,
  DoStmt,
  Effect,
  EventId,
  FlagId,
  MechanicName,
  MemoryEntry,
  MemoryId,
  OptionLetter,
  PlaceId,
  QuoteVoice,
  RevealTiming,
  Scene,
  SceneId,
  SinTag,
  SourceCanto,
  SpeakerId,
  SpeakerTag,
  Trigger,
  TutorialName,
  UnlockFeature,
  Virtue,
  WordCategory,
  WordDef,
  WordName,
} from '../story/types';

// ===========================================================================
// 0. Utilities
// ===========================================================================

export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends readonly (infer V)[]
    ? readonly DeepReadonly<V>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export type Unsubscribe = () => void;

/** Injectable time source (tests use a fake one). */
export interface Clock {
  now(): number;
  /** Resolves after `ms`; resolves early (never rejects) when `signal` aborts. */
  wait(ms: number, signal?: AbortSignal): Promise<void>;
}

/** Minimal Web Storage surface. The store wraps every call in try/catch. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ===========================================================================
// 1. Settings (bible §1.6, GDD 9)
// ===========================================================================

export type RevealSetting = 'after_choice' | 'end_of_canto' | 'book_only';
export type VerseDisplay = 'line_by_line' | 'all_at_once';

export interface Settings {
  readonly textSpeed: TextSpeed;
  readonly verseDisplay: VerseDisplay;
  readonly fontScale: FontScale;
  readonly highContrast: boolean;
  /** "What Dante did" cards: after each choice (default), at the end of the canto, or only in the Book. */
  readonly revealTiming: RevealSetting;
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly screenShake: boolean;
  readonly flashes: boolean;
  /** GDD 9 easy mode: Resolve never decreases. */
  readonly easyMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 'normal',
  verseDisplay: 'line_by_line',
  fontScale: 1,
  highContrast: false,
  revealTiming: 'after_choice',
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  screenShake: true,
  flashes: true,
  easyMode: false,
};

// ===========================================================================
// 2. Game state (bible §3) — the public shape; serialised as the save file
// ===========================================================================

export type GameProfile = 'full' | 'm0';

export interface HeartLedgerEntry {
  pity: number;
  justice: number;
}

/** Two counters that only grow, plus a per-sin ledger. heart = pity − justice. */
export interface HeartState {
  pity: number;
  justice: number;
  ledger: Record<SinTag, HeartLedgerEntry>;
}

export interface WordsState {
  /** Every word currently held, in acquisition order (sealed words included). */
  owned: WordName[];
  /** Subset of `owned`: visible in the Book, unusable in tercets. */
  sealed: WordName[];
  /** Burden words dropped for good (never return). */
  shed: WordName[];
}

export type RevealHeading = 'What Dante did' | 'As Dante did';

export interface ChoiceRecord {
  choice: ChoiceId;
  canto: CantoId;
  beat: BeatId;
  title: string;
  weight: ChoiceWeight;
  systemic: boolean;
  letter: OptionLetter;
  /** The option text as shown (bracket text). */
  optionText: string;
  /** From REVEAL; null when the choice has no REVEAL. */
  canon: OptionLetter[] | 'all' | 'none' | null;
  /** Card heading result; null when there is no REVEAL. */
  heading: RevealHeading | null;
  note: string | null;
  /** Monotonic order of choices within the playthrough. */
  order: number;
}

/** "As you lived it" (bible §1.5): what the reader actually saw, in order. */
export type ReadingLogEntry =
  | { kind: 'narration'; canto: CantoId; beat: BeatId; text: string }
  | { kind: 'page'; canto: CantoId; beat: BeatId; text: string }
  | {
      kind: 'quote';
      canto: CantoId;
      beat: BeatId;
      voice: QuoteVoice;
      citation: string;
      lines: string[];
      lineNumbers: (number | null)[];
    }
  | {
      kind: 'choice';
      canto: CantoId;
      beat: BeatId;
      choice: ChoiceId;
      title: string;
      letter: OptionLetter;
      chosenText: string;
      heading: RevealHeading | null;
      note: string | null;
    };

/** A word triple A · B · A (outer words rhyme; the middle word is the heart). */
export type Tercet = readonly [WordName, WordName, WordName];

/** One cast-able verse: one tercet, or a terza-rima chain of tercets, optionally closed by a coda. */
export interface ComposedVerse {
  tercets: Tercet[];
  coda: WordName | null;
}

export interface VerseRecord {
  canto: CantoId;
  verse: ComposedVerse;
  /** Order of composition within the playthrough. */
  order: number;
}

export interface CheckpointRef {
  canto: CantoId;
  place: PlaceId | null;
  x: number;
  y: number;
}

export interface Position {
  canto: CantoId | null;
  scene: SceneId | null;
  beat: BeatId | null;
  checkpoint: CheckpointRef | null;
}

export interface PendingReveal {
  canto: CantoId;
  card: RevealCard;
}

export interface GameStateData {
  version: 1;
  profile: GameProfile;
  heart: HeartState;
  /** 0–10, starts at 4 (bible §3.3). */
  trust: number;
  virtues: Record<Virtue, number>;
  /** Bar units (0–10, fractional while fear drains it). */
  resolve: number;
  grace: number;
  gracemax: number;
  words: WordsState;
  memories: MemoryId[];
  codex: CodexId[];
  flags: FlagId[];
  /**
   * Every gameplay event emitted so far (recorded by the runner from 'world:signal').
   * Triggers and systemic `when: event:` use the runner's scene-scoped set instead (bible §2.9).
   */
  events: EventId[];
  /** Scene and beat ids that have started. */
  seen: string[];
  choices: Record<ChoiceId, ChoiceRecord>;
  unlocks: UnlockFeature[];
  verses: VerseRecord[];
  equippedVerse: ComposedVerse | null;
  log: ReadingLogEntry[];
  /** Longfellow lines shown to the reader, keyed `${canticle}:${canto}` -> sorted line numbers (gold in the Book). */
  linesSeen: Record<string, number[]>;
  /** Deferred "What Dante did" cards waiting for the colophon. */
  pendingReveals: PendingReveal[];
  /** Hint keys already heard once (then HINT-SHORT is used). */
  hintsUsed: string[];
  completedCantos: CantoId[];
  position: Position;
  stats: { faints: number; choicesMade: number; startedAt: number };
}

export type GameStateView = DeepReadonly<GameStateData>;

/** Where an effect came from (for logs, the Book and debugging). */
export interface EffectSource {
  canto: CantoId | null;
  beat: BeatId | null;
  choice?: ChoiceId;
  option?: OptionLetter;
  /** True for engine-applied effects (chapter-end flags, M0 kit, …). */
  system?: boolean;
}

/**
 * - `applied`: state changed as asked.
 * - `unsealed`: `word:` on a sealed word.
 * - `clamped`: changed, but limited by a bound (trust 0–10, bars).
 * - `duplicate`: nothing to do (already owned / already set); codex, words and memories are given once per playthrough.
 * - `ignored`: not applicable (e.g. `shed:` of a word not held, negative heart amount).
 */
export type EffectOutcome = 'applied' | 'unsealed' | 'clamped' | 'duplicate' | 'ignored';

export interface EffectResult {
  readonly effect: Effect;
  readonly changed: boolean;
  readonly outcome: EffectOutcome;
}

/**
 * The single owner of mutable game state (team B). Everything else reads
 * `state` (deeply read-only) and changes it only through these methods. Every
 * mutation emits 'state:changed' (and more specific events) on the bus.
 */
export interface GameStateStore {
  readonly state: GameStateView;
  readonly settings: Settings;

  /** Live view used by `evaluateCondition`. */
  conditions(): ConditionContext;

  /** Apply one EFFECTS token (bible §2.10 semantics; a scripted `resolve-N` never goes below 1 unit). Never throws. */
  apply(effect: Effect, source: EffectSource): EffectResult;
  applyAll(effects: readonly Effect[], source: EffectSource): EffectResult[];

  // --- story bookkeeping (runner) ---
  markSeen(id: SceneId | BeatId): void;
  /** Records an event id; returns true if it was new. */
  recordEvent(id: EventId): boolean;
  recordChoice(record: ChoiceRecord): void;
  addLog(entry: ReadingLogEntry): void;
  markLinesSeen(canticle: Canticle, canto: number, lines: readonly number[]): void;
  markHintUsed(key: string): void;
  pushPendingReveal(reveal: PendingReveal): void;
  /** Removes and returns the pending cards of a canto, in order. */
  takePendingReveals(canto: CantoId): PendingReveal[];
  completeCanto(canto: CantoId): void;
  setPosition(position: Partial<Position>): void;

  // --- gameplay (world) ---
  /** Continuous Resolve change in bar units (fear drain, hits). Respects easy mode. Returns the new value. */
  adjustResolve(delta: number, cause: string): number;
  refillResolve(): void;
  adjustGrace(delta: number): number;
  recordFaint(): void;
  setEquippedVerse(verse: ComposedVerse | null): void;
  addVerse(canto: CantoId, verse: ComposedVerse): void;

  // --- lifecycle ---
  /** Fresh state for a new game; profile 'm0' applies config M0_PROFILE (missing unlocks and words, shed Fear) as system effects. */
  reset(profile?: GameProfile): void;
  /** Deep copy of the current state. */
  snapshot(): GameStateData;
  restore(data: GameStateData): void;

  // --- persistence (localStorage behind try/catch; works without storage) ---
  save(): boolean;
  /** Reads the saved game without applying it. */
  load(): GameStateData | null;
  hasSave(): boolean;
  clearSave(): void;
  updateSettings(patch: Partial<Settings>): void;
}

// ===========================================================================
// 3. Event bus
// ===========================================================================

/** Signals the world publishes on the bus as 'world:signal' (the runner listens). */
export type WorldSignal =
  | { readonly kind: 'enter'; readonly place: PlaceId }
  | { readonly kind: 'exit'; readonly place: PlaceId }
  | { readonly kind: 'talk'; readonly speaker: SpeakerId }
  | { readonly kind: 'event'; readonly id: EventId };

export type BookTab = 'cantos' | 'verses' | 'words' | 'codex' | 'remembrance' | 'map' | 'settings';

/** Typed event map. Payloads are plain data. */
export interface GameEvents {
  // world -> runner
  'world:signal': WorldSignal;
  // runner lifecycle
  'runner:status': { status: RunnerStatus };
  'canto:start': { canto: CantoId };
  'canto:end': { canto: CantoId; outcome: CantoOutcome };
  'canto:missing': { canto: CantoId; status: 'missing' | 'invalid' };
  'scene:start': { canto: CantoId; scene: SceneId };
  'scene:end': { canto: CantoId; scene: SceneId; missed: readonly BeatId[] };
  'beat:start': { canto: CantoId; scene: SceneId; beat: BeatId; mode: BeatMode };
  'beat:end': { canto: CantoId; scene: SceneId; beat: BeatId };
  'beat:armed': { armed: readonly ArmedBeat[] };
  'choice:made': { choice: ChoiceId; letter: OptionLetter; systemic: boolean; heading: RevealHeading | null };
  'effect:applied': { result: EffectResult; source: EffectSource };
  'chapter:end': { chapter: string };
  // state
  'state:changed': { reason: string };
  'state:restored': { profile: GameProfile };
  'resources:changed': { resolve: number; grace: number; gracemax: number };
  'trust:changed': { trust: number; delta: number };
  'heart:changed': { pity: number; justice: number; side: 'pity' | 'justice'; amount: number; sin: SinTag | null };
  'settings:changed': { settings: Settings };
  // player / world
  'player:control': { enabled: boolean };
  'player:faint': { cause: string };
  'player:respawn': { checkpoint: CheckpointRef | null };
  'checkpoint:set': { checkpoint: CheckpointRef };
  // presentation
  'ui:book': { open: boolean; tab?: BookTab };
  'ui:ask-virgil': { answered: boolean };
  // session
  'session:status': { status: SessionStatus };
  // diagnostics (debug overlay, smoke tests)
  'debug:log': { level: 'info' | 'warn' | 'error'; message: string; data?: unknown };
}

export type GameEventName = keyof GameEvents;

export interface EventBus {
  on<K extends GameEventName>(type: K, handler: (payload: GameEvents[K]) => void): Unsubscribe;
  once<K extends GameEventName>(type: K, handler: (payload: GameEvents[K]) => void): Unsubscribe;
  /** Every event, after the typed handlers (debug log, tracing). */
  onAny(handler: (type: GameEventName, payload: GameEvents[GameEventName]) => void): Unsubscribe;
  /** Synchronous dispatch. A throwing handler is caught, reported as 'debug:log' error, and does not stop others. */
  emit<K extends GameEventName>(type: K, payload: GameEvents[K]): void;
  clear(): void;
}

// ===========================================================================
// 4. Story library (team A): parsed scripts + Longfellow sources
// ===========================================================================

/** `ok`: playable (may carry diagnostics). `invalid`: file exists but nothing playable. `missing`: no file yet. */
export type CantoStatus = 'ok' | 'invalid' | 'missing';

export interface LoadedCanto {
  readonly id: CantoId;
  readonly file: string | null;
  readonly status: CantoStatus;
  readonly script: CantoScript | null;
  readonly diagnostics: readonly Diagnostic[];
}

export interface BeatLocation {
  readonly canto: CantoScript;
  readonly scene: Scene;
  readonly beat: Beat;
}

export interface StoryLibrary {
  /** Ids of every script file found (sorted), whatever its status. */
  readonly cantoIds: readonly CantoId[];
  /** Never throws: unknown ids come back with status 'missing'. */
  canto(id: CantoId): LoadedCanto;
  /** The playable script, or null. */
  script(id: CantoId): CantoScript | null;
  source(canticle: Canticle, canto: number): SourceCanto | null;
  codex(id: CodexId): CodexEntry | null;
  memory(id: MemoryId): MemoryEntry | null;
  allCodex(): readonly CodexEntry[];
  allMemories(): readonly MemoryEntry[];
  findScene(id: SceneId): { readonly canto: CantoScript; readonly scene: Scene } | null;
  findBeat(id: BeatId): BeatLocation | null;
  /** Parse + load diagnostics of every file. */
  diagnostics(): readonly Diagnostic[];
}

// ===========================================================================
// 5. Presentation (team C): what the runner asks the book / UI to show
// ===========================================================================

export interface CantoMeta {
  readonly id: CantoId;
  readonly canticle: Canticle;
  readonly cantoNumber: number;
  /** `III` */
  readonly roman: string;
  readonly title: string;
  /** HUD place name (front matter `location`). */
  readonly location: string;
  readonly chapter: string | null;
}

export interface BeatContext {
  readonly canto: CantoMeta;
  readonly sceneId: SceneId;
  readonly sceneTitle: string;
  readonly beatId: BeatId;
  readonly beatTitle: string;
  readonly mode: BeatMode;
  readonly place: PlaceId | null;
  /** `@music:` / `@ambience:` cues (Turkish descriptions) for the audio layer, or null. */
  readonly music: string | null;
  readonly ambience: string | null;
  /** False when this beat has been seen before (replays may skip faster). */
  readonly firstVisit: boolean;
}

export type QuoteContext = 'bubble' | 'page' | 'epigraph' | 'card' | 'colophon' | 'codex' | 'memory';

/** A word that glows inside a verse line; the player takes it with E (Burden words stick by themselves). */
export interface CollectibleWord {
  readonly word: WordName;
  readonly def: WordDef | null;
  /** Index into QuoteSpec.lines. */
  readonly lineIndex: number;
  /** Character range of the word inside that line. */
  readonly start: number;
  readonly end: number;
  /** True for Burden words: no input needed. */
  readonly auto: boolean;
}

/** A Longfellow quote ready to display (verse bubble, book page, card, …). */
export interface QuoteSpec {
  readonly voice: QuoteVoice;
  /** Display name of the voice (SPEAKERS[voice].name). */
  readonly speakerName: string;
  readonly citation: Citation | null;
  /** Always displayed, never hideable (bible §1.6). e.g. `Inferno III, 49–51`. */
  readonly citationText: string;
  /** Lines as written, including `…` cut marks and lone `…` skip lines. Up to 6; the UI splits them into tercet bubbles. */
  readonly lines: readonly string[];
  readonly lineNumbers: readonly (number | null)[];
  /** Plain-English margin note opened with Q while the quote is on screen. */
  readonly gloss: string | null;
  readonly collectible: readonly CollectibleWord[];
  readonly context: QuoteContext;
  readonly mode: BeatMode;
}

export interface SayLine {
  readonly speaker: SpeakerId;
  readonly name: string;
  readonly tag: SpeakerTag | null;
  readonly text: string;
  readonly mode: BeatMode;
  /** True when this balloon repeats a spoken (quoted) choice option (bible §2.9). */
  readonly fromChoice: boolean;
}

export interface NarrationOptions {
  readonly mode: BeatMode;
  /**
   * Blocking strips wait for E / Enter / click. Non-blocking strips (play mode)
   * never stop play and resolve after a reading time (config readingTimeMs) or on Enter / click.
   */
  readonly blocking: boolean;
}

/** s0 opening page (bible §1.3.1): canticle, illuminated canto numeral, title, vignette, epigraph. */
export interface OpeningPageSpec {
  readonly kind: 'opening';
  readonly canto: CantoMeta;
  /** `INFERNO` */
  readonly canticleLabel: string;
  /** `CANTO III` */
  readonly cantoLabel: string;
  /** Texture key of the 96x64 Doré-style vignette (`vignette-<cantoId>`; art may fall back to a generic one). */
  readonly vignette: string;
  readonly epigraph: QuoteSpec | null;
  /** First reading: the page stays at least TIMINGS.pageMinFirstReadingMs. */
  readonly firstReading: boolean;
  /** The previous canto ended in a faint: the epigraph is a waking line (bible §1.3.9). */
  readonly awakening: boolean;
}

/** A `PAGE:` line: the book's voice on a full page. */
export interface TextPageSpec {
  readonly kind: 'text';
  readonly canto: CantoMeta;
  readonly text: string;
  readonly mode: BeatMode;
}

export type PageSpec = OpeningPageSpec | TextPageSpec;

export interface ChoiceSpec {
  readonly id: ChoiceId;
  readonly title: string;
  readonly weight: ChoiceWeight;
  readonly prompt: string | null;
  readonly mode: BeatMode;
}

/** A visible option. Never shows numbers or system terms (bible §0.4 rule 8). */
export interface ChoiceOptionView {
  readonly letter: OptionLetter;
  readonly text: string;
  readonly spoken: boolean;
}

/** "What Dante did" / "As Dante did" card (bible §2.11). */
export interface RevealCard {
  readonly choice: ChoiceId;
  readonly canto: CantoId;
  readonly recordTitle: string;
  readonly heading: RevealHeading;
  readonly chosenLetter: OptionLetter;
  readonly chosenText: string;
  readonly quotes: readonly QuoteSpec[];
  readonly note: string;
  readonly timing: RevealTiming;
  /** True when shown on the colophon instead of right after the choice. */
  readonly deferred: boolean;
  /**
   * Words to make glow on this card (e.g. `Pity` on inf05.c4's card at the colophon).
   * When such a word's origin line is in one of the card's quotes it is also listed in
   * that QuoteSpec's `collectible`, and the card stays open until the word is taken.
   */
  readonly highlightWords: readonly WordName[];
}

export interface WordChange {
  readonly word: WordName;
  readonly def: WordDef | null;
  readonly change: 'gained' | 'unsealed' | 'sealed' | 'shed';
  /** True when the player took it from a glowing verse line (it flies from there to the Book). */
  readonly collected: boolean;
  /** No flourish (e.g. engine kits); the Book still updates. */
  readonly silent: boolean;
}

export interface CodexGain {
  readonly id: CodexId;
  readonly entry: CodexEntry | null;
  /** True before `unlock:codex`: entries collect silently and appear when the Codex opens (bible §2.12). */
  readonly silent: boolean;
}

export interface MemoryGain {
  readonly id: MemoryId;
  readonly entry: MemoryEntry | null;
}

/** The scale twitches (bible §1.3.5); the number is never shown. */
export interface HeartShift {
  readonly side: 'pity' | 'justice';
  readonly amount: number;
  readonly sin: SinTag | null;
  readonly pity: number;
  readonly justice: number;
  /** False before `unlock:heart`. */
  readonly visible: boolean;
}

/** Virgil's answer to Q (GDD 2.5): the full hint the first time, then the short one. */
export interface HintSpec {
  readonly text: string;
  readonly repeat: boolean;
  readonly beat: BeatId;
}

export interface CamCommand {
  readonly verb: CamVerb;
  readonly text: string;
  readonly mode: BeatMode;
  readonly beat: BeatId;
}

export interface ColophonChoiceRow {
  readonly choice: ChoiceId;
  readonly title: string;
  readonly systemic: boolean;
  readonly letter: OptionLetter;
  readonly chosenText: string;
  readonly heading: RevealHeading | null;
  readonly note: string | null;
}

/** The colophon (bible §1.3.8): last line on the left page, "In this canto" on the right. */
export interface ColophonSpec {
  readonly canto: CantoMeta;
  readonly canticleLabel: string;
  readonly cantoLabel: string;
  /** The canto's last line (the colophon beat's QUOTE). */
  readonly closing: QuoteSpec | null;
  readonly choices: readonly ColophonChoiceRow[];
  /** Deferred cards that open here, in order. */
  readonly reveals: readonly RevealCard[];
  readonly words: readonly WordChange[];
  readonly codex: readonly CodexGain[];
  readonly memories: readonly MemoryGain[];
  readonly heart: { readonly pity: number; readonly justice: number; readonly visible: boolean };
  /** Words to glow on the page / cards (e.g. `Pity`). */
  readonly highlightWords: readonly WordName[];
  /** The whole Longfellow canto is now readable in the Book. */
  readonly fullTextUnlocked: boolean;
  readonly next: { readonly cantoId: CantoId; readonly label: string } | null;
}

export type TrustLabel = 'Faithful' | 'Steady' | 'Wayward';

/** Chapter end (`@chapter_end: ch1`): summary and a preview of "Your Comedy" (bible §1.5). */
export interface ChapterSummary {
  readonly chapter: ChapterDef;
  /** Engine flags raised at the chapter end (ch1.heart_*, ch1.trust_*). */
  readonly flags: readonly FlagId[];
  readonly heart: { readonly pity: number; readonly justice: number };
  readonly trust: number;
  readonly trustLabel: TrustLabel;
  readonly virtues: Readonly<Record<Virtue, number>>;
  readonly words: readonly WordName[];
  readonly memories: readonly MemoryGain[];
  readonly verses: readonly VerseRecord[];
  readonly cantos: readonly { readonly id: CantoId; readonly title: string; readonly choices: readonly ColophonChoiceRow[] }[];
}

/** Shown instead of a canto whose script is missing or unplayable. */
export interface MissingCantoSpec {
  readonly cantoId: CantoId;
  /** `CANTO II` */
  readonly cantoLabel: string;
  readonly title: string | null;
  readonly status: 'missing' | 'invalid';
  /** e.g. `This canto is still being written.` */
  readonly message: string;
}

/**
 * Implemented by the UI layer (team C). The runner awaits every Promise-returning
 * method in script order; methods returning void must not block.
 *
 * Input contract: blocking text advances with E / Enter / Space / click / pad A
 * or Y; choices take arrows + E / Enter, number keys 1–3 or a click.
 */
export interface StoryPresenter {
  // --- lifecycle ---
  /** A canto starts: HUD place name and canto numeral, palette. */
  beginCanto(meta: CantoMeta): Promise<void>;
  endCanto(meta: CantoMeta): Promise<void>;
  /** Called at every beat start with its mode (page / cinematic / dialogue / play / colophon) and audio cues. */
  setMode(mode: BeatMode, ctx: BeatContext): Promise<void>;

  // --- text ---
  /** Full book pages: the s0 opening page or a PAGE line. Resolves when the page is turned. */
  openPage(page: PageSpec): Promise<void>;
  narration(text: string, opts: NarrationOptions): Promise<void>;
  say(line: SayLine): Promise<void>;
  /**
   * Verse appears line by line (or all at once per settings), never letter by letter.
   * Bible §3.4.2 rule 5: while `spec.collectible` holds a non-auto word, the bubble /
   * page / card cannot close until the player takes the word with E; the promise
   * resolves at that press (the runner then applies the `word:` effect). `skip()` takes it too.
   */
  quote(spec: QuoteSpec): Promise<void>;
  /** Ambient line near the speaker; never blocks. */
  bark(speaker: SpeakerId, name: string, text: string): void;
  /** Whether Q currently has something to say (shows the small [Q] mark). */
  hintAvailable(available: boolean): void;
  /** Shows Virgil's answer in the margin. The UI calls it itself on Q, after `session.askVirgil()`. */
  hint(spec: HintSpec): Promise<void>;

  // --- choices and cards ---
  /** Opens the margin with the visible options; resolves with the chosen letter. No time limit. */
  choose(choice: ChoiceSpec, options: readonly ChoiceOptionView[]): Promise<OptionLetter>;
  reveal(card: RevealCard): Promise<void>;

  // --- feedback ---
  wordGained(change: WordChange): Promise<void>;
  codexGained(gain: CodexGain): Promise<void>;
  memoryGained(gain: MemoryGain): Promise<void>;
  unlock(feature: UnlockFeature): Promise<void>;
  heartShift(shift: HeartShift): Promise<void>;
  /** From `DO … {tutorial:<name>}`: a short non-blocking control hint. */
  tutorial(name: TutorialName): void;
  toast(text: string): void;

  // --- stage ---
  /** Screen-level CAM verbs: fade-in, fade-out, white-out, page-turn, engrave, unengrave. Others resolve at once. */
  camera(cam: CamCommand): Promise<void>;
  /** `SFX:` description (Turkish) -> sound via the AudioService; never blocks. */
  sfx(description: string): void;

  // --- book pages ---
  colophon(spec: ColophonSpec): Promise<void>;
  chapterEnd(summary: ChapterSummary): Promise<void>;
  missingCanto(spec: MissingCantoSpec): Promise<void>;
  /** Return to the title screen (after the chapter, or when the session stops). */
  showTitle(): void;

  // --- control (debug, autoplay, cancellation) ---
  /** True while a blocking element waits for the player. */
  readonly busy: boolean;
  /** Finish / dismiss whatever text, page or card is waiting (debug skipText, autoplay). */
  skip(): void;
  /** Answer the open choice; false if no choice is open or the letter is not visible. */
  answer(letter: OptionLetter): boolean;
  /** Clear every overlay and settle every pending promise (choose -> first visible option). */
  cancelAll(): void;
}

// ===========================================================================
// 6. World (team D)
// ===========================================================================

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A named map area (`inf03_gate`). Coordinates are world pixels. */
export interface PlaceDef extends Rect {
  readonly id: PlaceId;
  /** Where the player stands when a beat with this @place starts elsewhere; default: rect centre. */
  readonly spawn?: { readonly x: number; readonly y: number };
  readonly label?: string;
}

export interface SpawnPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** Context handed to the world for every beat. `signal` aborts when the runner stops. */
export interface BeatRunInfo {
  readonly canto: CantoScript;
  readonly scene: Scene;
  readonly beat: Beat;
  readonly autoplay: boolean;
  readonly signal: AbortSignal;
}

/**
 * Implemented by the world layer (team D). The world publishes every gameplay
 * signal on the bus as 'world:signal' (enter / exit a place, talk to a speaker,
 * gameplay events) and never calls the runner directly.
 */
export interface WorldBridge {
  /** Build the canto's level: its LevelModule if registered, else the generic fallback level built from the script. */
  loadCanto(script: CantoScript | null, cantoId: CantoId): Promise<void>;
  unloadCanto(): void;
  /**
   * Beat start (after the runner has set player control for the mode): move
   * player + Virgil to `@place` if they are elsewhere, run the level hook (phase 'start').
   */
  beginBeat(info: BeatRunInfo): Promise<void>;
  /** Beat end: level hook (phase 'end'). */
  endBeat(info: BeatRunInfo): Promise<void>;
  /** A DO line: level hook (phase 'do'); resolves when the directed action is done (at once if unhandled). */
  direct(stmt: DoStmt, index: number, info: BeatRunInfo): Promise<void>;
  /** World-level CAM verbs: cut, pan, zoom-in, zoom-out, shake, hold, follow, engrave, unengrave. Others resolve at once. */
  camera(cam: CamCommand): Promise<void>;
  /** Called by the runner: on at play-mode beats and while it waits for a trigger, off otherwise. */
  setPlayerControl(enabled: boolean): void;
  /** `DO … {checkpoint}`: Virgil's stone bench; respawn point after a faint. */
  checkpoint(): void;
  /** Trust is shown by Virgil's distance and posture, never as a number (bible §3.3). */
  setVirgilTrust(trust: number, delta: number): void;
  /** The beats the runner currently waits for (to show talk prompts / place glints). */
  setArmed(armed: readonly ArmedBeat[]): void;
  /** Can the current level ever produce this trigger? If not, the runner fires it itself after TIMINGS.triggerFallbackMs. */
  canSatisfy(trigger: Trigger): boolean;
  /** Is it true right now (e.g. the player already stands inside the `enter:` place)? */
  isSatisfied(trigger: Trigger): boolean;
  /** Make the trigger happen (autoplay / debug): teleport into the place, talk to the speaker, emit the event. */
  satisfy(trigger: Trigger): void;
  /** Move player (and Virgil) into a place: debug, autoplay and mid-beat `@place:` directives. False if unknown. */
  teleport(place: PlaceId): boolean;
  places(): readonly PlaceDef[];
  /** Abort running hooks / cinematics; pending promises resolve. */
  cancel(): void;
  debugInfo(): Record<string, unknown>;
}

// ===========================================================================
// 7. Audio (team C)
// ===========================================================================

export type SfxName =
  | 'ui'
  | 'page'
  | 'blip'
  | 'choice'
  | 'card'
  | 'word'
  | 'unlock'
  | 'step'
  | 'dash'
  | 'verse'
  | 'hurt'
  | 'faint'
  | 'quake'
  | 'thunder'
  | 'wind'
  | 'bell'
  | 'roar';

/** Tiny WebAudio synth. Every method is safe to call when audio is unavailable (no-op, never throws). */
export interface AudioService {
  readonly available: boolean;
  /** Resume the AudioContext; call from a user gesture. */
  unlock(): void;
  play(name: SfxName): void;
  /** Map an `SFX:` description (Turkish prose) to a sound, heuristically. */
  describe(description: string): void;
  /** Music / ambience cues from `@music:` / `@ambience:` (Turkish prose) and the canto palette id. */
  cue(music: string | null, ambience: string | null, cantoId: CantoId | null): void;
  /** Per-speaker "murmur" blip while a balloon types (GDD 8.2). */
  blip(speaker: SpeakerId): void;
  setVolumes(volumes: { master: number; music: number; sfx: number }): void;
  stopAll(): void;
}

// ===========================================================================
// 8. Runner and session (team B)
// ===========================================================================

export type RunnerStatus = 'idle' | 'running' | 'waiting' | 'finished' | 'stopped';

/** A beat the runner is waiting for. */
export interface ArmedBeat {
  readonly beat: BeatId;
  readonly scene: SceneId;
  readonly trigger: Trigger;
  /** The next beat in file order (the one the scene is waiting on). */
  readonly cursor: boolean;
  /** The head beat of the next scene: firing it ends the current scene. */
  readonly nextScene: boolean;
}

export interface RunCantoOptions {
  /** Start at a scene or beat instead of s0. */
  readonly at?: SceneId | BeatId;
}

export interface CantoOutcome {
  readonly canto: CantoId;
  readonly status: 'completed' | 'stopped';
  /** Beats never run (optional beats skipped, scenes ended early). */
  readonly missed: readonly BeatId[];
  /** `@chapter_end:` value when the colophon carried one. */
  readonly chapterEnd: string | null;
}

/** Debug / smoke-test autoplay (team B drives it inside the runner). */
export interface AutoplayOptions {
  /** How dialogue choices are answered: the canonical option, the first / last visible one, or per choice. */
  readonly choices: 'canon' | 'first' | 'last' | Readonly<Record<ChoiceId, OptionLetter>>;
  /** Text stays this long before autoplay skips it (0 = next tick). */
  readonly textDelayMs: number;
  /** Satisfy armed triggers automatically (teleport / talk / emit). */
  readonly triggers: boolean;
  readonly triggerDelayMs: number;
  /** Events autoplay emits when a DO line carries `{event:<id>}` (so systemic options resolve). */
  readonly events: 'all' | 'none' | readonly EventId[];
  /** Pause autoplay (keep the game running) on reaching this beat or canto. */
  readonly stopAt: BeatId | CantoId | null;
}

/** Mutable slots the session fills when the Phaser layers exist. Headless defaults before that. */
export interface RunnerPorts {
  presenter: StoryPresenter;
  world: WorldBridge;
}

export interface RunnerDeps {
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly ports: RunnerPorts;
  readonly clock?: Clock;
}

/** Executes one canto script beat by beat (semantics: docs/ENGINE.md "Runner semantics"). Pure: no Phaser. */
export interface StoryRunner {
  readonly status: RunnerStatus;
  readonly canto: CantoScript | null;
  readonly scene: Scene | null;
  /** The beat being executed, or null while waiting. */
  readonly beat: Beat | null;
  readonly mode: BeatMode | null;
  /** The beat the current scene waits for. */
  readonly cursor: BeatId | null;
  readonly autoplay: AutoplayOptions | null;
  /** Resolves when the canto's colophon is done (or the run is stopped). Never rejects. */
  runCanto(script: CantoScript, opts?: RunCantoOptions): Promise<CantoOutcome>;
  /** Abort the current run: presenter.cancelAll(), world.cancel(), runCanto resolves 'stopped'. */
  stop(reason?: string): void;
  armed(): readonly ArmedBeat[];
  /** The hint Q would give now (null in silent stretches). */
  currentHint(): HintSpec | null;
  /** Q pressed: returns the hint (full first, short after) and marks it used. */
  askVirgil(): HintSpec | null;
  setAutoplay(opts: AutoplayOptions | null): void;
}

export type SessionStatus = 'boot' | 'title' | 'playing' | 'chapter_complete' | 'stopped';

export interface NewGameOptions {
  /** Canto, scene or beat id to start from (debug / M0). Default: the chapter's first canto. */
  readonly startAt?: CantoId | SceneId | BeatId;
  readonly profile?: GameProfile;
  readonly chapter?: string;
}

export interface SessionDeps {
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly clock?: Clock;
}

/** Plays a chapter: canto after canto, missing-canto pages, save / continue, chapter end. */
export interface GameSession {
  readonly status: SessionStatus;
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly runner: StoryRunner;
  readonly ports: RunnerPorts;
  readonly chapter: ChapterDef;
  readonly cantoId: CantoId | null;
  /** Plug in the real presenter / world (bootstrap does this once the Phaser game exists). */
  attach(parts: Partial<RunnerPorts>): void;
  /** Resets state and plays the chapter. Resolves when the chapter ends or the session stops. Never rejects. */
  newGame(opts?: NewGameOptions): Promise<void>;
  /** Restores the save (scene-start snapshot) and plays on from that scene. */
  continueGame(): Promise<void>;
  canContinue(): boolean;
  /** Debug: stop and play on from a canto / scene / beat, keeping the current state. */
  jump(target: string, opts?: { readonly profile?: GameProfile }): Promise<void>;
  stop(): void;
  /** Q: Virgil's hint for the current moment (null = he is silent). */
  askVirgil(): HintSpec | null;
  /** Merge with defaults and enable; null disables. Returns the active options. */
  setAutoplay(opts: Partial<AutoplayOptions> | null): AutoplayOptions | null;
}

// ===========================================================================
// 9. Verse: tercets, chains, coda (bible §3.4; team B implements src/verse/**)
// ===========================================================================

export type VerseIssueCode =
  | 'locked'
  | 'empty'
  | 'unknown_word'
  | 'not_owned'
  | 'sealed'
  | 'burden'
  | 'outer_not_rhyming'
  | 'outer_same_word'
  | 'middle_same_family'
  | 'closer_not_middle'
  | 'chain_locked'
  | 'chain_break'
  | 'chain_repeat'
  | 'chain_after_closer'
  | 'too_many_tercets'
  | 'coda_locked'
  | 'coda_not_rhyming'
  | 'coda_reused';

export interface VerseIssue {
  readonly code: VerseIssueCode;
  readonly tercet: number | null;
  /** 0 = first outer, 1 = middle, 2 = second outer. */
  readonly slot: 0 | 1 | 2 | null;
  readonly word: WordName | null;
  readonly message: string;
}

export interface VerseContext {
  readonly owned: readonly WordName[];
  readonly sealed: readonly WordName[];
  readonly unlocks: readonly UnlockFeature[];
  /** Chapter 1: a chain is at most two tercets (bible §3.4.7). */
  readonly maxTercets: number;
}

export interface CentoLine {
  readonly word: WordName;
  readonly text: string;
  readonly citation: string;
}

export interface VerseEvaluation {
  readonly valid: boolean;
  readonly issues: readonly VerseIssue[];
  /** Per tercet: the middle word's category is the effect; strength = 1 + outer words of the same category. */
  readonly tercets: readonly { readonly middle: WordName; readonly category: WordCategory; readonly strength: number }[];
  readonly chainLength: number;
  readonly coda: { readonly word: WordName; readonly category: WordCategory } | null;
  readonly graceCost: number;
  /** The verse read as Longfellow lines (A, B, A per tercet, then the coda). */
  readonly cento: readonly CentoLine[];
}

// ===========================================================================
// 10. Levels and mechanics (team D framework; per-canto levels later)
// ===========================================================================

export type Facing = 'left' | 'right' | 'up' | 'down';

/** A character in the world (player, Virgil, an NPC). */
export interface ActorHandle {
  readonly id: string;
  readonly speaker: SpeakerId | null;
  readonly x: number;
  readonly y: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  /** Walk to a point; resolves on arrival or when `signal` aborts. */
  moveTo(x: number, y: number, opts?: { readonly speed?: number; readonly signal?: AbortSignal }): Promise<void>;
  teleport(x: number, y: number): void;
  face(dir: Facing): void;
  setVisible(visible: boolean): void;
}

export interface NpcDef {
  readonly speaker: SpeakerId;
  readonly x: number;
  readonly y: number;
  /** Texture key; default `npc-<speaker lowercase>` with a generic fallback. */
  readonly texture?: string;
  /** Shows a talk prompt when a `talk:<SPEAKER>` beat is armed (default true). */
  readonly talkable?: boolean;
  readonly facing?: Facing;
}

export interface WorldCameraApi {
  panTo(x: number, y: number, ms?: number): Promise<void>;
  zoomTo(zoom: number, ms?: number): Promise<void>;
  shake(ms?: number, intensity?: number): Promise<void>;
  follow(target: ActorHandle | null): void;
  fade(to: 'black' | 'white' | 'red' | 'clear', ms?: number): Promise<void>;
}

/** What a level (and its mechanics and beat hooks) can do at runtime. */
export interface LevelRuntime {
  readonly scene: Phaser.Scene;
  readonly cantoId: CantoId;
  readonly palette: CantoPalette;
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly player: ActorHandle;
  readonly virgil: ActorHandle | null;
  readonly camera: WorldCameraApi;
  npc(speaker: SpeakerId): ActorHandle | null;
  place(id: PlaceId): PlaceDef | null;
  isPlayerIn(id: PlaceId): boolean;
  /** Publish a gameplay event (`world:signal` kind 'event'). */
  emit(event: EventId): void;
  wait(ms: number, signal?: AbortSignal): Promise<void>;
  setPlayerControl(enabled: boolean): void;
  mechanic<M extends Mechanic = Mechanic>(id: string): M | null;
}

/** Handed to LevelModule.build: the runtime plus builders. */
export interface LevelBuildContext extends LevelRuntime {
  readonly script: CantoScript | null;
  setBounds(width: number, height: number): void;
  addPlace(def: PlaceDef): void;
  addSpawn(def: SpawnPoint): void;
  /** Where the player starts when the canto loads (default: first spawn, else the first place). */
  setStart(x: number, y: number): void;
  addNpc(def: NpcDef): ActorHandle;
  /** Impassable rectangle (walls, cliffs, water). */
  addSolid(rect: Rect): void;
  addMechanic<M extends Mechanic>(mechanic: M): M;
  /** Instantiate a library mechanic by name (null if not implemented yet). */
  createMechanic<C extends object>(name: MechanicName, config: C): Mechanic | null;
}

export type BeatHookPhase = 'start' | 'do' | 'end';

export interface BeatHookContext {
  readonly phase: BeatHookPhase;
  readonly canto: CantoScript;
  readonly scene: Scene;
  readonly beat: Beat;
  /** The DO line for phase 'do', else null. */
  readonly stmt: DoStmt | null;
  /** Index of the DO line among the beat's DO lines (phase 'do'), else -1. */
  readonly doIndex: number;
  readonly level: LevelRuntime;
  readonly state: GameStateView;
  readonly autoplay: boolean;
  /** Aborted when the runner stops; long actions must honour it. */
  readonly signal: AbortSignal;
}

/** Implements the DO lines (and set-up / clean-up) of one beat. Awaited by the world bridge. */
export type BeatHook = (ctx: BeatHookContext) => void | Promise<void>;

/**
 * A per-canto level (later phase). File convention: `src/levels/<cantoId>/index.ts`
 * default-exports a LevelModule; the framework discovers it with import.meta.glob.
 */
export interface LevelModule {
  readonly id: CantoId;
  readonly palette: CantoPalette;
  /** Event ids this level can emit (so canSatisfy(event:…) is true and the runner waits for the player). */
  readonly emits?: readonly EventId[];
  /** Create the map, named places, spawn points, NPCs and mechanics. */
  build(ctx: LevelBuildContext): void | Promise<void>;
  readonly beatHooks?: Readonly<Record<BeatId, BeatHook>>;
  update?(dt: number, level: LevelRuntime): void;
  destroy?(): void;
}

/** One instance of a library mechanic (wind field, swarm, darkness …) living in the world scene. */
export interface Mechanic {
  /** Library name (§7.0) or a level-specific name. */
  readonly name: string;
  /** Unique within the level (e.g. `wind_field#1`). */
  readonly id: string;
  enabled: boolean;
  /** `dt` in ms (Phaser delta), `time` in ms since scene start. */
  update(dt: number, time: number): void;
  destroy(): void;
  debugInfo(): Record<string, unknown>;
}

export interface MechanicContext {
  readonly level: LevelRuntime;
}

export type MechanicFactory<C extends object = Record<string, unknown>> = (
  ctx: MechanicContext,
  config: C,
) => Mechanic;

// ===========================================================================
// 11. Service registry and module entry points (signatures frozen; see ENGINE.md)
// ===========================================================================

export interface CoreServices {
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly session: GameSession;
  readonly audio: AudioService;
}

export interface PhaserDeps extends CoreServices {
  readonly game: Phaser.Game;
}

/** A: src/story/load.ts `loadStoryLibrary`. Fixtures (canto `inf99`) are included only on request (debug builds). */
export type LoadStoryLibrary = (opts?: { readonly includeFixtures?: boolean }) => StoryLibrary;
/** B: src/runtime/bus.ts `createEventBus` */
export type CreateEventBus = () => EventBus;
/** B: src/state/store.ts `createGameStateStore` */
export type CreateGameStateStore = (deps: { readonly bus: EventBus; readonly storage?: StorageLike | null }) => GameStateStore;
/** B: src/runtime/runner.ts `createStoryRunner` */
export type CreateStoryRunner = (deps: RunnerDeps) => StoryRunner;
/** B: src/runtime/session.ts `createGameSession` */
export type CreateGameSession = (deps: SessionDeps) => GameSession;
/** B: src/verse/tercet.ts `evaluateVerse` */
export type EvaluateVerse = (verse: ComposedVerse, ctx: VerseContext) => VerseEvaluation;
/** C: src/ui/presenter.ts `createPresenter` */
export type CreatePresenter = (deps: PhaserDeps) => StoryPresenter;
/** C: src/audio/audio.ts `createAudio` */
export type CreateAudio = (deps: { readonly bus: EventBus; readonly store: GameStateStore }) => AudioService;
/** D: src/world/bridge.ts `createWorldBridge` */
export type CreateWorldBridge = (deps: PhaserDeps) => WorldBridge;

// ===========================================================================
// 12. Debug API (window.__dante; enabled with ?debug=1 or in `vite dev`)
// ===========================================================================

export interface DebugLogEntry {
  readonly t: number;
  readonly type: string;
  readonly payload: unknown;
}

export interface DanteDebugApi {
  readonly version: string;
  readonly session: GameSession;
  readonly runner: StoryRunner;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  /** Live read-only state. */
  readonly state: GameStateView;
  readonly status: SessionStatus;
  readonly runnerStatus: RunnerStatus;
  readonly canto: CantoId | null;
  readonly scene: SceneId | null;
  /** Current beat id (the executing beat, else the cursor). */
  readonly beat: BeatId | null;
  readonly mode: BeatMode | null;
  /** These return immediately (never await the chapter); poll `status` / `beat`. */
  newGame(opts?: NewGameOptions): void;
  continueGame(): void;
  /** Canto (`inf03`), scene (`inf03.s2`) or beat (`inf03.s2.b1`). */
  jump(target: string, opts?: { readonly profile?: GameProfile }): void;
  choose(letter: OptionLetter): boolean;
  skipText(): void;
  teleport(place: PlaceId): boolean;
  emit(event: EventId): void;
  talk(speaker: SpeakerId): void;
  autoplay(opts?: Partial<AutoplayOptions> | false): AutoplayOptions | null;
  armed(): readonly ArmedBeat[];
  setSettings(patch: Partial<Settings>): void;
  /** Uncaught errors, unhandled rejections and 'debug:log' errors seen so far. */
  errors(): readonly string[];
  /** The last bus events (ring buffer). */
  events(): readonly DebugLogEntry[];
  diagnostics(): readonly Diagnostic[];
}
