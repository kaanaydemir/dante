/**
 * Typed AST of a parsed canto script, matching docs/script/README.md (the
 * "bible") §2 exactly, plus the closed vocabularies of §2–§4 and §7.0.
 *
 * SHARED CONTRACT (architect-owned). Pure TypeScript: no Phaser, no DOM, no
 * runtime dependencies. Everything here must stay JSON-serialisable (plain
 * objects and arrays; no Maps, Sets, classes or functions inside AST nodes).
 *
 * Section references (§) point into the bible.
 */

// ===========================================================================
// 1. Identifiers (§4.1)
// ===========================================================================

/** `inf01` … `inf34`, `pur01` …, `par01` … The fixture canto uses `inf99`. */
export type CantoId = string;
/** `<canto>.s<n>`, e.g. `inf03.s2`. `s0` is always the opening page. */
export type SceneId = string;
/** `<scene>.b<n>`, e.g. `inf03.s2.b4`. */
export type BeatId = string;
/** `<canto>.c<n>`, e.g. `inf05.c4`. */
export type ChoiceId = string;
/** `<canto>.<name>` for flags, memories, codex entries and events. Engine-only: `ch<n>.<name>`, `sys.<name>`. */
export type FlagId = string;
export type MemoryId = string;
export type CodexId = string;
export type EventId = string;
/** Map area: `<canto>_<name>`, e.g. `inf03_gate`. */
export type PlaceId = string;
/** Upper-case speaker id from §4.8, e.g. `VIRGIL`. */
export type SpeakerId = string;
/** A Word: one capitalised English word, unique in the game (`Love`). */
export type WordName = string;
/** Sin tag of the heart ledger (§3.1, §3.8): `limbo`, `lust`, … */
export type SinTag = string;

/** Reserved canto id for test fixtures (tests/fixtures/test-canto.md). Never used by real content. */
export const FIXTURE_CANTO_ID = 'inf99';

/** Regular expressions for the §4.1 grammar (the fixture id `inf99` passes the shape checks). */
export const ID_PATTERNS = {
  canto: /^(inf|pur|par)\d{2}$/,
  scene: /^(inf|pur|par)\d{2}\.s\d{1,2}$/,
  beat: /^(inf|pur|par)\d{2}\.s\d{1,2}\.b\d{1,2}$/,
  choice: /^(inf|pur|par)\d{2}\.c\d{1,2}$/,
  /** flag / memory / codex / event ids, including engine prefixes ch<n> and sys. */
  named: /^((inf|pur|par)\d{2}|ch\d+|sys)\.[a-z][a-z0-9_]{1,31}$/,
  place: /^(inf|pur|par)\d{2}_[a-z][a-z0-9_]*$/,
  speaker: /^[A-Z][A-Z_]*$/,
  word: /^[A-Z][a-z]+$/,
} as const;

// ===========================================================================
// 2. Closed vocabularies
// ===========================================================================

export const CANTICLES = ['Inferno', 'Purgatorio', 'Paradiso'] as const;
export type Canticle = (typeof CANTICLES)[number];

export const CANTICLE_PREFIX: Readonly<Record<Canticle, 'inf' | 'pur' | 'par'>> = {
  Inferno: 'inf',
  Purgatorio: 'pur',
  Paradiso: 'par',
};

/** §2.7 `@mode:` values. */
export const BEAT_MODES = ['page', 'cinematic', 'dialogue', 'play', 'colophon'] as const;
export type BeatMode = (typeof BEAT_MODES)[number];

/** §2.7 directive keys. */
export const DIRECTIVE_KEYS = ['mode', 'place', 'trigger', 'music', 'ambience', 'chapter_end'] as const;
export type DirectiveKey = (typeof DIRECTIVE_KEYS)[number];

/** §2.7 `@trigger:` kinds. */
export const TRIGGER_KINDS = ['auto', 'enter', 'talk', 'event', 'after'] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

/** §2.5 speaker tags (closed list): pick the portrait and tone. */
export const SPEAKER_TAGS = [
  'afraid',
  'gentle',
  'stern',
  'weeping',
  'pale',
  'whisper',
  'shout',
  'awed',
  'ashamed',
  'sad',
  'firm',
  'quiet',
  'wry',
] as const;
export type SpeakerTag = (typeof SPEAKER_TAGS)[number];

/** §2.5 `CAM` verbs (closed list). */
export const CAM_VERBS = [
  'cut',
  'fade-in',
  'fade-out',
  'pan',
  'zoom-in',
  'zoom-out',
  'shake',
  'hold',
  'follow',
  'white-out',
  'engrave',
  'unengrave',
  'page-turn',
] as const;
export type CamVerb = (typeof CAM_VERBS)[number];

/** §2.5 `{tutorial:<name>}` names. */
export const TUTORIAL_NAMES = [
  'move',
  'dash',
  'talk',
  'follow',
  'read',
  'compose',
  'verse',
  'chain',
  'shelter',
] as const;
export type TutorialName = (typeof TUTORIAL_NAMES)[number];

/** §2.9 choice weights. */
export const CHOICE_WEIGHTS = ['minor', 'major', 'centre'] as const;
export type ChoiceWeight = (typeof CHOICE_WEIGHTS)[number];

/** Maximum magnitude per effect kind for each weight (§2.9 table). */
export const WEIGHT_LIMITS: Readonly<
  Record<ChoiceWeight, { heart: number; trust: number; virtue: number; resource: number }>
> = {
  minor: { heart: 1, trust: 1, virtue: 1, resource: 1 },
  major: { heart: 2, trust: 1, virtue: 1, resource: 1 },
  centre: { heart: 3, trust: 1, virtue: 1, resource: 1 },
};

/** §2.9 option letters. */
export const OPTION_LETTERS = ['a', 'b', 'c'] as const;
export type OptionLetter = (typeof OPTION_LETTERS)[number];

/** §2.11 reveal timings. */
export const REVEAL_TIMINGS = ['immediate', 'deferred'] as const;
export type RevealTiming = (typeof REVEAL_TIMINGS)[number];

/** §3.6 cardinal virtues. */
export const VIRTUES = ['prudence', 'justice', 'fortitude', 'temperance'] as const;
export type Virtue = (typeof VIRTUES)[number];

/** §2.10 `unlock:` features. */
export const UNLOCK_FEATURES = [
  'book',
  'words',
  'verse',
  'compose',
  'heart',
  'codex',
  'remembrance',
  'chain',
] as const;
export type UnlockFeature = (typeof UNLOCK_FEATURES)[number];

/** §2.12 codex tabs. */
export const CODEX_TABS = ['souls', 'places', 'lore'] as const;
export type CodexTab = (typeof CODEX_TABS)[number];

/** §2.13 memory kinds. */
export const MEMORY_KINDS = ['asked', 'kept'] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

/** §2.2 `status`. */
export const SCRIPT_STATUSES = ['draft', 'review', 'locked'] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

/** §6.5 designer notes. Parsed, kept for lint, ignored by the runtime. */
export const NOTE_KINDS = ['SAPMA', 'EKLEME'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** §2.8 comparison operators. */
export const COMPARE_OPS = ['>=', '<=', '>', '<', '==', '!='] as const;
export type CompareOp = (typeof COMPARE_OPS)[number];

/** §3.1 sin tags allowed in Chapter 1. */
export const SIN_TAGS_CH1 = ['limbo', 'lust'] as const;
/** §3.8 draft list of every sin tag known so far (later chapters). */
export const SIN_TAGS_KNOWN = [
  'limbo',
  'lust',
  'gluttony',
  'avarice',
  'prodigality',
  'wrath',
  'sullen',
  'sodomy',
] as const;

/** §3.4.3 word categories. */
export const WORD_CATEGORIES = ['Force', 'Ward', 'Mend', 'Reveal', 'Still', 'Swift', 'Burden'] as const;
export type WordCategory = (typeof WORD_CATEGORIES)[number];

/**
 * §2.5 reserved words: tried before the speaker pattern; never valid speaker ids
 * (`ID`, `TAB`, `TITLE`, `RELATED`, `NAME`, `KIND` are Codex / memory fields).
 */
export const RESERVED_WORDS = [
  'NARRATION',
  'PAGE',
  'GLOSS',
  'HINT',
  'HINT-SHORT',
  'BARK',
  'DO',
  'CAM',
  'SFX',
  'EFFECTS',
  'PROMPT',
  'NOTE',
  'QUOTE',
  'IF',
  'ELSE',
  'END',
  'CHOICE',
  'OPTION',
  'REVEAL',
  'GOTO',
  'SAPMA',
  'EKLEME',
  'ID',
  'TAB',
  'TITLE',
  'RELATED',
  'NAME',
  'KIND',
] as const;

/** §7.0 mechanics vocabulary (front matter `mechanics:`). */
export const MECHANIC_NAMES = [
  'move',
  'dash',
  'talk',
  'follow',
  'fear',
  'darkness',
  'look_back',
  'chase',
  'hold_ground',
  'push_back',
  'read_pages',
  'compose',
  'verse',
  'inscription',
  'heart',
  'crowd_flow',
  'swarm',
  'guardian',
  'quake',
  'faint',
  'hub',
  'walk_on_water',
  'remembrance',
  'chain',
  'judgement_game',
  'wind_field',
  'shelter',
  'wind_lull',
] as const;
export type MechanicName = (typeof MECHANIC_NAMES)[number];

/**
 * §7.0 persistent mechanics: once unlocked / taught they work in every canto,
 * though a script lists them only where they are taught or featured. Every
 * other mechanic is active only in the cantos that list it.
 */
export const PERSISTENT_MECHANICS: readonly MechanicName[] = [
  'move',
  'dash',
  'talk',
  'follow',
  'compose',
  'verse',
  'heart',
  'remembrance',
  'chain',
];

// ===========================================================================
// 3. Speakers and speaking rights (§4.8)
// ===========================================================================

/**
 * - `modern+longfellow`: modern lines and QUOTE voice (Dante, Virgil).
 * - `longfellow`: QUOTE voice only; no modern lines (Beatrice, Lucia, Francesca, Charon, Minos, Voice).
 * - `modern-limited`: modern, at most `maxBalloons` balloons per canto (the four poets: 2).
 * - `modern-single`: Limbo's great spirits: one balloon each; at most 8 speakers per canto.
 * - `soul`: modern only in Minos's court, otherwise BARK.
 * - `bark`: BARK only (NEUTRAL: fragments of at most three words; SHADE: preferably never).
 * - `silent`: no lines and no QUOTE voice.
 * - `quote-voice`: only as a QUOTE voice (POET, INSCRIPTION).
 */
export type SpeakingRight =
  | 'modern+longfellow'
  | 'longfellow'
  | 'modern-limited'
  | 'modern-single'
  | 'soul'
  | 'bark'
  | 'silent'
  | 'quote-voice';

export interface SpeakerDef {
  readonly id: SpeakerId;
  /** In-game display name (English). */
  readonly name: string;
  readonly right: SpeakingRight;
  /** Per-speaker balloon cap within one canto, when the bible sets one. */
  readonly maxBalloons?: number;
  /** BARK word cap (NEUTRAL: 3). */
  readonly maxBarkWords?: number;
}

const LIMBO_GREATS: ReadonlyArray<readonly [SpeakerId, string]> = [
  ['ARISTOTLE', 'Aristotle'],
  ['SOCRATES', 'Socrates'],
  ['PLATO', 'Plato'],
  ['AVICENNA', 'Avicenna'],
  ['AVERROES', 'Averroes'],
  ['ELECTRA', 'Electra'],
  ['HECTOR', 'Hector'],
  ['CAESAR', 'Caesar'],
  ['CAMILLA', 'Camilla'],
  ['PENTHESILEA', 'Penthesilea'],
  ['LATINUS', 'Latinus'],
  ['LAVINIA', 'Lavinia'],
  ['BRUTUS', 'Brutus'],
  ['LUCRETIA', 'Lucretia'],
  ['JULIA', 'Julia'],
  ['MARCIA', 'Marcia'],
  ['CORNELIA', 'Cornelia'],
  ['DEMOCRITUS', 'Democritus'],
  ['DIOGENES', 'Diogenes'],
  ['ANAXAGORAS', 'Anaxagoras'],
  ['THALES', 'Thales'],
  ['ZENO', 'Zeno'],
  ['EMPEDOCLES', 'Empedocles'],
  ['HERACLITUS', 'Heraclitus'],
  ['DIOSCORIDES', 'Dioscorides'],
  ['ORPHEUS', 'Orpheus'],
  ['TULLY', 'Tully'],
  ['LIVY', 'Livy'],
  ['SENECA', 'Seneca'],
  ['EUCLID', 'Euclid'],
  ['PTOLEMY', 'Ptolemy'],
  ['GALEN', 'Galen'],
  ['HIPPOCRATES', 'Hippocrates'],
];

const SILENT: ReadonlyArray<readonly [SpeakerId, string]> = [
  ['PANTHER', 'The Panther'],
  ['LION', 'The Lion'],
  ['SHE_WOLF', 'The She-wolf'],
  ['PAOLO', 'Paolo'],
  ['GREAT_REFUSAL', 'The Shade of the Great Refusal'],
  ['AENEAS', 'Aeneas'],
  ['SALADIN', 'Saladin'],
  ['SEMIRAMIS', 'Semiramis'],
  ['DIDO', 'Dido'],
  ['CLEOPATRA', 'Cleopatra'],
  ['HELEN', 'Helen'],
  ['ACHILLES', 'Achilles'],
  ['PARIS', 'Paris'],
  ['TRISTAN', 'Tristan'],
  ['VIRGIN', 'The Gentle Lady'],
  ['RACHEL', 'Rachel'],
];

/** The §4.8 speaker registry. Lint (L05) and presentation (names, portraits) read this. */
export const SPEAKERS: Readonly<Record<SpeakerId, SpeakerDef>> = Object.freeze({
  DANTE: { id: 'DANTE', name: 'Dante', right: 'modern+longfellow' },
  VIRGIL: { id: 'VIRGIL', name: 'Virgil', right: 'modern+longfellow' },
  BEATRICE: { id: 'BEATRICE', name: 'Beatrice', right: 'longfellow' },
  LUCIA: { id: 'LUCIA', name: 'Lucia', right: 'longfellow' },
  FRANCESCA: { id: 'FRANCESCA', name: 'Francesca', right: 'longfellow' },
  CHARON: { id: 'CHARON', name: 'Charon', right: 'longfellow' },
  MINOS: { id: 'MINOS', name: 'Minos', right: 'longfellow' },
  VOICE: { id: 'VOICE', name: 'A Voice', right: 'longfellow' },
  HOMER: { id: 'HOMER', name: 'Homer', right: 'modern-limited', maxBalloons: 2 },
  HORACE: { id: 'HORACE', name: 'Horace', right: 'modern-limited', maxBalloons: 2 },
  OVID: { id: 'OVID', name: 'Ovid', right: 'modern-limited', maxBalloons: 2 },
  LUCAN: { id: 'LUCAN', name: 'Lucan', right: 'modern-limited', maxBalloons: 2 },
  ...Object.fromEntries(
    LIMBO_GREATS.map(([id, name]) => [id, { id, name, right: 'modern-single', maxBalloons: 1 } satisfies SpeakerDef]),
  ),
  SOUL: { id: 'SOUL', name: 'A Soul', right: 'soul' },
  NEUTRAL: { id: 'NEUTRAL', name: 'A Neutral', right: 'bark', maxBarkWords: 3 },
  SHADE: { id: 'SHADE', name: 'A Shade', right: 'bark' },
  ...Object.fromEntries(SILENT.map(([id, name]) => [id, { id, name, right: 'silent' } satisfies SpeakerDef])),
  POET: { id: 'POET', name: 'The Poet', right: 'quote-voice' },
  INSCRIPTION: { id: 'INSCRIPTION', name: 'The Inscription', right: 'quote-voice' },
} satisfies Record<SpeakerId, SpeakerDef>);

/** At most this many Limbo great spirits speak in one canto (§4.8). */
export const MAX_LIMBO_SPEAKERS_PER_CANTO = 8;

/** QUOTE voices: POET, INSCRIPTION, or a speaker allowed to quote Longfellow. */
export type QuoteVoice = SpeakerId;

// ===========================================================================
// 4. Positions and diagnostics
// ===========================================================================

/** 1-based line in the markdown file a node came from. */
export interface SourcePos {
  readonly line: number;
  /** Path as loaded, e.g. `/docs/script/inferno-03.md`. Set on top-level nodes; optional elsewhere. */
  readonly file?: string;
}

export type Severity = 'error' | 'warning' | 'info';

/**
 * Parser and lint findings. Codes: `P..` for parse problems (see parser.ts),
 * `L01`–`L22` for the bible's lint rules (§2.14), `Q..` for quote checks.
 */
export interface Diagnostic {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
  readonly pos?: SourcePos;
}

// ===========================================================================
// 5. Citations and source texts
// ===========================================================================

/** `Inferno III, 49–51` parsed. `first === last` for single lines. */
export interface Citation {
  readonly canticle: Canticle;
  readonly canto: number;
  /** Upper-case Roman numeral as written, e.g. `III`. */
  readonly roman: string;
  readonly first: number;
  readonly last: number;
  /** Canonical display text with an en dash: `Inferno III, 49–51`. */
  readonly text: string;
}

/** One numbered Longfellow canto (docs/source/<canticle>/canto-NN.txt). */
export interface SourceCanto {
  readonly canticle: Canticle;
  readonly canto: number;
  /** `lines[n - 1]` is verse line n, exactly as in the file (after the `|`, without the leading space). */
  readonly lines: readonly string[];
  readonly count: number;
  readonly file: string;
}

// ===========================================================================
// 6. Conditions (§2.8)
// ===========================================================================

/** Variables usable in comparisons (§2.8 `değişken`). */
export type VariableRef =
  | { readonly kind: 'pity' }
  | { readonly kind: 'justice' }
  /** heart = pity − justice */
  | { readonly kind: 'heart' }
  | { readonly kind: 'pity_at'; readonly sin: SinTag }
  | { readonly kind: 'justice_at'; readonly sin: SinTag }
  | { readonly kind: 'trust' }
  | { readonly kind: 'virtue'; readonly virtue: Virtue }
  | { readonly kind: 'resolve' }
  | { readonly kind: 'grace' };

/**
 * Condition AST. `and` binds tighter than `or` (§2.8). `const` exists so a
 * malformed condition can degrade to `false` (with a diagnostic) instead of
 * crashing the runner.
 */
export type Condition =
  | { readonly type: 'and'; readonly terms: readonly Condition[] }
  | { readonly type: 'or'; readonly terms: readonly Condition[] }
  | { readonly type: 'not'; readonly term: Condition }
  | { readonly type: 'flag'; readonly id: FlagId }
  | { readonly type: 'memory'; readonly id: MemoryId }
  | { readonly type: 'codex'; readonly id: CodexId }
  /** Word owned and not sealed (and not shed). */
  | { readonly type: 'word'; readonly word: WordName }
  /** Word sealed. */
  | { readonly type: 'sealed'; readonly word: WordName }
  | { readonly type: 'choice'; readonly choice: ChoiceId; readonly letter: OptionLetter }
  /** Scene or beat has been seen (started) in this playthrough. */
  | { readonly type: 'seen'; readonly id: SceneId | BeatId }
  /** Event has been emitted (meaningful in systemic `when:` clauses, §2.8). */
  | { readonly type: 'event'; readonly id: EventId }
  | { readonly type: 'compare'; readonly variable: VariableRef; readonly op: CompareOp; readonly value: number }
  | { readonly type: 'const'; readonly value: boolean };

/**
 * Read-only view of game state that conditions are evaluated against.
 * Implemented by the state store (team B); consumed by story-core's
 * `evaluateCondition` (team A). Missing data is simply false / 0.
 */
export interface ConditionContext {
  hasFlag(id: FlagId): boolean;
  hasMemory(id: MemoryId): boolean;
  hasCodex(id: CodexId): boolean;
  /** Owned, not sealed, not shed. */
  hasWord(word: WordName): boolean;
  isSealed(word: WordName): boolean;
  /** The recorded letter of a resolved choice, or null if unresolved. */
  choiceLetter(choice: ChoiceId): OptionLetter | null;
  hasSeen(id: SceneId | BeatId): boolean;
  /**
   * Bible §2.9: an `event:` predicate is true when the event was emitted in the
   * CURRENT SCENE before the CHOICE line. The store records every event in
   * `state.events`; the runner wraps this context with its scene-scoped set.
   */
  hasEvent(id: EventId): boolean;
  value(variable: VariableRef): number;
}

// ===========================================================================
// 7. Effects (§2.10)
// ===========================================================================

/** One EFFECTS token. Tokens apply in the order written. */
export type Effect =
  /** `pity+N@sin` / `justice+N@sin`. Heart effects never subtract. `sin` is null only in malformed input (lint L13). */
  | { readonly type: 'heart'; readonly side: 'pity' | 'justice'; readonly amount: number; readonly sin: SinTag | null }
  /** `trust+N` / `trust-N`, clamped to 0–10 by the store. */
  | { readonly type: 'trust'; readonly delta: number }
  /** `virtue:<v>+N`. */
  | { readonly type: 'virtue'; readonly virtue: Virtue; readonly amount: number }
  /** `word:X`: give the word; if sealed, unseal it. */
  | { readonly type: 'word'; readonly word: WordName }
  /** `seal:X`: visible in the Book, unusable in tercets. */
  | { readonly type: 'seal'; readonly word: WordName }
  /** `shed:X`: drop a Burden word for good. */
  | { readonly type: 'shed'; readonly word: WordName }
  | { readonly type: 'memory'; readonly id: MemoryId }
  | { readonly type: 'codex'; readonly id: CodexId }
  | { readonly type: 'flag'; readonly id: FlagId }
  /**
   * `resolve±N`, `grace±N` in bar units (1 unit = 10 % of the starting bar), `gracemax+1`.
   * A scripted `resolve-N` never takes Resolve below 1 unit: script effects never cause a faint (§2.10).
   */
  | { readonly type: 'resolve'; readonly delta: number }
  | { readonly type: 'grace'; readonly delta: number }
  | { readonly type: 'gracemax'; readonly delta: number }
  | { readonly type: 'unlock'; readonly feature: UnlockFeature };

export type EffectType = Effect['type'];

// ===========================================================================
// 8. Triggers and directives (§2.7)
// ===========================================================================

export type Trigger =
  /** Starts when the previous beat (file order) finishes. The default. */
  | { readonly kind: 'auto' }
  | { readonly kind: 'enter'; readonly place: PlaceId }
  | { readonly kind: 'talk'; readonly speaker: SpeakerId }
  | { readonly kind: 'event'; readonly id: EventId }
  | { readonly kind: 'after'; readonly beat: BeatId };

// ===========================================================================
// 9. Statements: the line types of a ```script block (§2.5)
// ===========================================================================

interface StmtBase {
  readonly pos: SourcePos;
}

/** A directive that appears after the leading directive lines of a beat (e.g. a mid-beat `@music:` change). */
export interface DirectiveStmt extends StmtBase {
  readonly type: 'directive';
  readonly key: DirectiveKey;
  readonly value: string;
}

/** `NARRATION: …` the book's voice as a parchment strip (≤ 200 chars, ≤ 2 sentences). */
export interface NarrationStmt extends StmtBase {
  readonly type: 'narration';
  readonly text: string;
}

/** `PAGE: …` the book's voice as a full page (≤ 400 chars). */
export interface PageStmt extends StmtBase {
  readonly type: 'page';
  readonly text: string;
}

/** `SPEAKER: …` or `SPEAKER (tag): …` a modern dialogue balloon (≤ 140 chars). */
export interface SayStmt extends StmtBase {
  readonly type: 'say';
  readonly speaker: SpeakerId;
  readonly tag: SpeakerTag | null;
  readonly text: string;
}

/** A verse line inside a QUOTE. `cutStart` / `cutEnd`: the line was shortened with `…` at that end (§2.6). */
export interface QuoteVerse {
  readonly kind: 'verse';
  /** Text as written in the script (without the leading `> `), including any `…`. */
  readonly text: string;
  /**
   * Source line number. The parser fills it when unambiguous (no skip lines);
   * the loader resolves the rest against the Longfellow source. null if unknown.
   */
  readonly lineNo: number | null;
  readonly cutStart: boolean;
  readonly cutEnd: boolean;
  readonly pos: SourcePos;
}

/** A `> …` line on its own: lines were skipped inside the cited range (§2.6 rule 3). */
export interface QuoteSkip {
  readonly kind: 'skip';
  readonly pos: SourcePos;
}

export type QuoteLine = QuoteVerse | QuoteSkip;

/**
 * `QUOTE <VOICE> (<citation>)` + `> …` lines (+ an optional `GLOSS:` right after).
 * Used in beats, in REVEAL blocks, and in Codex / Memory entries.
 */
export interface QuoteStmt extends StmtBase {
  readonly type: 'quote';
  readonly voice: QuoteVoice;
  /** null when the citation could not be parsed (diagnostic emitted). */
  readonly citation: Citation | null;
  /** Citation exactly as written between the parentheses. */
  readonly citationRaw: string;
  readonly lines: readonly QuoteLine[];
  /** `GLOSS: …` attached to this quote (opened with Q), or null. */
  readonly gloss: string | null;
}

/** `BARK SPEAKER: …` ambient line that never stops play (≤ 60 chars). */
export interface BarkStmt extends StmtBase {
  readonly type: 'bark';
  readonly speaker: SpeakerId;
  readonly text: string;
}

/** `HINT: …` (≤ 120) with an optional following `HINT-SHORT: …` (≤ 60). Registers the current "Ask Virgil" (Q) hint. */
export interface HintStmt extends StmtBase {
  readonly type: 'hint';
  readonly text: string;
  readonly short: string | null;
}

/** Machine-read tags inside a DO line (§2.5). */
export type DoTag =
  | { readonly kind: 'event'; readonly id: EventId }
  | { readonly kind: 'checkpoint' }
  | { readonly kind: 'tutorial'; readonly name: TutorialName }
  | { readonly kind: 'unknown'; readonly raw: string };

/** `DO: …` stage / gameplay direction (Turkish prose for designers) with machine tags. */
export interface DoStmt extends StmtBase {
  readonly type: 'do';
  /** Prose with the `{…}` tags removed and whitespace trimmed. Never shown to players. */
  readonly text: string;
  readonly tags: readonly DoTag[];
}

/** `CAM: <verb> — <description>`. */
export interface CamStmt extends StmtBase {
  readonly type: 'cam';
  readonly verb: CamVerb;
  /** Free description after the dash (Turkish); may be empty. */
  readonly text: string;
}

/** `SFX: …` sound direction (Turkish description). */
export interface SfxStmt extends StmtBase {
  readonly type: 'sfx';
  readonly text: string;
}

/** `EFFECTS: tok, tok, …` */
export interface EffectsStmt extends StmtBase {
  readonly type: 'effects';
  readonly effects: readonly Effect[];
  /** The text after `EFFECTS:` as written. */
  readonly raw: string;
  /** Tokens that did not parse (diagnostics emitted); never applied. */
  readonly invalid: readonly string[];
}

export interface IfBranch {
  readonly condition: Condition;
  /** Condition text as written. */
  readonly raw: string;
  readonly body: readonly Statement[];
  readonly pos: SourcePos;
}

/** `IF … / ELSE IF … / ELSE / END IF` as a tree (≤ 2 levels deep, §2.8). */
export interface IfStmt extends StmtBase {
  readonly type: 'if';
  /** The IF branch first, then each ELSE IF in order. */
  readonly branches: readonly IfBranch[];
  /** ELSE body, or null when there is no ELSE. */
  readonly elseBody: readonly Statement[] | null;
}

/** `OPTION <letter> [<text>] [requires: <cond>] [when: <cond> | when: else]` and the lines that follow it. */
export interface ChoiceOption {
  readonly letter: OptionLetter;
  /**
   * Option text between the brackets, verbatim (quotes included when spoken). ≤ 48 chars.
   * For systemic choices it is a short past-tense label for the Book (`Held his ground`), never shown as a menu.
   */
  readonly text: string;
  /** True when the text is a sentence in double quotes that Dante says (§2.9). */
  readonly spoken: boolean;
  /** For spoken options: the sentence without the surrounding quotes, shown as Dante's balloon. */
  readonly speech: string | null;
  /** Visibility condition (`requires:`, dialogue choices only), or null. */
  readonly requires: Condition | null;
  readonly requiresRaw: string | null;
  /** Selection condition (`when:`, systemic choices only); `'else'` for `when: else`; null for dialogue choices. */
  readonly when: Condition | 'else' | null;
  readonly whenRaw: string | null;
  /** Lines specific to this option (may include EFFECTS, IF, GOTO …). */
  readonly body: readonly Statement[];
  /** Convenience: every effect of the top-level EFFECTS lines in `body`, in order. */
  readonly effects: readonly Effect[];
  readonly pos: SourcePos;
}

/** `REVEAL canon=<…> timing=<…>` + 1–3 QUOTE blocks + exactly one `NOTE:` (§2.11). */
export interface Reveal {
  /** Canonical letters, `'all'` (Dante did all) or `'none'` (the poem is silent). */
  readonly canon: readonly OptionLetter[] | 'all' | 'none';
  readonly timing: RevealTiming;
  readonly quotes: readonly QuoteStmt[];
  /** ≤ 160 chars, plain English, past tense. */
  readonly note: string;
  readonly pos: SourcePos;
}

/** `CHOICE <id> <weight> [systemic] "<record title>"` … `END CHOICE` (§2.9). */
export interface ChoiceStmt extends StmtBase {
  readonly type: 'choice';
  readonly id: ChoiceId;
  readonly weight: ChoiceWeight;
  /** Systemic choices show no menu: the first option whose `when:` holds is taken. */
  readonly systemic: boolean;
  /** Record title (English) for the Book and the colophon. */
  readonly title: string;
  /** `PROMPT: …` in the book's voice, or null. ≤ 120 chars. */
  readonly prompt: string | null;
  readonly options: readonly ChoiceOption[];
  /** Required for dialogue choices (L14), optional for systemic ones. */
  readonly reveal: Reveal | null;
  /** The beat this choice is written in. */
  readonly beatId: BeatId;
}

/** `GOTO <beat-id>`: jump to a beat of the same scene (L21). Inside an option it is the option's last line (§2.9). */
export interface GotoStmt extends StmtBase {
  readonly type: 'goto';
  readonly target: BeatId;
}

/** `SAPMA: …` / `EKLEME: …` designer notes (Turkish). Ignored at runtime. */
export interface NoteStmt extends StmtBase {
  readonly type: 'note';
  readonly kind: NoteKind;
  readonly text: string;
}

/** A line that matches no line type (L04). Kept so lint can report it; skipped at runtime. */
export interface UnknownStmt extends StmtBase {
  readonly type: 'unknown';
  readonly raw: string;
  readonly reason: string;
}

/** Every statement a beat body can contain. `// comments` and blank lines are dropped by the parser. */
export type Statement =
  | DirectiveStmt
  | NarrationStmt
  | PageStmt
  | SayStmt
  | QuoteStmt
  | BarkStmt
  | HintStmt
  | DoStmt
  | CamStmt
  | SfxStmt
  | EffectsStmt
  | IfStmt
  | ChoiceStmt
  | GotoStmt
  | NoteStmt
  | UnknownStmt;

export type StatementType = Statement['type'];

// ===========================================================================
// 10. Structure: front matter, scenes, beats, codex, memories (§2.2–§2.4, §2.12, §2.13)
// ===========================================================================

/** §2.2 front matter, coerced to these types (lint L01 reports anything missing or mistyped). */
export interface FrontMatter {
  readonly id: CantoId;
  readonly canticle: string;
  readonly canto: number;
  readonly title: string;
  readonly title_tr: string;
  readonly location: string;
  readonly source: string;
  /** Range text, e.g. `1–136`. */
  readonly lines: string;
  /** Citation text, e.g. `Inferno III, 1–3`. */
  readonly epigraph: string;
  readonly closing: string;
  readonly characters: readonly SpeakerId[];
  readonly mechanics: readonly string[];
  readonly choices: readonly ChoiceId[];
  readonly words: readonly WordName[];
  readonly memories: readonly MemoryId[];
  readonly codex: readonly CodexId[];
  readonly flags_set: readonly FlagId[];
  readonly flags_read: readonly FlagId[];
  readonly unlocks: readonly string[];
  readonly playtime: string;
  readonly writer: string;
  readonly status: ScriptStatus;
  readonly version: string;
}

export type FrontMatterKey = keyof FrontMatter;

/** A presentation / interaction unit (`### [inf03.s2.b4] Title`) with exactly one script block. */
export interface Beat {
  readonly id: BeatId;
  readonly sceneId: SceneId;
  readonly cantoId: CantoId;
  /** English heading text after the id. */
  readonly title: string;
  /** Position within its scene (0-based, file order = play order). */
  readonly index: number;
  /** `@mode:`; the parser defaults to `cinematic` (with an L03 diagnostic) if missing. */
  readonly mode: BeatMode;
  /** `@place:` or null. */
  readonly place: PlaceId | null;
  /** `@trigger:`; `{ kind: 'auto' }` when absent. */
  readonly trigger: Trigger;
  /** `@music:` / `@ambience:` (Turkish descriptions) or null. */
  readonly music: string | null;
  readonly ambience: string | null;
  /** `@chapter_end:` value, e.g. `ch1` (only in the Canto V colophon). */
  readonly chapterEnd: string | null;
  /** The script block, minus the leading directive lines (which became the fields above). */
  readonly lines: readonly Statement[];
  /** False when the beat had no ```script block (L03). */
  readonly hasScript: boolean;
  readonly pos: SourcePos;
}

/** A continuous stretch of time in one place (`## [inf03.s2] Title`). */
export interface Scene {
  readonly id: SceneId;
  readonly cantoId: CantoId;
  readonly title: string;
  /** 0-based position in the file. */
  readonly index: number;
  /** The n of `s<n>`. 0 is the opening page. */
  readonly number: number;
  readonly beats: readonly Beat[];
  readonly pos: SourcePos;
}

/** One ```codex block under `## Codex` (§2.12). */
export interface CodexEntry {
  readonly id: CodexId;
  readonly cantoId: CantoId;
  readonly tab: CodexTab;
  /** ≤ 40 chars. */
  readonly title: string;
  /** 1–6 lines; null if missing (lint). */
  readonly quote: QuoteStmt | null;
  /** ≤ 400 chars. */
  readonly note: string;
  readonly related: readonly CodexId[];
  readonly pos: SourcePos;
}

/** One ```memory block under `## Memories` (§2.13). */
export interface MemoryEntry {
  readonly id: MemoryId;
  readonly cantoId: CantoId;
  readonly name: string;
  readonly kind: MemoryKind;
  readonly quote: QuoteStmt | null;
  /** ≤ 300 chars, the book's voice. */
  readonly note: string;
  readonly pos: SourcePos;
}

/** A fully parsed canto script file. */
export interface CantoScript {
  /** Path the text was loaded from, e.g. `/docs/script/inferno-03.md`. */
  readonly file: string;
  readonly id: CantoId;
  readonly front: FrontMatter;
  /** The single H1 text, e.g. `Inferno III — The Gate`. */
  readonly heading: string;
  /** Derived, validated values for convenience. */
  readonly canticle: Canticle;
  readonly cantoNumber: number;
  /** Roman numeral of `cantoNumber`, e.g. `III`. */
  readonly roman: string;
  readonly lineRange: { readonly first: number; readonly last: number } | null;
  readonly epigraph: Citation | null;
  readonly closing: Citation | null;
  /** In file order. scenes[0] is s0 (opening page); the last scene is the colophon. */
  readonly scenes: readonly Scene[];
  readonly codex: readonly CodexEntry[];
  readonly memories: readonly MemoryEntry[];
}

/** Result of parsing one script file. `canto` is null only if nothing usable was found. */
export interface ParseResult {
  readonly canto: CantoScript | null;
  readonly diagnostics: readonly Diagnostic[];
}

// ===========================================================================
// 11. Words (§3.4.6) — the binding word table's row type
// ===========================================================================

/**
 * One row of the word table. The table itself lives in src/story/words.ts.
 * - `role: 'rhyme'` words sit in any slot of a tercet (outer pair = same family).
 * - `role: 'closer'` (Judgment) has no rhyme partner: middle slot only, ends a chain.
 * - `role: 'burden'` (Fear) cannot be placed at all.
 */
export interface WordDef {
  readonly name: WordName;
  /** Rhyme family label (`-ay`, `-ire`, …); null for the closer and the burden. */
  readonly family: string | null;
  readonly role: 'rhyme' | 'closer' | 'burden';
  readonly category: WordCategory;
  /** Canto and scene that grant the word for the first time. */
  readonly canto: CantoId;
  readonly scene: SceneId;
  /** The origin line: the word is its last word (§3.4.2). */
  readonly origin: {
    readonly text: string;
    /** e.g. `Inferno I, 12` */
    readonly citation: string;
    readonly canticle: Canticle;
    readonly canto: number;
    readonly line: number;
  };
  /**
   * How it is acquired: `collect` (glows in its origin line; take it with E),
   * `auto` (Burden: sticks by itself), `colophon` (given on the colophon page),
   * `conditional` (only on a path, see `condition`).
   */
  readonly acquisition: 'collect' | 'auto' | 'colophon' | 'conditional';
  /** For conditional words, the condition in §2.8 syntax, e.g. `choice:inf05.c4=b`. */
  readonly condition: string | null;
  /** In-game description, ≤ 12 words. */
  readonly description: string;
}

// ===========================================================================
// 12. Lint configuration (consumed by src/story/lint.ts)
// ===========================================================================

/**
 * `canto`: full bible rules for real canto files.
 * `fixture`: for `inf99` fixtures: skips rules tied to real cantos (the §7 scene
 * list, the §3.4.6 word-to-canto assignment, the §4.3 cross-canto flag registry,
 * id range 01–34, source path ↔ canto number) but keeps every format rule.
 */
export type LintProfile = 'canto' | 'fixture';

export interface LintContext {
  readonly profile: LintProfile;
  /** Longfellow source lookup for L06 (quote verification). */
  source(canticle: Canticle, canto: number): SourceCanto | null;
  /** Other parsed cantos of the chapter, for cross-file rules (sealed words, flags read). */
  readonly cantos?: readonly CantoScript[];
}
