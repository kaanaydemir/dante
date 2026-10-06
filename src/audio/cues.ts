/**
 * Pure audio mapping: Turkish `SFX:` prose -> sounds, `@music:` / `@ambience:`
 * prose + canto -> a drone and an ambience bed, speaker -> blip voice.
 * ENGINE §7.5. No WebAudio here, so it is unit-tested in Node.
 */

import type { SfxName } from '../runtime/contracts';
import type { CantoId, SpeakerId } from '../story/types';

/** Every sound the synth can make: the contract's SfxName plus a few textures for SFX prose. */
export type SoundId =
  | SfxName
  | 'bird'
  | 'breath'
  | 'leaves'
  | 'water'
  | 'oar'
  | 'crowd'
  | 'sigh'
  | 'bees'
  | 'fire'
  | 'cry'
  | 'heart'
  | 'stone'
  | 'wings'
  | 'gate';

/** A Turkish word stem that must start a word (`yarı` does not contain the bee `arı`). */
function stem(s: string, notFollowedBy = ''): RegExp {
  const tail = notFollowedBy ? `(?![${notFollowedBy}])` : '';
  return new RegExp(`(?<![a-zçğıöşüâîû])${s}${tail}`, 'u');
}

/** Turkish keyword stems -> sound. */
const SFX_KEYWORDS: readonly (readonly [RegExp, SoundId])[] = [
  [stem('deprem'), 'quake'],
  [stem('sarsıl'), 'quake'],
  [stem('sarsıntı'), 'quake'],
  [stem('gök ?gürültü'), 'thunder'],
  [stem('gürle'), 'thunder'],
  [stem('şimşek'), 'thunder'],
  [stem('yıldırım'), 'thunder'],
  [stem('kasırga'), 'wind'],
  [stem('fırtına'), 'wind'],
  [stem('rüzg[âa]r'), 'wind'],
  [stem('uğultu'), 'wind'],
  [stem('kükre'), 'roar'],
  [stem('hırla'), 'roar'],
  [stem('hırıl'), 'roar'],
  [stem('homurt'), 'roar'],
  [stem('ulum'), 'roar'],
  [stem('ulur'), 'roar'],
  [stem('adım'), 'step'],
  [stem('ayak'), 'step'],
  [stem('çakıl'), 'stone'],
  [stem('taş', 'ı'), 'stone'],
  [stem('kaya', 'r'), 'stone'],
  [stem('kalp'), 'heart'],
  [stem('nabız'), 'heart'],
  [stem('çan', 'a'), 'bell'],
  [stem('zil'), 'bell'],
  [stem('kuş'), 'bird'],
  [stem('turna'), 'wings'],
  [stem('sığırcık'), 'wings'],
  [stem('kanat'), 'wings'],
  [stem('nefes'), 'breath'],
  [stem('soluk', 'l'), 'breath'],
  [stem('yaprak'), 'leaves'],
  [stem('hışırtı'), 'leaves'],
  [stem('dal', 'gm'), 'leaves'],
  [stem('su(yu|da|dan|lar|ya)?(?![a-zçğıöşü])'), 'water'],
  [stem('nehir'), 'water'],
  [stem('ırmak'), 'water'],
  [stem('dalga'), 'water'],
  [stem('akheron'), 'water'],
  [stem('kürek'), 'oar'],
  [stem('kayık'), 'oar'],
  [stem('kalabalık'), 'crowd'],
  [stem('küf[üu]r'), 'crowd'],
  [stem('küfr'), 'crowd'],
  [stem('iç (çek|geçir)'), 'sigh'],
  [stem('inilti'), 'sigh'],
  [stem('ağla'), 'sigh'],
  [stem('arı', 'y'), 'bees'],
  [stem('vızıl'), 'bees'],
  [stem('ateş'), 'fire'],
  [stem('alev'), 'fire'],
  [stem('çatırtı'), 'fire'],
  [stem('çığlık'), 'cry'],
  [stem('haykır'), 'cry'],
  [stem('feryat'), 'cry'],
  [stem('bağır'), 'cry'],
  [stem('kapı'), 'gate'],
  [stem('sayfa'), 'page'],
  [stem('kitap'), 'page'],
  [stem('bayıl'), 'faint'],
];

const SILENCE = ['sessizlik', 'susar', 'sessiz'];

/** Lower-case with Turkish dotted / dotless I handled. */
export function normalizeTr(text: string): string {
  return text.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

/**
 * Sounds named in an SFX description, in the order they appear (at most `max`,
 * no repeats). A description that only asks for silence gives [].
 */
export function soundsForDescription(description: string, max = 3): SoundId[] {
  const text = normalizeTr(description);
  const hits: { at: number; id: SoundId }[] = [];
  for (const [re, id] of SFX_KEYWORDS) {
    const m = re.exec(text);
    if (m) hits.push({ at: m.index, id });
  }
  hits.sort((a, b) => a.at - b.at);
  const out: SoundId[] = [];
  for (const h of hits) {
    if (!out.includes(h.id)) out.push(h.id);
    if (out.length >= max) break;
  }
  return out;
}

/** True when the description asks the world to fall silent (the ambience ducks). */
export function asksForSilence(description: string): boolean {
  const t = normalizeTr(description);
  return SILENCE.some((s) => t.includes(s)) && soundsForDescription(description).length === 0;
}

// ---------------------------------------------------------------------------
// Drones and ambience beds
// ---------------------------------------------------------------------------

export type BedKind = 'none' | 'forest' | 'wind' | 'storm' | 'water' | 'fire' | 'crowd' | 'sighs' | 'night';

export interface AmbienceSpec {
  /** Drone root frequency in Hz. */
  readonly root: number;
  /** Semitone offsets of the drone's partials above the root. */
  readonly chord: readonly number[];
  /** 0 = dark sine pad, 1 = brighter (more partials). */
  readonly brightness: number;
  /** 0–1 */
  readonly droneLevel: number;
  readonly bed: BedKind;
  readonly bedLevel: number;
}

interface CantoSound {
  readonly root: number;
  readonly chord: readonly number[];
  readonly brightness: number;
  readonly bed: BedKind;
}

const CANTO_SOUNDS: Readonly<Record<string, CantoSound>> = {
  inf01: { root: 73.42, chord: [0, 7, 15], brightness: 0.2, bed: 'forest' }, // D, minor colour
  inf02: { root: 87.31, chord: [0, 7, 12, 16], brightness: 0.35, bed: 'night' }, // F, evening
  inf03: { root: 65.41, chord: [0, 6, 13], brightness: 0.15, bed: 'crowd' }, // C, tritone unease
  inf04: { root: 110.0, chord: [0, 7, 12, 19], brightness: 0.45, bed: 'sighs' }, // A, open fifths
  inf05: { root: 61.74, chord: [0, 7, 10, 15], brightness: 0.25, bed: 'storm' }, // B, storm
};

const DEFAULT_CANTO: CantoSound = { root: 73.42, chord: [0, 7, 12], brightness: 0.25, bed: 'none' };

const BED_KEYWORDS: readonly (readonly [string, BedKind])[] = [
  ['kasırga', 'storm'],
  ['fırtına', 'storm'],
  ['rüzgârsız', 'forest'],
  ['rüzgarsız', 'forest'],
  ['rüzgâr', 'wind'],
  ['rüzgar', 'wind'],
  ['iç çek', 'sighs'],
  ['iç geçir', 'sighs'],
  ['inilti', 'sighs'],
  ['nehir', 'water'],
  ['ırmak', 'water'],
  ['akheron', 'water'],
  ['kıyı', 'water'],
  ['dalga', 'water'],
  ['ateş', 'fire'],
  ['alev', 'fire'],
  ['kalabalık', 'crowd'],
  ['uğultu', 'crowd'],
  ['ruhlar', 'crowd'],
  ['gece böce', 'night'],
  ['böcek', 'night'],
  ['cırcır', 'night'],
  ['orman', 'forest'],
  ['dal ', 'forest'],
  ['kuş', 'forest'],
];

function firstBed(text: string): BedKind | null {
  let best: { at: number; bed: BedKind } | null = null;
  for (const [stem, bed] of BED_KEYWORDS) {
    const at = text.indexOf(stem);
    if (at >= 0 && (!best || at < best.at)) best = { at, bed };
  }
  return best ? best.bed : null;
}

/**
 * The ambience for a beat: the canto's drone and bed, shaped by the cue prose.
 * "müzik yok" (no music) silences the drone; "sessiz" lowers everything; an
 * organ or a single note brightens or thins the drone.
 */
export function ambienceFor(music: string | null, ambience: string | null, cantoId: CantoId | null): AmbienceSpec {
  const base = (cantoId && CANTO_SOUNDS[cantoId]) || DEFAULT_CANTO;
  const m = music ? normalizeTr(music) : '';
  const a = ambience ? normalizeTr(ambience) : '';
  let droneLevel = 0.55;
  let brightness = base.brightness;
  let chord = base.chord;
  if (m.includes('müzik yok') || m.includes('muzik yok') || m.includes('müziksiz')) droneLevel = 0;
  if (m.includes('tek nota') || m.includes('tek, alçak') || m.includes('tek bir alçak') || m.includes('drone')) {
    chord = [0, 12];
    brightness = Math.min(brightness, 0.2);
  }
  if (m.includes('org')) brightness = Math.max(brightness, 0.6);
  if (m.includes('kesilir') || m.includes('susar')) droneLevel = Math.min(droneLevel, 0.25);
  let bed: BedKind = base.bed;
  let bedLevel = 0.5;
  const fromAmbience = a ? firstBed(a) : null;
  if (fromAmbience) bed = fromAmbience;
  if (a.includes('sessiz') || a.includes('sessizlik')) {
    bedLevel = 0.15;
    droneLevel = Math.min(droneLevel, 0.3);
  }
  if (bed === 'storm') bedLevel = Math.max(bedLevel, 0.7);
  return { root: base.root, chord, brightness, droneLevel, bed, bedLevel };
}

// ---------------------------------------------------------------------------
// Blips (GDD 8.2: every character has a murmur instead of a voice)
// ---------------------------------------------------------------------------

export interface BlipVoice {
  readonly freq: number;
  readonly wave: 'sine' | 'triangle' | 'square' | 'sawtooth';
  /** Random pitch spread in cents. */
  readonly spread: number;
  /** Gain multiplier. */
  readonly gain: number;
}

const BLIPS: Readonly<Record<SpeakerId, BlipVoice>> = {
  DANTE: { freq: 233, wave: 'triangle', spread: 90, gain: 0.8 },
  VIRGIL: { freq: 165, wave: 'sine', spread: 60, gain: 1 },
  BEATRICE: { freq: 392, wave: 'sine', spread: 40, gain: 0.7 },
  LUCIA: { freq: 440, wave: 'sine', spread: 50, gain: 0.6 },
  FRANCESCA: { freq: 330, wave: 'triangle', spread: 70, gain: 0.7 },
  CHARON: { freq: 82, wave: 'sawtooth', spread: 120, gain: 0.5 },
  MINOS: { freq: 70, wave: 'square', spread: 140, gain: 0.4 },
  HOMER: { freq: 130, wave: 'sine', spread: 50, gain: 0.9 },
  HORACE: { freq: 196, wave: 'triangle', spread: 60, gain: 0.7 },
  OVID: { freq: 220, wave: 'triangle', spread: 70, gain: 0.7 },
  LUCAN: { freq: 175, wave: 'triangle', spread: 60, gain: 0.7 },
  SOUL: { freq: 150, wave: 'triangle', spread: 160, gain: 0.6 },
  NEUTRAL: { freq: 260, wave: 'square', spread: 200, gain: 0.3 },
  SHADE: { freq: 200, wave: 'sine', spread: 120, gain: 0.5 },
};

/** A stable voice for any speaker (unknown ids get one from a hash of the id). */
export function blipVoice(speaker: SpeakerId): BlipVoice {
  const known = BLIPS[speaker];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < speaker.length; i++) h = (h * 31 + speaker.charCodeAt(i)) >>> 0;
  const freq = 140 + (h % 160);
  const waves: BlipVoice['wave'][] = ['sine', 'triangle'];
  return { freq, wave: waves[h % waves.length] as BlipVoice['wave'], spread: 60 + (h % 60), gain: 0.7 };
}
