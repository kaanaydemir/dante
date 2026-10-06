/**
 * Chapter helpers: which chapter a canto belongs to, the play order of a
 * chapter for a profile, and the canto before / after another.
 *
 * Owner: team B (runtime). Pure.
 */

import { CHAPTERS, FIXTURE_CHAPTER, type ChapterDef } from '../config';
import type { GameProfile } from './contracts';
import type { CantoId } from '../story/types';

/** Every chapter the engine knows, the fixture chapter last. */
export function allChapters(): readonly ChapterDef[] {
  return [...CHAPTERS, FIXTURE_CHAPTER];
}

/** The chapter that lists `canto`, or null. */
export function chapterOfCanto(canto: CantoId | null | undefined): ChapterDef | null {
  if (!canto) return null;
  return allChapters().find((c) => c.cantos.includes(canto)) ?? null;
}

/** `inf03.s2.b1` / `inf03.s2` / `inf03` -> `inf03`. */
export function cantoOfTarget(target: string): CantoId {
  const dot = target.indexOf('.');
  return dot < 0 ? target : target.slice(0, dot);
}

/** `inf03.s2.b1` -> `inf03.s2`; scene and canto ids return null. */
export function sceneOfBeat(target: string): string | null {
  const parts = target.split('.');
  return parts.length >= 3 ? `${parts[0]}.${parts[1]}` : null;
}

/**
 * The cantos a chapter plays, in order. Profile `m0` (bible §7.5, GDD 10.4) is
 * the vertical slice: the chapter's first canto straight into its last.
 */
export function playOrder(chapter: ChapterDef, profile: GameProfile = 'full'): CantoId[] {
  const cantos = [...chapter.cantos];
  if (profile !== 'm0' || cantos.length <= 2) return cantos;
  const first = cantos[0] as CantoId;
  const last = cantos[cantos.length - 1] as CantoId;
  return [first, last];
}

export function nextInOrder(order: readonly CantoId[], canto: CantoId): CantoId | null {
  const i = order.indexOf(canto);
  return i >= 0 && i + 1 < order.length ? (order[i + 1] as CantoId) : null;
}

export function previousInOrder(order: readonly CantoId[], canto: CantoId): CantoId | null {
  const i = order.indexOf(canto);
  return i > 0 ? (order[i - 1] as CantoId) : null;
}

/**
 * English titles of the Chapter 1 cantos (bible §7), for the "still being
 * written" page when a script is missing.
 */
export const KNOWN_CANTO_TITLES: Readonly<Record<CantoId, string>> = {
  inf01: 'The Dark Wood',
  inf02: 'The Evening of Doubt',
  inf03: 'The Gate',
  inf04: 'Limbo',
  inf05: 'The Infernal Hurricane',
};

/**
 * Cantos whose spine ends in a faint (bible §1.3.7: III and V). Used for the
 * waking epigraph when the previous canto's script is not available to ask.
 */
export const KNOWN_FAINT_CANTOS: readonly CantoId[] = ['inf03', 'inf05'];
