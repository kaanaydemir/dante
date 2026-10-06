/**
 * Everyone else on stage in Chapter 1: Charon (with his boat), Minos (with the
 * tail he girds himself with), the damned souls, the Neutrals running behind
 * the banner, the shade of the great refusal, Limbo's shades and great
 * spirits, the four poets, Francesca and Paolo, the lovers in the hurricane,
 * birds, wasps and the turning banner.
 *
 * Owner: team D (art). Pure data.
 */

import { crop, mirror, overlay, pad, recolor, replaceFrom, rows, shift, symmetric, type Palette } from '../pixelmap';
import { framed } from './dante';

// ---------------------------------------------------------------------------
// Charon
// ---------------------------------------------------------------------------

export const CHARON_PALETTE: Palette = {
  k: 0x0f0b08,
  h: 0xe8e6dc,
  H: 0xa8a49a,
  s: 0xb08a6a,
  S: 0x7e5e44,
  f: 0xff7a1a,
  e: 0xffe070,
  D: 0x2e2620,
  d: 0x4a3e34,
  o: 0x7a5a36,
  O: 0x4a361e,
};

const CHARON_FRONT = symmetric(
  rows(`
......kk
.....khh
....khhh
...khhhh
...khsss
...khfes
...khsSS
...khhSh
...kHhhh
...kHhhh
..kDHhhh
.kDdDHhh
.kDdddHh
kDdddddd
kDdddddd
kDdddddd
ksSDdddd
.kkDdddd
..kDdddd
..kDddDd
..kDddDd
.kDdddDd
.kDDddDd
.kkkkkkk
`),
);
/** The oar, held across the body. */
const OAR = rows(`
...............kk
..............kOk
.............kOk.
............kOk..
...........kOk...
..........kOk....
.........kOk.....
........kOk......
.......kOk.......
......kOk........
.....kOk.........
....kOk..........
...kOOk..........
..kOOOk..........
.kOOOk...........
.kOOk............
..kk.............
`);
/** The blow (III 111): the oar raised high to one side. */
const OAR_RAISED = rows(`
kk...............
kOk..............
.kOk.............
..kOk............
...kOk...........
....kOk..........
.....kOk.........
......kOk........
.......kOk.......
........kOk......
.........kOk.....
`);

export function charonFrames(): Array<[string, string[]]> {
  const base = framed(CHARON_FRONT);
  const hold = overlay(base, OAR, 7, 9);
  const strike = overlay(base, OAR_RAISED, 0, 2);
  const beckon = overlay(hold, rows(`
kk.
kSk
kSk
`), 3, 13);
  return [
    ['down-0', hold],
    ['down-1', shift(hold, 0, 1)],
    ['strike', strike],
    ['beckon', beckon],
  ];
}

export const BOAT_PALETTE: Palette = {
  k: 0x0c0806,
  o: 0x5a4028,
  O: 0x3a2814,
  l: 0x7a5a38,
  w: [0x9ab0b8, 0.6],
};

export const BOAT = rows(`
kk............................................kk
kOk..........................................kOk
kOOkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkOOk
.kOllllllllllllllllllllllllllllllllllllllllllOk.
.kOoooooooooooooooooooooooooooooooooooooooooOOk.
..kOooooooooooooooooooooooooooooooooooooooOOk..
...kOOoooooooooooooooooooooooooooooooooooOOk...
....kkOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOkk....
......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk......
..ww......ww.......ww........ww.......ww....ww..
`);

// ---------------------------------------------------------------------------
// Minos (48 x 48): the judge who girds himself with his tail (V 4–12)
// ---------------------------------------------------------------------------

export const MINOS_PALETTE: Palette = {
  k: 0x0c0a0a,
  m: 0x6c705c,
  M: 0x464b3a,
  n: 0x8f947a,
  c: 0xd0a84e,
  C: 0x8a6a2a,
  b: 0x26221c,
  B: 0x46402f,
  e: 0xff4a28,
  w: 0xe8e0c8,
  r: 0x5a1a1a,
  R: 0x3a1010,
  t: 0x2f4c2c,
  T: 0x1b2d1a,
  u: 0x52753f,
};

const MINOS_HALF = rows(`
........kc..kc
........kcckcc
.......kcccccc
.......kCCCCCC
......kMmmmmmm
......kMmmmmmm
......kMmeemmm
......kMmmmmmn
......kMmmmMmm
......kbBmmmmm
......kbbBmmmw
.......kbbBmmm
........kbbbbb
.....kkkkbbbbB
...kkMmmmkbbbb
..kMmmmnnmkbbb
.kMmmmnnnmmkbb
.kMmmmnnnmmmkb
kMmmmmmnnmmmmk
kMmmkmmmmmmmmm
kMmmkMmmmmmmmm
kMmmkMmmnmmmmm
kMmmkMmmmnmmmm
kmmmkMmmmmmmmm
kmmkkMmmmmmmmm
.kkkkMmmmmmmmm
.knnkrrrrrrrrr
.kmmkrRrrrrrrr
..kk.krrrrrrrr
.....kRrrrrrrr
.....kMmmmmkmm
.....kMmmmmkmm
.....kMmmmmkmm
.....kMmmmmkmm
.....kMmmmmkmm
.....kMmmmmkmm
....kMMmmmmkmm
....kkkkkkkk.k
`);

/** The snarl (V 4): jaws open in the beard. */
function snarl(half: readonly string[]): string[] {
  return replaceFrom(half, 9, rows(`
......kbBmmkkk
......kbbBkwrw
.......kbbBkkk
`));
}

/** Minos's body (no coils yet), 48 x 48, feet on the bottom. */
function minosBody(open: boolean): string[] {
  const half = open ? snarl(MINOS_HALF) : MINOS_HALF;
  return pad(symmetric(half), 48, 48, 'bottom', 0, -1);
}

/** Draws `n` coils of the tail around his body, bottom up (n = 0 … 9); the tip hangs at the side. */
export function minosCoils(base: readonly string[], n: number): string[] {
  let out = [...base];
  const coil = rows(`
..kkkkkkkkkkkkkkkkkkkkkkkkkk..
.kTtttuttttttuttttttuttttttTk.
kTttttttttttttttttttttttttttTk
.kkTTTTTTTTTTTTTTTTTTTTTTTTkk.
`);
  // Lowest coil around the shins, then up the legs, the waist and the chest.
  const ys = [38, 35, 32, 29, 26, 23, 20, 17, 14];
  for (let i = 0; i < Math.min(9, Math.max(0, n)); i++) out = overlay(out, coil, 9, ys[i] as number);
  // The tail's tip curls out at the lower right.
  out = overlay(out, rows(`
..kk.
.kTtk
kTtk.
kTk..
.kk..
`), 39, 40);
  return out;
}

export function minosFrames(): Array<[string, string[]]> {
  const idle = minosBody(false);
  const open = minosBody(true);
  const frames: Array<[string, string[]]> = [
    ['idle', minosCoils(idle, 0)],
    ['snarl', minosCoils(open, 0)],
  ];
  for (let n = 1; n <= 9; n++) frames.push([`coil-${n}`, minosCoils(idle, n)]);
  return frames;
}

// ---------------------------------------------------------------------------
// Souls
// ---------------------------------------------------------------------------

/** The damned at the shore (SOUL): pale, half transparent, bowed. */
export const SOUL_PALETTE: Palette = {
  k: [0x1c2230, 0.85],
  p: [0xc8d2e4, 0.78],
  P: [0x8e9ab4, 0.78],
  e: [0x2a3040, 0.9],
};

const SOUL_HALF = rows(`
....kk
...kpp
..kppp
..kpep
..kppp
...kPp
..kkpp
.kpppp
kpPppp
kpkPpp
kpkppp
kpkppp
.kkppp
..kPpp
..kppp
..kpPk
..kpk.
..kpk.
..kpk.
..kkk.
`);

const SOUL_STEP_A = rows(`
..kpPkpk....
..kpk.kpk...
.kpk...kk...
.kkk........
`);
const SOUL_STEP_B = rows(`
....kpkPpk..
...kpk.kpk..
...kk...kpk.
........kkk.
`);

/** A running Neutral (III 52–57): naked, pale, arms thrown up after the banner. Side view. */
export const NEUTRAL_PALETTE: Palette = {
  k: [0x1e1a18, 0.9],
  p: [0xd2bca6, 0.85],
  P: [0x9c8672, 0.85],
  e: [0x2a2420, 0.9],
};

const NEUTRAL_RUN_A = rows(`
.......kk...
..kk..kppk..
.kpk..kpepk.
.kpk..kpppk.
..kpk.kkpk..
...kpkkpppk.
....kppppPk.
.....kpppk..
.....kpPpk..
.....kpppk..
....kpPkppk.
...kpPk.kppk
..kpPk...kpk
..kpk.....kpk
.kkk......kkk
`);
const NEUTRAL_RUN_B = rows(`
.......kk...
.......kppk.
..kk..kpepk.
.kpk..kpppk.
.kpk..kkpk..
..kpkkpppk..
...kppppPk..
.....kpppk..
.....kpPpk..
.....kpppk..
.....kpPpk..
.....kpkpk..
....kpk.kpk.
....kpk.kpk.
....kkk.kkk.
`);

/** The shade of the great refusal (III 58–60): hooded, grey, turned away. Never named. */
export const REFUSAL_PALETTE: Palette = {
  k: [0x121214, 0.9],
  g: [0x6e6e78, 0.85],
  G: [0x4a4a54, 0.85],
  l: [0x9a9aa4, 0.85],
};

const REFUSAL_HALF = rows(`
......kk
....kkgg
...kgggl
...kgGGG
...kgGkk
...kgGkk
...kggGG
..kGgggg
.kGgggll
.kGggggl
kGgggggl
kGgggggg
kGgggggg
kGgggggg
.kGggggg
.kGggggg
.kGggggg
.kGgggGg
.kGGggGg
.kkkkkkk
`);

/** Limbo's shades (SHADE): soft, green-grey, still. */
export const SHADE_PALETTE: Palette = {
  k: [0x1a221e, 0.75],
  p: [0xa8bca8, 0.6],
  P: [0x7c907c, 0.6],
  e: [0x2a342e, 0.7],
};

/** The great spirits of Limbo: togas with a gold border, grave faces (IV 112–114). */
export const GREAT_PALETTE: Palette = {
  k: 0x1a1612,
  s: 0xd2a88a,
  S: 0xa47c60,
  e: 0x22201c,
  h: 0x5a4430,
  H: 0x3a2c1e,
  t: 0xe8dfc6,
  T: 0xb8ae96,
  y: 0xc9a24a,
  b: 0x5a4632,
};

const GREAT_HALF = rows(`
......kk
....kkhh
...khhhh
...khsss
...khses
...khssS
...kSsss
....kSss
...kTtts
..kTtttt
.kTtyttt
.kTtyttt
kTttyttt
kTtttytt
ksSttytt
.kkTttyt
..kTttty
..kTtttt
..kTtTtt
..kTtTtt
.kTttTtt
.kTTtTtt
.kkkkkkk
...kbbk.
...kkkk.
`);

/** Women of Limbo (Electra, Camilla, Lucretia …): long hair down the back. */
const GREAT_F_HALF = replaceFrom(
  GREAT_HALF,
  0,
  rows(`
......kk
....kkhh
...khhhh
..khhsss
..khhses
..khhssS
..khhsss
..khHkSs
..khkTts
`),
);

// ---------------------------------------------------------------------------
// The four poets (IV 85–90): one drawing, four robes; Homer carries a sword.
// ---------------------------------------------------------------------------

const POET_HALF = rows(`
......kk
....kkhh
...kGggg
...khsss
...khses
...khssS
...khsss
...kHhSs
...kRRhh
..kRrrrr
.kRrqrrr
.kRrqrrr
kRrqrrrr
kRrrrrrr
ksSRrrrr
.kkRrrrr
..kRrrrr
..kRrrRr
..kRrrRr
.kRrrrRr
.kRRrrRr
.kkkkkkk
...kbbk.
...kkkk.
`);

const POET_BASE: Palette = {
  k: 0x15120f,
  s: 0xd6aa88,
  S: 0xa67c5e,
  e: 0x22201c,
  g: 0x8faa5a,
  G: 0x55703a,
  b: 0x4a3a2a,
  w: 0xd8d8d8,
  W: 0x8a8a8a,
};

export const POET_PALETTES: Readonly<Record<'homer' | 'horace' | 'ovid' | 'lucan', Palette>> = {
  // Homer: white robe, white hair and beard, the sovereign poet.
  homer: { ...POET_BASE, R: 0x9a968a, r: 0xd8d2c0, q: 0xf0ece0, h: 0xeceae2, H: 0xb6b2a8 },
  // Horace: a satirist's dark teal.
  horace: { ...POET_BASE, R: 0x1e4a48, r: 0x2f6e6a, q: 0x4c928c, h: 0x4a3a2a, H: 0x2e2418 },
  // Ovid: the green of things that change their shape.
  ovid: { ...POET_BASE, R: 0x2e4a1e, r: 0x4a7030, q: 0x6e9448, h: 0x6a4a2a, H: 0x46301a },
  // Lucan: the deep blue of civil war's night.
  lucan: { ...POET_BASE, R: 0x1e2246, r: 0x323a74, q: 0x4e5a9e, h: 0x2a2018, H: 0x1a140e },
};

const SWORD = rows(`
.k.
kwk
kwk
kwk
kwk
kwk
kWk
kkkk
.kb.
.kb.
`);

const POET_SIDE = rows(`
......kkkk......
.....khhhhk.....
....kGgggggk....
....khhsssssk...
....khhssesk....
....khhssssssk..
....kHhssSssk...
.....kHhssk.....
....kRRhhRk.....
...kRrrrrrrk....
...kRrrqrrrRk...
...kRrrqrrrRk...
...kRrrqrrrRk...
...kRrrqqrrRk...
...kRrrrSsrRk...
...kRrrrrrrRk...
...kRrrrrrrrRk..
...kRrrrrrrrRk..
..kRrrrrrrrrRk..
..kRRrrrrrrRRk..
..kkkkkkkkkkkk..
....kbbk.kbbbk..
....kkkk.kkkkk..
`);
const POET_SIDE_STEP = rows(`
..kkkkkkkkkkkk..
..kbbk....kbbbk.
..kkkk....kkkkk.
`);

// ---------------------------------------------------------------------------
// Francesca and Paolo (V 73–142): two shades who never part, carried by the wind.
// ---------------------------------------------------------------------------

export const LOVERS_PALETTE: Palette = {
  k: [0x1a1218, 0.9],
  s: [0xe2c2b0, 0.92],
  S: [0xb08a7a, 0.92],
  e: [0x2a1a1e, 0.95],
  h: [0x2a1614, 0.92],
  d: [0xe8d6e4, 0.88],
  D: [0xb49ab4, 0.88],
  r: [0x7a2a34, 0.9],
  R: [0x4e1820, 0.9],
  b: [0x5a3a24, 0.92],
  w: [0xc8c0e0, 0.4],
};

const LOVERS = rows(`
..........................
...kkk..........kkk.......
..khhhk........kbbbk......
.khhsssk......kbbsssk.....
.khhsesk......kbbsesk.....
.khhsssk......kbbsSsk.....
.khhkSk........kkSsk......
.khkdddk.......kRrrrk.....
khhkdddDkk...kkRrrrrRk....
khkdddDddSkkkSrrrrrrRk....
.kkddDdddddkSsrrrrrRk.....
..kdddDddddk.kRrrrrRk.....
..kdddDDdddk..kRrrrRk.....
..kddddDddddk.kRrrrRk.....
...kdddDdddDdk.kRrrrRk....
....kkdddDddddkkRRrrrRk...
......kkdddDddddkkRRrrk...
........kkkddDddddkkkRk...
..........wkkkkddddDk.kk..
............ww..kkkkddk...
..................wwkkk...
....................ww....
`);

// ---------------------------------------------------------------------------
// The hurricane: lovers swept past (V 52–69), starlings and cranes (V 40–49).
// ---------------------------------------------------------------------------

export const WINDSOUL_PALETTE: Palette = {
  k: [0x161426, 0.8],
  p: [0xc4c4e6, 0.7],
  P: [0x8a8ab8, 0.7],
  w: [0xc4c4e6, 0.35],
};

const WINDSOUL_A = rows(`
.................kk.
...............kkppk
.....w.ww....kkpppPk
..ww.wwwwkkkkpppppk.
wwwwwwkkkpppppPPkk..
..wwkkpppppPPkkk....
....kkPPPPkkk.......
......kkkk..........
`);
const WINDSOUL_B = rows(`
....................
.................kk.
....ww.w.....kkkkppk
.wwwwwwwkkkkkpppppPk
wwwwwkkkpppppPPPkk..
..w.wkkPPPPkkkkk....
......kkkk..........
....................
`);

export const BIRD_PALETTE: Palette = {
  k: 0x0e0c14,
  g: 0x3a3a4a,
  w: 0x9a9aae,
};

const STARLING_A = rows(`
k.....k
.k...k.
..kgk..
...k...
`);
const STARLING_B = rows(`
.......
kkkgkkk
...k...
.......
`);
const CRANE_A = rows(`
kk...........
.kkw.......kk
..kwwkkkkkwk.
...kwwwwwwk..
.....kkkk....
`);
const CRANE_B = rows(`
.............
..........kk.
kkkkkkkkkkwk.
..kkwwwwwwk..
.....kkkk....
`);

// ---------------------------------------------------------------------------
// Wasps and hornets (III 64–66) and the banner (III 52–54)
// ---------------------------------------------------------------------------

export const WASP_PALETTE: Palette = {
  k: 0x100c06,
  y: 0xe0b030,
  w: [0xe8f0ff, 0.6],
};

const WASP_A = rows(`
.ww....
wwww...
.kykyk.
kykykyk
.kykyk.
`);
const WASP_B = rows(`
.......
.......
wkykyk.
kykykyk
.kykyk.
`);
const WASP_C = rows(`
.......
...ww..
.kykwwk
kykykyk
.kykyk.
`);

export const BANNER_PALETTE: Palette = {
  k: 0x120e0a,
  p: 0x5a4632,
  f: 0xb8ae96,
  F: 0x7c7462,
  r: 0x8a2a20,
};

function bannerFrame(wave: number): string[] {
  const cloth = [
    rows(`
kkkkkkkkk.
kffffffFk.
kfrrffffk.
kffffFfk..
kfffffFk..
kffFffffk.
kkkkkkkkk.
`),
    rows(`
kkkkkkkk..
kffffffFk.
kfrrfffffk
kfffffFffk
kffffffFk.
kffFfffk..
kkkkkkkk..
`),
    rows(`
kkkkkkkkkk
kffffffFfk
kfrrffffk.
kffffFfk..
kffffffk..
kffFffffk.
kkkkkkkkkk
`),
    rows(`
kkkkkkkkk.
kffffffFfk
kfrrfffffk
kfffFffffk
kffffFfffk
kfffffFk..
kkkkkkkk..
`),
  ][wave % 4] as string[];
  const pole = Array.from({ length: 22 }, (_, i) => (i === 0 ? '.kk.' : '.kp.'));
  return overlay(pad(pole, 16, 24, 'bottom'), cloth, 7, 2);
}

// ---------------------------------------------------------------------------
// Frame lists
// ---------------------------------------------------------------------------

function soulFrames(half: readonly string[], stepA: readonly string[], stepB: readonly string[]): Array<[string, string[]]> {
  const full = symmetric(half);
  const h = full.length;
  return [
    ['down-0', framed(full)],
    ['down-1', framed(replaceFrom(full, h - 4, stepA))],
    ['down-2', framed(replaceFrom(full, h - 4, stepB))],
  ];
}

export function soulSheetFrames(): Array<[string, string[]]> {
  return soulFrames(SOUL_HALF, SOUL_STEP_A, SOUL_STEP_B);
}

export function shadeSheetFrames(): Array<[string, string[]]> {
  return soulFrames(SOUL_HALF, SOUL_STEP_A, SOUL_STEP_B);
}

export function neutralFrames(): Array<[string, string[]]> {
  const a = framed(NEUTRAL_RUN_A);
  const b = framed(NEUTRAL_RUN_B);
  return [
    ['right-1', a],
    ['right-2', b],
    ['left-1', mirror(a)],
    ['left-2', mirror(b)],
    ['down-0', a],
  ];
}

export function refusalFrames(): Array<[string, string[]]> {
  return [['down-0', framed(symmetric(REFUSAL_HALF))]];
}

export function greatFrames(female: boolean): Array<[string, string[]]> {
  const full = symmetric(female ? GREAT_F_HALF : GREAT_HALF);
  return [
    ['down-0', framed(full)],
    ['down-1', framed(shift(full, 0, 0))],
  ];
}

export function poetFrames(withSword: boolean): Array<[string, string[]]> {
  const front = framed(symmetric(POET_HALF));
  const side = framed(POET_SIDE);
  const sideStep = framed(replaceFrom(POET_SIDE, 20, POET_SIDE_STEP));
  const armed = (m: readonly string[]): string[] => (withSword ? overlay(m, SWORD, 21, 12) : [...m]);
  return [
    ['down-0', armed(front)],
    ['right-0', side],
    ['right-1', sideStep],
    ['left-0', mirror(side)],
    ['left-1', mirror(sideStep)],
  ];
}

export function loversFrames(): Array<[string, string[]]> {
  const a = pad(LOVERS, 32, 32, 'bottom', 0, -1);
  const b = shift(a, 0, -1);
  return [
    ['down-0', a],
    ['down-1', b],
    ['left-0', mirror(a)],
    ['left-1', mirror(b)],
  ];
}

/** Francesca alone (the left figure of the pair) and Paolo alone (the right one), for scenes that place them apart. */
export function loverFrames(which: 'francesca' | 'paolo'): Array<[string, string[]]> {
  const part = which === 'francesca' ? crop(LOVERS, 0, 0, 13, LOVERS.length) : crop(LOVERS, 12, 0, 14, LOVERS.length);
  const a = pad(part, 32, 32, 'bottom', 0, -1);
  const b = shift(a, 0, -1);
  return [
    ['down-0', a],
    ['down-1', b],
  ];
}

export function windsoulFrames(): Array<[string, string[]]> {
  const a = pad(WINDSOUL_A, 24, 12, 'center');
  const b = pad(WINDSOUL_B, 24, 12, 'center');
  return [
    ['right-0', a],
    ['right-1', b],
    ['left-0', mirror(a)],
    ['left-1', mirror(b)],
  ];
}

export function birdFrames(): Array<[string, string[]]> {
  return [
    ['starling-0', pad(STARLING_A, 16, 8, 'center')],
    ['starling-1', pad(STARLING_B, 16, 8, 'center')],
    ['crane-0', pad(CRANE_A, 16, 8, 'center')],
    ['crane-1', pad(CRANE_B, 16, 8, 'center')],
  ];
}

export function waspFrames(): Array<[string, string[]]> {
  return [
    ['0', pad(WASP_A, 8, 8, 'center')],
    ['1', pad(WASP_B, 8, 8, 'center')],
    ['2', pad(WASP_C, 8, 8, 'center')],
  ];
}

export function bannerFrames(): Array<[string, string[]]> {
  return [0, 1, 2, 3].map((i) => [String(i), bannerFrame(i)] as [string, string[]]);
}

/** A generic stranger (unknown speakers): the soul drawing with solid colours. */
export const GENERIC_PALETTE: Palette = {
  k: 0x16120e,
  p: 0x8e7e6a,
  P: 0x5e5244,
  e: 0x1e1a14,
};

export function genericFrames(): Array<[string, string[]]> {
  return soulFrames(SOUL_HALF, SOUL_STEP_A, SOUL_STEP_B).map(([n, m]) => [n, recolor(m, {})] as [string, string[]]);
}
