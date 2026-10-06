/**
 * What a `CAM: <verb> — <Turkish description>` line means for the world
 * camera. The description is designer prose, so only a few robust keywords
 * are read (who to look at, whether the camera returns to Dante).
 *
 * Owner: team D (world). Pure: no Phaser.
 */

import type { CamVerb, SpeakerId } from '../story/types';

export type CamTarget =
  | { readonly kind: 'player' }
  | { readonly kind: 'ahead' }
  | { readonly kind: 'speaker'; readonly speaker: SpeakerId };

export type CamIntent =
  /** The presenter's verb (fade-in, fade-out, white-out, page-turn): nothing to do in the world. */
  | { readonly kind: 'none' }
  /** `cut`: snap to the player at once. */
  | { readonly kind: 'snap' }
  | { readonly kind: 'pan'; readonly target: CamTarget }
  | { readonly kind: 'zoom'; readonly direction: 'in' | 'out' }
  | { readonly kind: 'shake' }
  | { readonly kind: 'hold' }
  | { readonly kind: 'follow'; readonly target: CamTarget }
  | { readonly kind: 'engrave'; readonly on: boolean };

/** Lower-case words (Turkish and English) that name an on-stage speaker. */
const SPEAKER_WORDS: ReadonlyArray<readonly [RegExp, SpeakerId]> = [
  [/\b(vergilius|virgil|rehber)/u, 'VIRGIL'],
  [/\b(kharon|charon|kayıkçı)/u, 'CHARON'],
  [/\bminos/u, 'MINOS'],
  [/\bfrancesca/u, 'FRANCESCA'],
  [/\bpaolo/u, 'PAOLO'],
  // Short Turkish stems need care: `kurtarır` (rescues) is not a wolf; `kurdun` (the wolf's) is.
  [/\b(pars(?![a-zçğöşü])|panther)/u, 'PANTHER'],
  [/\b(aslan|lion)/u, 'LION'],
  [/\b(dişi kurt|she-wolf|wolf|kurt(?![a-zçğıöşü])|kurd(?=[aeuıiöü]))/u, 'SHE_WOLF'],
  [/\b(homeros|homer)/u, 'HOMER'],
];

/** "The camera returns to Dante": Turkish `geri döner`, `Dante'ye döner`, English `back`. */
const RETURN_WORDS = /(geri\s+(döner|gelir|kayar)|dante'ye|dante’ye|returns?\b|\bback\b)/u;

/** The speaker a CAM description names first, if any. */
export function speakerInText(text: string): SpeakerId | null {
  const t = text.toLocaleLowerCase('tr');
  let best: { at: number; id: SpeakerId } | null = null;
  for (const [re, id] of SPEAKER_WORDS) {
    const m = re.exec(t);
    if (m && (best === null || m.index < best.at)) best = { at: m.index, id };
  }
  return best?.id ?? null;
}

/** The world camera's reading of a CAM line. */
export function camIntent(verb: CamVerb, text: string): CamIntent {
  const lower = text.toLocaleLowerCase('tr');
  switch (verb) {
    case 'cut':
      return { kind: 'snap' };
    case 'pan': {
      if (RETURN_WORDS.test(lower)) return { kind: 'pan', target: { kind: 'player' } };
      const speaker = speakerInText(text);
      if (speaker) return { kind: 'pan', target: { kind: 'speaker', speaker } };
      return { kind: 'pan', target: { kind: 'ahead' } };
    }
    case 'zoom-in':
      return { kind: 'zoom', direction: 'in' };
    case 'zoom-out':
      return { kind: 'zoom', direction: 'out' };
    case 'shake':
      return { kind: 'shake' };
    case 'hold':
      return { kind: 'hold' };
    case 'follow': {
      const speaker = speakerInText(text);
      return { kind: 'follow', target: speaker ? { kind: 'speaker', speaker } : { kind: 'player' } };
    }
    case 'engrave':
      return { kind: 'engrave', on: true };
    case 'unengrave':
      return { kind: 'engrave', on: false };
    case 'fade-in':
    case 'fade-out':
    case 'white-out':
    case 'page-turn':
      return { kind: 'none' };
  }
  return { kind: 'none' };
}

/** World zoom levels for the zoom verbs (the base is WORLD_ZOOM). */
export function zoomFor(direction: 'in' | 'out', current: number, base: number): number {
  if (direction === 'in') return current < base ? base : base * 1.5;
  return current > base ? base : base * 0.75;
}
