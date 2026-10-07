/**
 * The generic level planner: turns a canto script into a playable map layout
 * when no hand-made LevelModule exists (docs/ENGINE.md §8.2).
 *
 * - Places: every `@place` and `enter:` id in order of first appearance, laid
 *   out left to right along a path, each themed by the words in its id
 *   (`inf03_shore` -> shore, `inf01_slope_lower` -> slope).
 * - NPCs: a talkable NPC for every `talk:` speaker in its beat's place (or the
 *   place the player stands in by then, else the next one); silent set
 *   dressing for the front matter's characters where the text first shows
 *   them (crowds for SOUL / NEUTRAL / SHADE).
 * - Virgil: on stage from the scene in which he first appears (Canto I keeps
 *   Dante alone until the shade comes).
 * - Scene homes: where to put the player when play starts mid-canto.
 * - Decoration: seeded, themed props that never block the path or a place.
 *
 * Owner: team D (world). Pure: no Phaser, so it is unit-tested.
 */

import { TILE_SIZE } from '../../config';
import type { PlaceDef, Rect } from '../../runtime/contracts';
import { walkStatements } from '../../story/ast';
import {
  SPEAKERS,
  type Beat,
  type BeatId,
  type CantoId,
  type CantoScript,
  type PlaceId,
  type SceneId,
  type SpeakerId,
  type Statement,
} from '../../story/types';
import {
  distToPolyline,
  hashString,
  inflate,
  rectCenter,
  rectsOverlap,
  seededRandom,
  type Vec,
} from '../../world/geometry';

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export const PLACE_THEMES = [
  'forest',
  'forest_edge',
  'clearing',
  'valley',
  'slope',
  'road',
  'gate',
  'plain',
  'shore',
  'island',
  'meadow',
  'castle',
  'storm',
  'rest',
  'court',
  'brink',
  'ford',
] as const;
export type PlaceTheme = (typeof PLACE_THEMES)[number];

/** Keyword -> theme, tried in order on the words of a place id (`inf01_slope_lower` -> `slope`). */
const THEME_KEYWORDS: ReadonlyArray<readonly [RegExp, PlaceTheme]> = [
  [/^(treeline|outskirts)$/, 'forest_edge'],
  [/^(wood|woods|forest|grove|thicket|trees|ghosts)$/, 'forest'],
  [/^(glade|clearing)$/, 'clearing'],
  [/^(gate|door|portal|threshold|arch|inscription)$/, 'gate'],
  [/^(rivulet|brook|rill|ford|moat|streamlet)$/, 'ford'],
  [/^(shore|bank|acheron|river|stream|water|beach|strand|landing)$/, 'shore'],
  [/^(island|isle)$/, 'island'],
  [/^(castle|wall|walls|keep|tower|towers|fortress|citadel)$/, 'castle'],
  [/^(meadow|green|lawn|field|fields)$/, 'meadow'],
  [/^(storm|hurricane|wind|winds|ledge|gale|flock|whirl)$/, 'storm'],
  [/^(brink|abyss|cliff|precipice|chasm|pit|descent|rim)$/, 'brink'],
  [/^(court|judge|tribunal|minos|throne)$/, 'court'],
  [/^(slope|hill|hillside|ascent|ridge|summit|climb|switchback|rise|upper|lower|overlook|gorge)$/, 'slope'],
  [/^(valley|lowland|shade|shadow|silence|hollow|dark|vale)$/, 'valley'],
  [/^(bench|rest|seat|stone|rock|virgil)$/, 'rest'],
  [/^(road|path|way|track|trail|dusk)$/, 'road'],
  [/^(plain|air|banner|neutrals|marsh)$/, 'plain'],
];

/** Default look per canto when an id says nothing (later cantos fall back to the plain). */
const CANTO_DEFAULT_THEME: Readonly<Record<string, PlaceTheme>> = {
  inf01: 'forest',
  inf02: 'slope',
  inf03: 'plain',
  inf04: 'meadow',
  inf05: 'storm',
  inf99: 'forest',
};

/**
 * The theme of a place id; words are read from the end (the most specific word
 * is usually last). `edge` alone says nothing (`inf03_plain_edge` is plain,
 * `inf05_lee_edge` storm); next to a wood it is the wood's edge.
 */
export function themeForPlace(id: PlaceId, cantoId: string): PlaceTheme {
  const words = id
    .toLowerCase()
    .split('_')
    .slice(1)
    .filter((w) => w.length > 0);
  const edge = words.includes('edge');
  for (const word of [...words].reverse()) {
    if (word === 'edge') continue;
    for (const [re, theme] of THEME_KEYWORDS) {
      if (re.test(word)) return edge && theme === 'forest' ? 'forest_edge' : theme;
    }
  }
  return CANTO_DEFAULT_THEME[cantoId] ?? 'plain';
}

// ---------------------------------------------------------------------------
// Layout constants (world px)
// ---------------------------------------------------------------------------

export const GENERIC = {
  placeW: 12 * TILE_SIZE,
  placeH: 8 * TILE_SIZE,
  gap: 7 * TILE_SIZE,
  marginStart: 10 * TILE_SIZE,
  marginEnd: 10 * TILE_SIZE,
  height: 26 * TILE_SIZE,
  /** Vertical centre of the path; places zig-zag around it. */
  midY: 13 * TILE_SIZE,
  zigzag: 2 * TILE_SIZE,
  /** Half-width of the walkable corridor kept clear along the path. */
  corridor: 30,
} as const;

// ---------------------------------------------------------------------------
// Script reading
// ---------------------------------------------------------------------------

/** Speakers that are never bodies in the world (narrative-only or abstract voices). */
const NOT_ON_STAGE: ReadonlySet<SpeakerId> = new Set([
  'DANTE',
  'VIRGIL',
  'POET',
  'INSCRIPTION',
  'VOICE',
  'BEATRICE',
  'LUCIA',
  'VIRGIN',
  'RACHEL',
]);

/** Characters a canto only shows as visions (engravings in the sky, pages), never as bodies on the ground. */
const VISIONS: Readonly<Record<CantoId, readonly SpeakerId[]>> = {
  inf02: ['AENEAS'],
};

/** Speakers drawn as a small crowd of shades rather than one figure. */
export const CROWD_SPEAKERS: ReadonlySet<SpeakerId> = new Set(['SOUL', 'NEUTRAL', 'SHADE']);

/** Where a crowd prefers to stand, when its scene offers such a place. */
const CROWD_THEMES: Readonly<Record<SpeakerId, readonly PlaceTheme[]>> = {
  SOUL: ['shore', 'court'],
  NEUTRAL: ['plain'],
  SHADE: [],
};

export const CROWD_SIZE = 5;

/** Place ids a statement list mentions through `@place` directives (any depth). */
function directivePlaces(lines: readonly Statement[]): PlaceId[] {
  const out: PlaceId[] = [];
  walkStatements(lines, (stmt) => {
    if (stmt.type === 'directive' && stmt.key === 'place') {
      const v = stmt.value.trim();
      if (v) out.push(v);
    }
  });
  return out;
}

/** Places a beat refers to, in reading order: its trigger's place, its `@place`, then mid-beat `@place` lines. */
export function placesOfBeat(beat: Beat): PlaceId[] {
  const out: PlaceId[] = [];
  if (beat.trigger.kind === 'enter') out.push(beat.trigger.place);
  if (beat.place) out.push(beat.place);
  out.push(...directivePlaces(beat.lines));
  return out.filter((p, i) => p && out.indexOf(p) === i);
}

/** Does a beat involve this speaker (lines, quotes, barks, or a talk trigger)? */
export function beatInvolves(beat: Beat, speaker: SpeakerId): boolean {
  if (beat.trigger.kind === 'talk' && beat.trigger.speaker === speaker) return true;
  let found = false;
  walkStatements(beat.lines, (stmt) => {
    if (found) return;
    if ((stmt.type === 'say' || stmt.type === 'bark') && stmt.speaker === speaker) found = true;
    else if (stmt.type === 'quote' && stmt.voice === speaker) found = true;
  });
  return found;
}

/** Plain-text words of a beat (titles, narration, pages, quotes) for name mentions. */
function beatText(beat: Beat): string {
  const parts: string[] = [beat.title];
  walkStatements(beat.lines, (stmt) => {
    if (stmt.type === 'narration' || stmt.type === 'page') parts.push(stmt.text);
    else if (stmt.type === 'quote') for (const l of stmt.lines) if (l.kind === 'verse') parts.push(l.text);
  });
  return parts.join(' ');
}

/** The display name used to find a silent character in the text (`The She-wolf` -> `she-wolf`). */
function mentionName(speaker: SpeakerId): string {
  const name = SPEAKERS[speaker]?.name ?? speaker;
  return name.replace(/^(The|A)\s+/i, '').toLowerCase();
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export interface PlannedNpc {
  readonly speaker: SpeakerId;
  readonly place: PlaceId | null;
  readonly x: number;
  readonly y: number;
  readonly talkable: boolean;
  readonly facing: 'left' | 'right';
  /** Extra members of a crowd (the first member answers `npc(speaker)`). */
  readonly crowd: boolean;
}

export interface GenericLayout {
  readonly cantoId: string;
  readonly width: number;
  readonly height: number;
  /** In order of first appearance. */
  readonly places: readonly PlaceDef[];
  readonly themes: Readonly<Record<PlaceId, PlaceTheme>>;
  readonly start: Vec;
  /** The walkable spine: start, every place centre, end. */
  readonly path: readonly Vec[];
  readonly npcs: readonly PlannedNpc[];
  /** Virgil walks with Dante from this beat on (null: from the start). `hidden` if he never appears. */
  readonly virgilFrom: BeatId | null;
  readonly virgilNever: boolean;
  /** Where play starts when a scene starts without its own @place (continue / jump). */
  readonly sceneHome: Readonly<Record<SceneId, PlaceId | null>>;
  /** The place the player is expected to stand in at each beat (last one referenced up to it). */
  readonly beatPlace: Readonly<Record<BeatId, PlaceId | null>>;
  /** Every beat id in file order. */
  readonly beatOrder: readonly BeatId[];
  /** The canto's front-matter mechanics (the generic level dresses itself with the ambient ones). */
  readonly mechanics: readonly string[];
}

/** Virgil shows up this late only when the script keeps him away for a while (Canto I). */
const VIRGIL_LATE_SCENE = 3;

export function planGenericLevel(script: CantoScript): GenericLayout {
  const cantoId = script.id;
  const scenes = script.scenes;

  // 1. Places in order of first appearance; per-beat and per-scene bookkeeping.
  const order: PlaceId[] = [];
  const beatOrder: BeatId[] = [];
  const beatPlace: Record<BeatId, PlaceId | null> = {};
  const sceneFirst: Record<SceneId, PlaceId | null> = {};
  const sceneEntry: Record<SceneId, PlaceId | null> = {};
  const scenePlaces: Record<SceneId, PlaceId[]> = {};
  let current: PlaceId | null = null;
  for (const scene of scenes) {
    sceneEntry[scene.id] = current;
    sceneFirst[scene.id] = null;
    scenePlaces[scene.id] = [];
    for (const beat of scene.beats) {
      beatOrder.push(beat.id);
      for (const p of placesOfBeat(beat)) {
        if (!order.includes(p)) order.push(p);
        if (sceneFirst[scene.id] === null) sceneFirst[scene.id] = p;
        if (!(scenePlaces[scene.id] as PlaceId[]).includes(p)) (scenePlaces[scene.id] as PlaceId[]).push(p);
        current = p;
      }
      beatPlace[beat.id] = current;
    }
  }
  const sceneHome: Record<SceneId, PlaceId | null> = {};
  for (const scene of scenes) sceneHome[scene.id] = sceneFirst[scene.id] ?? sceneEntry[scene.id] ?? null;

  // 2. Geometry: places left to right, zig-zagging around the mid line.
  const n = order.length;
  const width =
    n === 0
      ? 48 * TILE_SIZE
      : GENERIC.marginStart + n * GENERIC.placeW + Math.max(0, n - 1) * GENERIC.gap + GENERIC.marginEnd;
  const height = GENERIC.height;
  const themes: Record<PlaceId, PlaceTheme> = {};
  const places: PlaceDef[] = order.map((id, i) => {
    const x = GENERIC.marginStart + i * (GENERIC.placeW + GENERIC.gap);
    const zig = i % 2 === 0 ? -GENERIC.zigzag : GENERIC.zigzag;
    const y = GENERIC.midY + (n > 1 ? zig : 0) - GENERIC.placeH / 2;
    themes[id] = themeForPlace(id, cantoId);
    return {
      id,
      x,
      y,
      w: GENERIC.placeW,
      h: GENERIC.placeH,
      spawn: { x: x + 3 * TILE_SIZE, y: y + GENERIC.placeH / 2 + 8 },
      label: id,
    };
  });
  const start: Vec = { x: 4 * TILE_SIZE, y: GENERIC.midY + 8 };
  const path: Vec[] = [start, ...places.map((p) => rectCenter(p)), { x: width - 4 * TILE_SIZE, y: GENERIC.midY + 8 }];

  // 3. NPCs.
  const placeById = new Map(places.map((p) => [p.id, p]));
  const slotsUsed = new Map<string, number>();
  const npcs: PlannedNpc[] = [];
  const placed = new Set<SpeakerId>();
  const nextPlaceAfter = (beatId: BeatId): PlaceId | null => {
    const at = beatOrder.indexOf(beatId);
    for (let i = at + 1; i < beatOrder.length; i++) {
      const p = beatPlace[beatOrder[i] as BeatId];
      if (p && p !== beatPlace[beatId]) return p;
    }
    return null;
  };
  const slot = (place: PlaceId | null): Vec => {
    const key = place ?? '';
    const k = slotsUsed.get(key) ?? 0;
    slotsUsed.set(key, k + 1);
    const rect: Rect = (place ? placeById.get(place) : undefined) ?? {
      x: start.x + 6 * TILE_SIZE,
      y: GENERIC.midY - GENERIC.placeH / 2,
      w: GENERIC.placeW,
      h: GENERIC.placeH,
    };
    // A 4 x 3 grid in the right two thirds of the place, filled column by column from the far side.
    const col = 3 - (Math.floor(k / 3) % 4);
    const row = [1, 0, 2][k % 3] as number;
    return {
      x: Math.round(rect.x + rect.w * 0.36 + col * (rect.w * 0.17)),
      y: Math.round(rect.y + rect.h * 0.3 + row * (rect.h * 0.24)),
    };
  };
  const addNpc = (speaker: SpeakerId, place: PlaceId | null, talkable: boolean): void => {
    const crowdSize = CROWD_SPEAKERS.has(speaker) ? CROWD_SIZE : 1;
    for (let i = 0; i < crowdSize; i++) {
      const p = slot(place);
      npcs.push({ speaker, place, x: p.x, y: p.y, talkable: talkable && i === 0, facing: 'left', crowd: i > 0 });
    }
    placed.add(speaker);
  };

  // 3a. Talk speakers (Virgil is the companion, Dante is the player).
  for (const scene of scenes) {
    for (const beat of scene.beats) {
      const t = beat.trigger;
      if (t.kind !== 'talk' || t.speaker === 'DANTE' || t.speaker === 'VIRGIL' || placed.has(t.speaker)) continue;
      const place = beat.place ?? beatPlace[beat.id] ?? nextPlaceAfter(beat.id) ?? order[0] ?? null;
      addNpc(t.speaker, place, true);
    }
  }

  // 3b. Silent set dressing for the characters on stage, where the text first shows them.
  const visions = new Set(VISIONS[cantoId] ?? []);
  const cast = script.front.characters.filter((c) => !NOT_ON_STAGE.has(c) && !placed.has(c) && !visions.has(c));
  for (const speaker of cast) {
    if (speaker === 'PAOLO' && cast.includes('FRANCESCA')) continue; // placed beside Francesca below
    const name = mentionName(speaker);
    let home: PlaceId | null = null;
    let homeScene: SceneId | null = null;
    // Prefer the first beat that has them speak; else the first that names them; else a scene titled for them.
    let involvedAt: Beat | null = null;
    let mentionedAt: Beat | null = null;
    let titledScene: SceneId | null = null;
    for (const scene of scenes) {
      if (scene.number === 0) continue;
      if (titledScene === null && scene.title.toLowerCase().includes(name)) titledScene = scene.id;
      for (const beat of scene.beats) {
        if (!involvedAt && beatInvolves(beat, speaker)) involvedAt = beat;
        if (!mentionedAt && beatText(beat).toLowerCase().includes(name)) mentionedAt = beat;
      }
    }
    const crowd = CROWD_SPEAKERS.has(speaker);
    const firstBeat = crowd ? (involvedAt ?? mentionedAt) : (mentionedAt ?? involvedAt);
    if (firstBeat) {
      home = beatPlace[firstBeat.id] ?? sceneHome[firstBeat.sceneId] ?? null;
      homeScene = firstBeat.sceneId;
    } else if (titledScene) {
      home = sceneHome[titledScene] ?? null;
      homeScene = titledScene;
    } else {
      continue;
    }
    // A crowd stands where its kind belongs when the scene (or the next one) has such a place.
    const prefer = CROWD_THEMES[speaker] ?? [];
    if (crowd && prefer.length > 0 && homeScene) {
      const si = scenes.findIndex((s) => s.id === homeScene);
      const candidates = [...(scenePlaces[homeScene] ?? []), ...(scenePlaces[scenes[si + 1]?.id ?? ''] ?? [])];
      const better = candidates.find((p) => prefer.includes(themes[p] ?? 'plain'));
      if (better) home = better;
    }
    addNpc(speaker, home, false);
  }
  const francesca = npcs.find((m) => m.speaker === 'FRANCESCA' && !m.crowd);
  if (francesca && script.front.characters.includes('PAOLO') && !placed.has('PAOLO')) {
    npcs.push({ ...francesca, speaker: 'PAOLO', x: francesca.x + 14, y: francesca.y + 2, talkable: false, crowd: false });
    placed.add('PAOLO');
  }

  // 4. Virgil: from the first beat of the scene in which he first appears.
  let virgilFrom: BeatId | null = null;
  let virgilScene = -1;
  for (const scene of scenes) {
    if (scene.number === 0) continue;
    if (scene.beats.some((b) => beatInvolves(b, 'VIRGIL'))) {
      virgilFrom = scene.beats[0]?.id ?? null;
      virgilScene = scene.number;
      break;
    }
  }
  const virgilNever = virgilFrom === null && !script.front.characters.includes('VIRGIL');
  if (virgilScene >= 0 && virgilScene < VIRGIL_LATE_SCENE) virgilFrom = null;

  return {
    cantoId,
    width,
    height,
    places,
    themes,
    start,
    path,
    npcs,
    virgilFrom,
    virgilNever,
    sceneHome,
    beatPlace,
    beatOrder,
    mechanics: [...script.front.mechanics],
  };
}

/** Is Virgil on stage at this beat? (Beats not in the canto count as "yes".) */
export function virgilOnStage(layout: GenericLayout, beat: BeatId | null): boolean {
  if (layout.virgilNever) return false;
  if (layout.virgilFrom === null || beat === null) return layout.virgilFrom === null;
  const at = layout.beatOrder.indexOf(beat);
  const from = layout.beatOrder.indexOf(layout.virgilFrom);
  return at < 0 || from < 0 || at >= from;
}

// ---------------------------------------------------------------------------
// Decoration
// ---------------------------------------------------------------------------

export type DecorKind =
  | 'tree'
  | 'tree_dead'
  | 'bush'
  | 'rock'
  | 'rock_big'
  | 'storm_rock'
  | 'shelter_rock'
  | 'grass'
  | 'flower'
  | 'reed'
  | 'pillar'
  | 'gate'
  | 'castle'
  | 'bench'
  | 'boat'
  | 'banner'
  | 'ghost_tree'
  | 'stone';

export interface DecorItem {
  readonly kind: DecorKind;
  /** Base point (bottom centre) in world px. */
  readonly x: number;
  readonly y: number;
  /** Collision footprint, or null for walk-through decoration. */
  readonly solid: Rect | null;
  readonly flip: boolean;
}

/** Water areas (impassable) and their place. */
export interface WaterArea {
  readonly rect: Rect;
  readonly place: PlaceId | null;
}

export interface DecorPlan {
  readonly items: readonly DecorItem[];
  readonly water: readonly WaterArea[];
  /** Shallow water that holds whoever walks on it (Limbo's rivulet, IV 109): drawn as water, never solid. */
  readonly fords: readonly WaterArea[];
  /** Impassable border strips (cliff edges, walls) in addition to item footprints. */
  readonly walls: readonly Rect[];
}

/** Footprint (solid) of a decor item standing at (x, y), or null. */
export function decorFootprint(kind: DecorKind, x: number, y: number): Rect | null {
  switch (kind) {
    case 'tree':
    case 'tree_dead':
    case 'ghost_tree':
      return { x: x - 5, y: y - 6, w: 10, h: 6 };
    case 'rock':
      return { x: x - 6, y: y - 6, w: 12, h: 6 };
    case 'rock_big':
    case 'storm_rock':
      return { x: x - 12, y: y - 10, w: 24, h: 10 };
    case 'shelter_rock':
      return { x: x - 20, y: y - 12, w: 40, h: 12 };
    case 'pillar':
      return { x: x - 6, y: y - 6, w: 12, h: 6 };
    case 'castle':
      return { x: x - 32, y: y - 14, w: 64, h: 14 };
    case 'stone':
      return { x: x - 8, y: y - 8, w: 16, h: 8 };
    case 'boat':
    case 'bench':
    case 'gate':
    case 'bush':
    case 'grass':
    case 'flower':
    case 'reed':
    case 'banner':
      return null;
  }
  return null;
}

/** Decor kinds sprinkled around places of a theme: [kind, weight]. */
const THEME_DECOR: Readonly<Record<PlaceTheme, ReadonlyArray<readonly [DecorKind, number]>>> = {
  forest: [['tree', 8], ['bush', 2], ['rock', 1]],
  forest_edge: [['tree', 4], ['bush', 3], ['grass', 2], ['rock', 1]],
  clearing: [['tree', 5], ['grass', 3], ['flower', 1]],
  valley: [['rock', 3], ['tree_dead', 2], ['bush', 2], ['grass', 1]],
  slope: [['rock', 4], ['rock_big', 2], ['bush', 2], ['grass', 2]],
  road: [['rock', 2], ['bush', 2], ['grass', 3], ['tree', 1]],
  gate: [['rock_big', 3], ['rock', 3], ['tree_dead', 1]],
  plain: [['rock', 3], ['grass', 3], ['tree_dead', 1]],
  shore: [['reed', 4], ['rock', 3], ['grass', 1]],
  island: [['reed', 3], ['rock', 2], ['grass', 2]],
  meadow: [['grass', 5], ['flower', 4], ['ghost_tree', 2]],
  castle: [['grass', 4], ['flower', 2], ['pillar', 1]],
  storm: [['storm_rock', 4], ['rock', 3]],
  rest: [['grass', 3], ['rock', 2], ['bush', 1]],
  court: [['pillar', 3], ['rock', 2]],
  brink: [['rock', 4], ['rock_big', 2]],
  ford: [['reed', 3], ['grass', 3], ['flower', 1]],
};

function pickWeighted(rnd: () => number, table: ReadonlyArray<readonly [DecorKind, number]>): DecorKind {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [kind, w] of table) {
    r -= w;
    if (r <= 0) return kind;
  }
  return (table[0] as readonly [DecorKind, number])[0];
}

/** The theme governing a column of the map: the nearest place by x. */
export function themeAtX(layout: GenericLayout, x: number): PlaceTheme {
  let best: { d: number; theme: PlaceTheme } | null = null;
  for (const p of layout.places) {
    const cx = p.x + p.w / 2;
    const d = Math.abs(cx - x);
    if (!best || d < best.d) best = { d, theme: layout.themes[p.id] ?? 'plain' };
  }
  return best?.theme ?? CANTO_DEFAULT_THEME[layout.cantoId] ?? 'plain';
}

/**
 * Seeded decoration for a generic level: themed props in the bands above and
 * below the path, landmark props per place (gate, bench, castle, stone), water
 * strips for shores, a shallow ford across the map for streams. Nothing solid
 * ever touches the path corridor or a place.
 */
export function planDecor(layout: GenericLayout, seed = hashString(layout.cantoId)): DecorPlan {
  const rnd = seededRandom(seed);
  const items: DecorItem[] = [];
  const water: WaterArea[] = [];
  const fords: WaterArea[] = [];
  const walls: Rect[] = [];
  const keepClear = layout.places.map((p) => inflate(p, 6));
  const inscribed = layout.mechanics.includes('inscription');

  const blocked = (r: Rect | null, x: number, y: number): boolean => {
    if (distToPolyline(x, y, layout.path) < GENERIC.corridor + 10) return true;
    if (r) {
      if (distToPolyline(r.x + r.w / 2, r.y + r.h / 2, layout.path) < GENERIC.corridor + r.w / 2) return true;
      for (const k of keepClear) if (rectsOverlap(k, r)) return true;
      for (const w of water) if (rectsOverlap(w.rect, r)) return true;
      for (const f of fords) if (rectsOverlap(f.rect, r)) return true;
    } else {
      for (const k of keepClear) if (k.x <= x && x < k.x + k.w && k.y <= y && y < k.y + k.h) return true;
    }
    if (y < 20 || y > layout.height - 4 || x < 8 || x > layout.width - 8) return true;
    return false;
  };

  // Landmarks per place.
  for (const place of layout.places) {
    const theme = layout.themes[place.id] ?? 'plain';
    const c = rectCenter(place);
    switch (theme) {
      case 'gate':
        if (inscribed) {
          // The gate faces the reader from the back of the place (its arch is a backdrop; the path runs before it).
          items.push({ kind: 'gate', x: c.x + 8, y: place.y + 18, solid: null, flip: false });
        } else {
          // Elsewhere a gate is a pair of pillars either side of the way.
          items.push({ kind: 'pillar', x: c.x - 34, y: place.y + 26, solid: decorFootprint('pillar', c.x - 34, place.y + 26), flip: false });
          items.push({ kind: 'pillar', x: c.x + 34, y: place.y + 26, solid: decorFootprint('pillar', c.x + 34, place.y + 26), flip: true });
        }
        break;
      case 'rest':
        items.push({ kind: 'bench', x: c.x - 24, y: place.y + 22, solid: null, flip: false });
        break;
      case 'castle':
        items.push({ kind: 'castle', x: c.x, y: place.y - 4, solid: decorFootprint('castle', c.x, place.y - 4), flip: false });
        break;
      case 'shore':
      case 'island': {
        const top = place.y + place.h + 4;
        const rect: Rect = { x: place.x - 24, y: top, w: place.w + 48, h: layout.height - top };
        water.push({ rect, place: place.id });
        // Charon's boat waits on the water below the shore (III 82).
        if (theme === 'shore' && layout.npcs.some((n) => n.speaker === 'CHARON' && n.place === place.id)) {
          items.push({ kind: 'boat', x: c.x + 36, y: Math.min(layout.height - 8, top + 30), solid: null, flip: false });
        }
        if (theme === 'island') {
          const above: Rect = { x: place.x - 24, y: 0, w: place.w + 48, h: Math.max(0, place.y - 4) };
          water.push({ rect: above, place: place.id });
        }
        break;
      }
      case 'ford':
        // A band of shallow water across the whole map; the way crosses it.
        fords.push({ rect: { x: Math.round(c.x - 20), y: 0, w: 40, h: layout.height }, place: place.id });
        break;
      case 'plain':
        if (layout.cantoId === 'inf03') items.push({ kind: 'banner', x: c.x + 40, y: place.y + 18, solid: null, flip: false });
        break;
      default:
        break;
    }
    // A stone that blocks nothing but stands for the one in the script (II s6: the fallen stone).
    if (/(^|_)stone($|_)/.test(place.id.slice(place.id.indexOf('_') + 1))) {
      const sx = c.x + 30;
      const sy = place.y + 30;
      items.push({ kind: 'stone', x: sx, y: sy, solid: decorFootprint('stone', sx, sy), flip: false });
    }
  }

  // Scatter along the whole map, in two bands (above and below the path).
  const count = Math.round(layout.width / 11);
  for (let i = 0; i < count; i++) {
    const x = Math.round(8 + rnd() * (layout.width - 16));
    const theme = themeAtX(layout, x);
    const kind = pickWeighted(rnd, THEME_DECOR[theme]);
    const y = Math.round(24 + rnd() * (layout.height - 28));
    const solid = decorFootprint(kind, x, y);
    if (blocked(solid, x, y)) continue;
    items.push({ kind, x, y, solid, flip: rnd() < 0.5 });
  }

  // Dense tree walls at the top and bottom edges for wooded themes; rock rims elsewhere.
  for (let x = 8; x < layout.width; x += 14 + Math.floor(rnd() * 10)) {
    const theme = themeAtX(layout, x);
    const wooded = theme === 'forest' || theme === 'forest_edge' || theme === 'clearing' || theme === 'road';
    const kindTop: DecorKind = wooded ? 'tree' : theme === 'storm' ? 'storm_rock' : theme === 'meadow' || theme === 'ford' ? 'ghost_tree' : 'rock_big';
    for (const y of [22 + Math.floor(rnd() * 8), layout.height - 2 - Math.floor(rnd() * 6)]) {
      const solid = decorFootprint(kindTop, x, y);
      if (blocked(solid, x, y)) continue;
      items.push({ kind: kindTop, x, y, solid, flip: rnd() < 0.5 });
    }
  }

  items.sort((a, b) => a.y - b.y);
  return { items, water, fords, walls };
}

/** Every impassable rectangle of a decor plan (fords are never solid). */
export function decorSolids(plan: DecorPlan): Rect[] {
  const out: Rect[] = [];
  for (const it of plan.items) if (it.solid) out.push(it.solid);
  for (const w of plan.water) out.push(w.rect);
  out.push(...plan.walls);
  return out;
}
