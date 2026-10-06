/**
 * The Chapter 1 word table (bible §3.4.6, BINDING) and rhyme helpers.
 *
 * Owner: team A (story-core). Pure data and functions.
 * Frozen exports: WORDS, getWord, isRhyme, findWordInLine. Extra helpers:
 * WORD_NAMES, RHYME_FAMILIES, isWordName, familyOf, wordsInFamily,
 * rhymePartners, wordsOfCanto, wordsByCategory.
 * Only the lead writer changes the table (bible §0.1); keep it in sync with
 * §3.4.6 (tests/story/words.test.ts checks every origin line against the source).
 */

import type { CantoId, WordCategory, WordDef, WordName } from './types';

export const WORDS: readonly WordDef[] = [
  {
    name: 'Fear',
    family: null,
    role: 'burden',
    category: 'Burden',
    canto: 'inf01',
    scene: 'inf01.s1',
    origin: {
      text: 'Which in the very thought renews the fear.',
      citation: 'Inferno I, 6',
      canticle: 'Inferno',
      canto: 1,
      line: 6,
    },
    acquisition: 'auto',
    condition: null,
    description: 'A weight. Fear wears you down faster.',
  },
  {
    name: 'Way',
    family: '-ay',
    role: 'rhyme',
    category: 'Reveal',
    canto: 'inf01',
    scene: 'inf01.s1',
    origin: {
      text: 'In which I had abandoned the true way.',
      citation: 'Inferno I, 12',
      canticle: 'Inferno',
      canto: 1,
      line: 12,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Shows the way ahead for a moment.',
  },
  {
    name: 'Hope',
    family: '-ope',
    role: 'rhyme',
    category: 'Mend',
    canto: 'inf01',
    scene: 'inf01.s3',
    origin: {
      text: 'So were to me occasion of good hope,',
      citation: 'Inferno I, 41',
      canticle: 'Inferno',
      canto: 1,
      line: 41,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Restores your resolve.',
  },
  {
    name: 'Love',
    family: '-ove',
    role: 'rhyme',
    category: 'Force',
    canto: 'inf01',
    scene: 'inf01.s6',
    origin: {
      text: 'Avail me the long study and great love',
      citation: 'Inferno I, 83',
      canticle: 'Inferno',
      canto: 1,
      line: 83,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Moves what stands in your way.',
  },
  {
    name: 'Go',
    family: '-ow',
    role: 'rhyme',
    category: 'Swift',
    canto: 'inf02',
    scene: 'inf02.s4',
    origin: {
      text: 'Beatrice am I, who do bid thee go;',
      citation: 'Inferno II, 70',
      canticle: 'Inferno',
      canto: 2,
      line: 70,
    },
    acquisition: 'collect',
    condition: null,
    description: 'A longer, faster dash.',
  },
  {
    name: 'Away',
    family: '-ay',
    role: 'rhyme',
    category: 'Ward',
    canto: 'inf02',
    scene: 'inf02.s4',
    origin: {
      text: 'Weeping, her shining eyes she turned away;',
      citation: 'Inferno II, 116',
      canticle: 'Inferno',
      canto: 2,
      line: 116,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Turns a blow aside.',
  },
  {
    name: 'Stay',
    family: '-ay',
    role: 'rhyme',
    category: 'Still',
    canto: 'inf03',
    scene: 'inf03.s4',
    origin: {
      text: 'To thee, as soon as we our footsteps stay',
      citation: 'Inferno III, 77',
      canticle: 'Inferno',
      canto: 3,
      line: 77,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Nearby dangers pause.',
  },
  {
    name: 'Desire',
    family: '-ire',
    role: 'rhyme',
    category: 'Swift',
    canto: 'inf03',
    scene: 'inf03.s6',
    origin: {
      text: 'So that their fear is turned into desire.',
      citation: 'Inferno III, 126',
      canticle: 'Inferno',
      canto: 3,
      line: 126,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Carries you through crowds and wind.',
  },
  {
    name: 'Fire',
    family: '-ire',
    role: 'rhyme',
    category: 'Force',
    canto: 'inf04',
    scene: 'inf04.s3',
    origin: {
      text: 'This side the summit, when I saw a fire',
      citation: 'Inferno IV, 68',
      canticle: 'Inferno',
      canto: 4,
      line: 68,
    },
    acquisition: 'collect',
    condition: null,
    description: 'A blaze that drives demons back.',
  },
  {
    name: 'Light',
    family: '-ight',
    role: 'rhyme',
    category: 'Reveal',
    canto: 'inf04',
    scene: 'inf04.s5',
    origin: {
      text: 'Thus we went on as far as to the light,',
      citation: 'Inferno IV, 103',
      canticle: 'Inferno',
      canto: 4,
      line: 103,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Lights the dark and what it hides.',
  },
  {
    name: 'Wall',
    family: '-all',
    role: 'rhyme',
    category: 'Ward',
    canto: 'inf04',
    scene: 'inf04.s6',
    origin: {
      text: 'Seven times encompassed with lofty walls,',
      citation: 'Inferno IV, 107',
      canticle: 'Inferno',
      canto: 4,
      line: 107,
    },
    acquisition: 'collect',
    condition: null,
    description: 'A shield that holds for a while.',
  },
  {
    name: 'Peace',
    family: '-eace',
    role: 'rhyme',
    category: 'Still',
    canto: 'inf05',
    scene: 'inf05.s5',
    origin: {
      text: 'We would pray unto him to give thee peace,',
      citation: 'Inferno V, 92',
      canticle: 'Inferno',
      canto: 5,
      line: 92,
    },
    acquisition: 'collect',
    condition: null,
    description: 'Calms the wind around you.',
  },
  {
    name: 'Judgment',
    family: null,
    role: 'closer',
    category: 'Force',
    canto: 'inf05',
    scene: 'inf05.s6',
    origin: {
      text: 'They go by turns each one unto the judgment;',
      citation: 'Inferno V, 14',
      canticle: 'Inferno',
      canto: 5,
      line: 14,
    },
    acquisition: 'conditional',
    condition: 'choice:inf05.c4=b',
    description: 'A verdict that holds a demon still.',
  },
  {
    name: 'Pity',
    family: '-ity',
    role: 'rhyme',
    category: 'Mend',
    canto: 'inf05',
    scene: 'inf05.s8',
    origin: {
      text: 'The other one did weep so, that, for pity,',
      citation: 'Inferno V, 140',
      canticle: 'Inferno',
      canto: 5,
      line: 140,
    },
    acquisition: 'colophon',
    condition: null,
    description: 'Mends you, slowly and deeply.',
  },
];

const BY_NAME: ReadonlyMap<string, WordDef> = new Map(WORDS.map((w) => [w.name.toLowerCase(), w]));

/** Case-insensitive lookup. */
export function getWord(name: WordName): WordDef | null {
  return BY_NAME.get(name.toLowerCase()) ?? null;
}

/** Two different words of the same rhyme family rhyme (bible §3.4.4). A word never rhymes with itself. */
export function isRhyme(a: WordName, b: WordName): boolean {
  const wa = getWord(a);
  const wb = getWord(b);
  if (!wa || !wb || wa.name === wb.name) return false;
  return wa.family !== null && wa.family === wb.family;
}

/**
 * Where a word sits in a verse line: the last token whose lowercase form starts
 * with the word (`Wall` matches `walls,`). Returns the token's character range
 * without trailing punctuation, or null.
 */
export function findWordInLine(word: WordName, line: string): { start: number; end: number } | null {
  const needle = word.toLowerCase();
  const re = /[A-Za-z][A-Za-z']*/g;
  let found: { start: number; end: number } | null = null;
  for (let m = re.exec(line); m !== null; m = re.exec(line)) {
    if (m[0].toLowerCase().startsWith(needle)) found = { start: m.index, end: m.index + m[0].length };
  }
  return found;
}

/** Every word name, in table order. */
export const WORD_NAMES: readonly WordName[] = WORDS.map((w) => w.name);

/** Rhyme families in order of first appearance (`-ay`, `-ope`, …); the closer and the burden have none. */
export const RHYME_FAMILIES: readonly string[] = [
  ...new Set(WORDS.flatMap((w) => (w.family !== null ? [w.family] : []))),
];

/** True when `name` is a word of the table (case-insensitive). */
export function isWordName(name: string): boolean {
  return getWord(name) !== null;
}

/** Rhyme family of a word, or null (closer, burden, unknown word). */
export function familyOf(name: WordName): string | null {
  return getWord(name)?.family ?? null;
}

/** Every word of a rhyme family, in table order. */
export function wordsInFamily(family: string): WordDef[] {
  return WORDS.filter((w) => w.family === family);
}

/** The other words a word rhymes with (same family, never itself). */
export function rhymePartners(name: WordName): WordDef[] {
  const def = getWord(name);
  if (!def || def.family === null) return [];
  return WORDS.filter((w) => w.family === def.family && w.name !== def.name);
}

/** Words first granted in a canto (§3.4.6 "Kanto · sahne"), in table order. */
export function wordsOfCanto(canto: CantoId): WordDef[] {
  return WORDS.filter((w) => w.canto === canto);
}

/** Words of one category, in table order. */
export function wordsByCategory(category: WordCategory): WordDef[] {
  return WORDS.filter((w) => w.category === category);
}
