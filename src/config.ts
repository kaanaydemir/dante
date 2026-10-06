/**
 * Global configuration: resolution, layering, palettes, fonts, input map and
 * timings. Pure constants and tiny pure helpers only (no Phaser, no DOM), so
 * every layer, including Node-run unit tests, may import this file.
 *
 * Numbers marked "tunable" are design values; change them here, not inline.
 */

import type { CantoId, UnlockFeature, WordName } from './story/types';

// ---------------------------------------------------------------------------
// Resolution and camera
// ---------------------------------------------------------------------------

/** Canvas size. UI and book scenes render 1:1 at this size (crisp text). */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** The world camera zooms 2x, so the playable world is a 640x360 pixel-art view. */
export const WORLD_ZOOM = 2;
export const WORLD_VIEW_WIDTH = GAME_WIDTH / WORLD_ZOOM; // 640
export const WORLD_VIEW_HEIGHT = GAME_HEIGHT / WORLD_ZOOM; // 360

/** Pixel-art grid (GDD 8.1): 16 px tiles, 32 px characters. World units are world pixels. */
export const TILE_SIZE = 16;
export const SPRITE_SIZE = 32;

/** Page background behind the canvas (index.html uses the same value). */
export const PAGE_BACKGROUND = '#07060a';

// ---------------------------------------------------------------------------
// Depth (z-order). World depths apply inside WorldScene; UI depths inside the
// UI / book scenes. Scene order itself is: World < UI < BookPage < BookMenu.
// ---------------------------------------------------------------------------

export const DEPTH = {
  // WorldScene (zoom 2)
  backdrop: -100,
  parallaxFar: -90,
  parallaxMid: -80,
  ground: 0,
  groundDecor: 5,
  shadows: 8,
  fxBelow: 9,
  /** Actors are y-sorted: depth = DEPTH.actors + y / 10_000. */
  actors: 10,
  actorsFront: 20,
  fx: 30,
  weather: 40,
  fog: 50,
  darkness: 60,
  worldOverlay: 70,
  // UI and book scenes (1280x720)
  hud: 100,
  prompt: 150,
  strip: 200,
  bubble: 300,
  margin: 400,
  card: 500,
  toast: 600,
  page: 700,
  book: 800,
  transition: 900,
  debug: 1000,
} as const;

/** Depth for a y-sorted actor standing at world y. */
export function actorDepth(y: number): number {
  return DEPTH.actors + y / 10_000;
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/** Per-canto world palette (Doré-like: strong darks, a few lights). 0xRRGGBB. */
export interface CantoPalette {
  readonly id: string;
  readonly name: string;
  /** Clear colour behind everything. */
  readonly sky: number;
  /** Distant silhouettes (parallax). */
  readonly far: number;
  /** Mid-ground masses: trees, rocks, walls. */
  readonly mid: number;
  /** Foreground darks. */
  readonly near: number;
  readonly ground: number;
  readonly groundAlt: number;
  readonly path: number;
  readonly water: number;
  /** Fog / haze tint and its default alpha. */
  readonly fog: number;
  readonly fogAlpha: number;
  /** Key light: dawn on the hill, fire in Limbo, lightning in the storm. */
  readonly light: number;
  readonly accent: number;
  readonly accent2: number;
  /** Deepest dark (the Doré black). */
  readonly shadow: number;
  /** Engraving ink and paper used by the engrave / unengrave transition. */
  readonly ink: number;
  readonly paper: number;
}

export const PALETTES = {
  /** Canto I: the Dark Wood. Greens drowned in fog; dawn gold on the hill. */
  inf01: {
    id: 'inf01',
    name: 'The Dark Wood',
    sky: 0x0a0f0c,
    far: 0x16241b,
    mid: 0x1f3324,
    near: 0x0c140e,
    ground: 0x1a2619,
    groundAlt: 0x223322,
    path: 0x3a3a2a,
    water: 0x1c2a2a,
    fog: 0x5f7466,
    fogAlpha: 0.35,
    light: 0xe0b866,
    accent: 0x6f8f5a,
    accent2: 0x9fb28a,
    shadow: 0x050806,
    ink: 0x15130f,
    paper: 0xe6dcc3,
  },
  /** Canto II: the dark hillside at evening. The wood's greens under a violet dusk. */
  inf02: {
    id: 'inf02',
    name: 'The Dark Hillside',
    sky: 0x141019,
    far: 0x2a2333,
    mid: 0x2e3a2c,
    near: 0x0f1210,
    ground: 0x262a22,
    groundAlt: 0x30362a,
    path: 0x4a4436,
    water: 0x232836,
    fog: 0x6b5f78,
    fogAlpha: 0.3,
    light: 0xd9925a,
    accent: 0x8a6fa0,
    accent2: 0xc9b27a,
    shadow: 0x060508,
    ink: 0x15130f,
    paper: 0xe6dcc3,
  },
  /** Canto III: Ante-Inferno. Ash grey, ochre torchlight, the black Acheron. */
  inf03: {
    id: 'inf03',
    name: 'Ante-Inferno',
    sky: 0x0d0c0b,
    far: 0x2b2724,
    mid: 0x3d3731,
    near: 0x141210,
    ground: 0x2a2520,
    groundAlt: 0x332d26,
    path: 0x5a4a32,
    water: 0x161c20,
    fog: 0x7a7064,
    fogAlpha: 0.3,
    light: 0xc79a4a,
    accent: 0xa07a3a,
    accent2: 0x8a8a8a,
    shadow: 0x060505,
    ink: 0x15130f,
    paper: 0xe6dcc3,
  },
  /** Canto IV: Limbo. Pale green meadow, gold fire, the noble castle's stone. */
  inf04: {
    id: 'inf04',
    name: 'Limbo',
    sky: 0x101814,
    far: 0x2c3d33,
    mid: 0x4f6b55,
    near: 0x1a241e,
    ground: 0x5d7a5a,
    groundAlt: 0x6f8f6a,
    path: 0x9a8f6a,
    water: 0x4a6a66,
    fog: 0xa8c4a0,
    fogAlpha: 0.22,
    light: 0xe8cf7a,
    accent: 0xd8b860,
    accent2: 0xb9cdb0,
    shadow: 0x0a0f0c,
    ink: 0x15130f,
    paper: 0xe6dcc3,
  },
  /** Canto V: the Second Circle. Storm purple and blue, lightning white, a crimson accent. */
  inf05: {
    id: 'inf05',
    name: 'The Second Circle',
    sky: 0x0b0916,
    far: 0x1e1a3a,
    mid: 0x2c2856,
    near: 0x0e0c1c,
    ground: 0x221f36,
    groundAlt: 0x2b2846,
    path: 0x3c3760,
    water: 0x18163a,
    fog: 0x5a5aa0,
    fogAlpha: 0.35,
    light: 0xc8c8ff,
    accent: 0x8a2a3a,
    accent2: 0x6a8ad0,
    shadow: 0x05040a,
    ink: 0x15130f,
    paper: 0xe6dcc3,
  },
} as const satisfies Record<string, CantoPalette>;

export type PaletteId = keyof typeof PALETTES;

/** Palette for a canto id; unknown cantos (fixtures, later cantos) fall back to the Dark Wood. */
export function paletteFor(cantoId: CantoId | string | null | undefined): CantoPalette {
  if (cantoId && cantoId in PALETTES) return PALETTES[cantoId as PaletteId];
  return PALETTES.inf01;
}

/** Book and interface colours (parchment, ink, gold). */
export const UI_COLORS = {
  paper: 0xe9dfc6,
  paperShade: 0xd3c4a2,
  paperEdge: 0xb8a57e,
  ink: 0x2b2118,
  inkSoft: 0x5a4a38,
  gold: 0xc9a24a,
  goldBright: 0xe6c66e,
  rubric: 0x8c2a1f,
  /** Narration strip (the book's voice). */
  strip: 0xe2d6b8,
  /** Modern dialogue bubble. */
  bubble: 0x1a1613,
  bubbleText: 0xf1e8d4,
  /** Verse bubble: dark paper with a thin gold rule. */
  verse: 0x221c16,
  verseText: 0xf3e6c4,
  /** Heart scale: pity is a tear (blue), justice a scale pan (bronze); shapes differ too (bible §1.6). */
  pity: 0x6fa3d8,
  justice: 0xc08a3a,
  resolve: 0xe0703a,
  grace: 0xf2e6a6,
  black: 0x000000,
  white: 0xffffff,
  shade: 0x000000,
  shadeAlpha: 0.55,
} as const;

/** High-contrast variant (settings.highContrast). Same keys, stronger separation. */
export const UI_COLORS_HIGH_CONTRAST: { readonly [K in keyof typeof UI_COLORS]: number } = {
  ...UI_COLORS,
  paper: 0xffffff,
  paperShade: 0xf0f0f0,
  paperEdge: 0x000000,
  ink: 0x000000,
  inkSoft: 0x1a1a1a,
  gold: 0xffd23f,
  goldBright: 0xffe680,
  strip: 0xffffff,
  bubble: 0x000000,
  bubbleText: 0xffffff,
  verse: 0x000000,
  verseText: 0xffffff,
  pity: 0x4fb4ff,
  justice: 0xffa000,
  shadeAlpha: 0.75,
};

/** 0xRRGGBB -> '#rrggbb' (Phaser Text styles take CSS colour strings). */
export function cssColor(hex: number): string {
  return `#${(hex & 0xffffff).toString(16).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Fonts (bundled locally by @fontsource; no network)
// ---------------------------------------------------------------------------

export const FONT_FAMILY = {
  /** Book, verse, narration, dialogue: IM Fell English. */
  book: '"IM Fell English", "Iowan Old Style", "Times New Roman", serif',
  /** Interface chrome, HUD, prompts, tabs: Pixelify Sans. */
  ui: '"Pixelify Sans", "Courier New", monospace',
} as const;

/** Font faces Boot must wait for before any Text object is created. */
export const FONT_FACES_TO_LOAD = [
  '400 24px "IM Fell English"',
  'italic 400 24px "IM Fell English"',
  '400 20px "Pixelify Sans"',
  '600 20px "Pixelify Sans"',
] as const;

/** Base sizes in px at 1280x720 (multiplied by settings.fontScale). Body text never below 20 px. */
export const FONT_SIZE = {
  title: 64,
  heading: 36,
  pageText: 28,
  verse: 26,
  body: 24,
  narration: 24,
  option: 24,
  citation: 20,
  ui: 20,
  hud: 20,
} as const;

export const FONT_SCALES = [1, 1.15, 1.3] as const;
export type FontScale = (typeof FONT_SCALES)[number];

// ---------------------------------------------------------------------------
// Input (GDD 2.2 + bible §1.3, §7.0). Keyboard names are Phaser KeyCodes names.
// ---------------------------------------------------------------------------

export type InputAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'dash'
  | 'verse'
  | 'interact'
  | 'advance'
  | 'askVirgil'
  | 'book'
  | 'lookBack'
  | 'back'
  | 'option1'
  | 'option2'
  | 'option3';

export const KEYS: Readonly<Record<InputAction, readonly string[]>> = {
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  /** Shift or Space. */
  dash: ['SHIFT', 'SPACE'],
  /** Cast the equipped verse (also left mouse button in play mode). */
  verse: ['J'],
  /** Talk / use / take a glowing word. */
  interact: ['E'],
  /** Advance text. Space only while player control is locked (in play mode Space dashes). Click also advances. */
  advance: ['E', 'ENTER', 'SPACE'],
  /** Ask Virgil: hint, or the GLOSS of the verse bubble on screen. */
  askVirgil: ['Q'],
  /** Open / close the Book (pause menu). */
  book: ['TAB', 'ESC'],
  /** Hold to look back (bible §7.0 `look_back`; later reused for "close your eyes"). */
  lookBack: ['R'],
  back: ['ESC', 'BACKSPACE'],
  option1: ['ONE'],
  option2: ['TWO'],
  option3: ['THREE'],
};

/** Standard-mapping gamepad button indices. */
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  LS: 10,
  RS: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

/** Gamepad bindings (GDD 2.2). Movement is the left stick or the d-pad. */
export const PAD_BUTTONS: Readonly<Partial<Record<InputAction, readonly number[]>>> = {
  dash: [PAD.A],
  verse: [PAD.X],
  interact: [PAD.Y],
  /** Bible §1.3: pages turn with A; Y also advances. */
  advance: [PAD.A, PAD.Y],
  askVirgil: [PAD.LB],
  book: [PAD.SELECT, PAD.START],
  lookBack: [PAD.RB],
  back: [PAD.B],
  up: [PAD.DPAD_UP],
  down: [PAD.DPAD_DOWN],
  left: [PAD.DPAD_LEFT],
  right: [PAD.DPAD_RIGHT],
};

export const PAD_DEADZONE = 0.25;

// ---------------------------------------------------------------------------
// Timings (ms unless noted). Tunable.
// ---------------------------------------------------------------------------

export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'] as const;
export type TextSpeed = (typeof TEXT_SPEEDS)[number];

export const TIMINGS = {
  /** Typewriter speed for modern balloons, characters per second. */
  textCps: { slow: 30, normal: 55, fast: 110, instant: Number.POSITIVE_INFINITY } as Readonly<
    Record<TextSpeed, number>
  >,
  /** Verse appears line by line (never letter by letter), this far apart. */
  verseLineIntervalMs: 650,
  /** Non-blocking strips (play mode) auto-dismiss after a reading time. */
  readingMsPerChar: 55,
  readingMinMs: 2200,
  readingMaxMs: 9000,
  /** Bible §1.3: the opening page stays at least 3 s on a first reading. */
  pageMinFirstReadingMs: 3000,
  unengraveMs: 2000,
  engraveMs: 1500,
  pageTurnMs: 600,
  fadeMs: 500,
  whiteOutMs: 900,
  camPanMs: 1200,
  camZoomMs: 900,
  camHoldMs: 1500,
  camShakeMs: 600,
  revealCardSlideMs: 350,
  wordFlyMs: 900,
  heartTwitchMs: 600,
  toastMs: 2600,
  barkMs: 2200,
  tutorialMs: 4500,
  /** Runner: an armed cursor trigger the world cannot satisfy fires by itself after this delay. */
  triggerFallbackMs: 1200,
  /** Autoplay defaults (debug / smoke tests). */
  autoplayTextMs: 40,
  autoplayTriggerMs: 80,
  dashMs: 180,
  dashCooldownMs: 450,
  dashInvulnerableMs: 200,
  verseCooldownMs: 700,
  faintFadeMs: 1200,
  respawnMs: 800,
  saveThrottleMs: 1000,
} as const;

/** Reading time for a non-blocking strip of `text`. */
export function readingTimeMs(text: string): number {
  const t = text.length * TIMINGS.readingMsPerChar;
  return Math.max(TIMINGS.readingMinMs, Math.min(TIMINGS.readingMaxMs, t));
}

// ---------------------------------------------------------------------------
// Movement, companion, resources (GDD 2.2–2.5, bible §3). Tunable.
// ---------------------------------------------------------------------------

export const PLAYER = {
  /** World pixels per second. */
  walkSpeed: 72,
  dashSpeed: 230,
  /** Interact reach in world pixels. */
  interactRadius: 22,
} as const;

export const TRUST = { start: 4, min: 0, max: 10, faithful: 7, wayward: 2 } as const;

export const VIRGIL = {
  walkSpeed: 70,
  /** Follow distance at trust 10; every trust point below 10 adds `distancePerMissingTrust`. */
  closestFollow: 24,
  distancePerMissingTrust: 4,
  /** Beyond this Virgil hurries (he never abandons Dante, bible §3.3). */
  leash: 150,
} as const;

/** Virgil walks closer the more Dante trusts him (bible §3.3: trust is shown, never numbered). */
export function virgilFollowDistance(trust: number): number {
  const t = Math.max(TRUST.min, Math.min(TRUST.max, trust));
  return VIRGIL.closestFollow + (TRUST.max - t) * VIRGIL.distancePerMissingTrust;
}

/** Resource bars are 10 units wide; 1 unit = 10 % of a bar (bible §2.10). */
export const RESOURCES = {
  resolveMax: 10,
  resolveStart: 10,
  graceMaxStart: 6,
  graceMaxLimit: 10,
  graceStart: 3,
  /** Fear zones drain Resolve continuously, units per second. */
  fearDrainPerSecond: 0.15,
  /** Carrying the Fear burden word multiplies fear drain (bible §3.4.3). */
  burdenFearMultiplier: 1.25,
  /** Grace cost of one cast tercet (chains cost one per tercet). */
  verseGraceCost: 1,
} as const;

/** The heart scale's beam tilt is clamped to this many points (bible §3.1). */
export const HEART_TILT_CLAMP = 6;

/** Virtue tiers (bible §3.6). */
export const VIRTUE_TIERS = [2, 5, 9] as const;

// ---------------------------------------------------------------------------
// Story structure
// ---------------------------------------------------------------------------

export interface ChapterDef {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly cantos: readonly CantoId[];
}

export const CHAPTERS: readonly ChapterDef[] = [
  {
    id: 'ch1',
    title: 'Chapter One',
    subtitle: 'Inferno, Cantos I–V',
    cantos: ['inf01', 'inf02', 'inf03', 'inf04', 'inf05'],
  },
];

/**
 * Debug-only chapter that plays the engine fixture (tests/fixtures/test-canto.md,
 * canto `inf99`). Available when the library was loaded with fixtures (debug
 * builds): `__dante.newGame({ chapter: 'fixture' })`.
 */
export const FIXTURE_CHAPTER: ChapterDef = {
  id: 'fixture',
  title: 'The Test Wood',
  subtitle: 'Engine fixture',
  cantos: ['inf99'],
};

/** Chapter by id (CHAPTERS, then the fixture chapter); unknown ids fall back to the first chapter. */
export function chapterById(id: string | null | undefined): ChapterDef {
  if (id === FIXTURE_CHAPTER.id) return FIXTURE_CHAPTER;
  const found = CHAPTERS.find((c) => c.id === id);
  const first = CHAPTERS[0];
  if (found) return found;
  if (!first) throw new Error('config.CHAPTERS is empty');
  return first;
}

/**
 * M0 profile (bible §7.5, GDD 10.4): when Canto V is played straight after
 * Canto I, the engine opens the missing locks, grants the missing words and
 * sheds the Fear burden, so every player enters V in the state of the end of IV.
 * Applied as system effects (missing ones only): unlocks, then words, then shed.
 */
export const M0_PROFILE: {
  readonly unlocks: readonly UnlockFeature[];
  readonly words: readonly WordName[];
  readonly shed: readonly WordName[];
} = {
  unlocks: ['words', 'book', 'verse', 'compose', 'heart', 'codex', 'remembrance'],
  words: ['Way', 'Love', 'Away'],
  shed: ['Fear'],
};

// ---------------------------------------------------------------------------
// Persistence and debug
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  save: 'dante.save.v1',
  settings: 'dante.settings.v1',
} as const;

/** `?debug=1` enables window.__dante (also always on in `vite dev`). */
export const DEBUG_QUERY_PARAM = 'debug';

export const GAME_TITLE = 'The Divine Comedy — A Playable Book';
