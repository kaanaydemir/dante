/**
 * Virgil: a pale grey-blue robe and cloak, a faded laurel wreath, grey hair
 * and beard; old but upright (bible §5.2, inf01 s6). A head taller than Dante.
 *
 * Owner: team D (art). Pure data.
 */

import { mirror, overlay, replaceFrom, rows, symmetric, type Palette } from '../pixelmap';
import { framed } from './dante';

export const VIRGIL_PALETTE: Palette = {
  k: 0x14171c,
  V: 0x5d6876,
  v: 0x8f9cab,
  u: 0xc4ccd6,
  U: 0xe4e8ec,
  s: 0xd2a685,
  S: 0xa67a5c,
  e: 0x22201c,
  h: 0xd6d3c8,
  H: 0x9f9b90,
  g: 0x9aa874,
  G: 0x5f6b45,
  b: 0x5a4632,
  y: 0xf0cf7a,
};

const FRONT = symmetric(
  rows(`
......kk
.....khh
....khhH
...kGggg
...khsss
...khses
...khssS
...khhsS
...kHhhh
....kHhh
...kVvkH
..kVvvvv
.kVvuvvv
.kVvuvvv
kVvuvvvv
kVvvvvvv
ksSVvvvv
.kkVvvvv
..kVvvVv
..kVvvVv
..kVvvVv
.kVvvvVv
.kVVvvVv
.kVVVvVv
.kkkkkkk
...kbbk.
...kkkk.
`),
);

const BACK = symmetric(
  rows(`
......kk
.....khh
....khhH
...kGggg
...khhhh
...khHhh
...khhhh
...kHhhh
....kHhh
....kVvv
...kVvvv
..kVvvvv
.kVvvvvv
.kVuvvvv
kVvuvvvv
kVvvvvvv
ksSVvvvv
.kkVvvvv
..kVvvvV
..kVvvvV
..kVvvvV
.kVvvvvV
.kVVvvvV
.kVVVvvV
.kkkkkkk
...kbbk.
...kkkk.
`),
);

const SIDE = rows(`
......kkkk......
.....khhhhk.....
....khhhHhhk....
....kGgggggk....
....khhhssssk...
....khhhsesk....
....khhhsssssk..
....kHhhhsSsk...
.....kHhhhhhk...
.....kHhhhhk....
....kVvvHhk.....
...kVvvvvvvk....
...kVvvuvvvVk...
...kVvvuvvvVk...
...kVvvuvvvVk...
...kVvvuuvvVk...
...kVvvvSsvVk...
...kVvvvvvvVk...
...kVvvvvvvVk...
...kVvvvvvvvVk..
...kVvvvvvvvVk..
..kVvvvvvvvvVk..
..kVvvvvvvvvVk..
..kVVvvvvvvVVk..
..kkkkkkkkkkkk..
....kbbk.kbbbk..
....kkkk.kkkkk..
`);

const FRONT_STEP_A = rows(`
.kkkkkkkkkkkkkk.
..kbbbk...kkk...
..kkkkk.........
`);
const FRONT_STEP_B = rows(`
.kkkkkkkkkkkkkk.
...kkk...kbbbk..
.........kkkkk..
`);
const SIDE_STEP_A = rows(`
.kkkkkkkkkkkkk..
..kbbk....kbbbk.
..kkkk....kkkkk.
`);
const SIDE_STEP_B = rows(`
..kkkkkkkkkkkk..
......kbbbbk....
......kkkkkk....
`);

/** An arm raised, pointing ahead (he names the shades, he shows the way). */
const POINT_ARM = rows(`
.......kk
.kkkkkkSsk
kVuuuuuSsk
.kkkkkkkk.
`);

const SIT_LEGS = rows(`
.kVvvvvvvvvvvVk.
kVVvvvvvvvvvvVVk
kkkkkkkkkkkkkkkk
..kbbk....kbbk..
..kkkk....kkkk..
`);

/** Head bowed (a nod when trust grows; grief in Limbo). */
function bow(front: readonly string[]): string[] {
  // Move the head rows (0–9) down by one pixel; the beard sinks onto the chest.
  const head = front.slice(0, 10);
  const body = front.slice(10);
  return ['.'.repeat(16), ...head.slice(0, 9), ...body.map((r, i) => (i === 0 ? overlayRow(r, head[9] as string) : r))];
}

function overlayRow(base: string, top: string): string {
  return [...base].map((c, i) => (top[i] && top[i] !== '.' ? (top[i] as string) : c)).join('');
}

export function virgilFrames(): Array<[string, string[]]> {
  const front = framed(FRONT);
  const back = framed(BACK);
  const side = framed(SIDE);
  const frontA = framed(replaceFrom(FRONT, 24, FRONT_STEP_A));
  const frontB = framed(replaceFrom(FRONT, 24, FRONT_STEP_B));
  const backA = framed(replaceFrom(BACK, 24, FRONT_STEP_B));
  const backB = framed(replaceFrom(BACK, 24, FRONT_STEP_A));
  const sideA = framed(replaceFrom(SIDE, 24, SIDE_STEP_A));
  const sideB = framed(replaceFrom(SIDE, 24, SIDE_STEP_B));
  const point = overlay(side, POINT_ARM, 16, 14);
  const sit = framed([...FRONT.slice(0, 19), ...SIT_LEGS]);
  const bowed = framed(bow(FRONT));
  return [
    ['down-0', front],
    ['down-1', frontA],
    ['down-2', frontB],
    ['up-0', back],
    ['up-1', backA],
    ['up-2', backB],
    ['right-0', side],
    ['right-1', sideA],
    ['right-2', sideB],
    ['left-0', mirror(side)],
    ['left-1', mirror(sideA)],
    ['left-2', mirror(sideB)],
    ['point-right', point],
    ['point-left', mirror(point)],
    ['sit', sit],
    ['bow', bowed],
  ];
}
