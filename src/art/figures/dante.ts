/**
 * Dante: red robe and hood (the cappuccio), a laurel wreath, a long robe to
 * the ankles. Front and back are drawn as left halves and mirrored; the side
 * view is drawn whole. Walk frames swap the hem and feet rows; dash, cast,
 * sit and faint poses are variations of the same drawings.
 *
 * Owner: team D (art). Pure data.
 */

import { mirror, overlay, pad, replaceFrom, rows, shift, symmetric, type Palette } from '../pixelmap';

export const DANTE_PALETTE: Palette = {
  k: 0x1a0d0b,
  R: 0x6b1216,
  r: 0xa3242a,
  q: 0xcf4a3c,
  s: 0xe2b48c,
  S: 0xb5835f,
  e: 0x2a1810,
  w: 0xd9cdb0,
  W: 0xa8987a,
  g: 0x7aa346,
  G: 0x46692a,
  b: 0x4a2e1c,
  y: 0xf0cf7a,
  Y: 0xb8893a,
  p: 0xf4ecd8,
  z: [0xcf4a3c, 0.45],
};

/** Left half of the front view (16 x 26 when mirrored). */
const FRONT = symmetric(
  rows(`
......kk
....kkrr
...krrqq
..kGgggg
..kRwsss
..kRwses
..kRWssS
..kRRSss
...kRRsS
...kRRRs
..kRrrRR
.kRrrrrr
.kRqrrrr
kRqrrrrr
kRqrrrrr
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
`),
);

const BACK = symmetric(
  rows(`
......kk
....kkrr
...krrqq
..kGgggg
..kRrrrr
..kRrqrr
..kRrrrr
..kRRrrr
...kRRrr
...kRRRr
..kRrrRR
.kRrrrrr
.kRrrrrr
kRqrrrrr
kRqrrrrr
kRrrrrrr
ksSRrrrr
.kkRrrrr
..kRrrrr
..kRrrrR
..kRrrrR
.kRrrrrR
.kRRrrrR
.kkkkkkk
...kbbk.
...kkkk.
`),
);

const SIDE = rows(`
.....kkkk.......
...kkrrrrkk.....
..krrrqqqrrk....
..kGggggggGk....
..kRRrrwssssk...
..kRrrrwssesk...
..kRrrrWsssssk..
..kRrrrRsSssk...
...kRrrRsSsk....
...kRRrrRRk.....
...kRrrrrrRk....
..kRrrrrrrrRk...
..kRrrRrrrrRk...
..kRrrRrrrrRk...
..kRrrRrrrrRk...
..kRrrRqrrrRk...
..kRrrrSsrrRk...
..kRrrrrrrrRk...
..kRrrrrrrrRk...
..kRrrrrrrrrRk..
..kRrrrrrrrrRk..
.kRrrrrrrrrrRk..
.kRRrrrrrrrRRk..
.kkkkkkkkkkkkk..
...kbbk..kbbbk..
...kkkk..kkkkk..
`);

/** Hem and feet rows (from row 23) for the walk cycle. */
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
kkkkkkkkkkkkkk..
.kbbk.....kbbbk.
.kkkk.....kkkkk.
`);
const SIDE_STEP_B = rows(`
.kkkkkkkkkkkkk..
.....kbbbbk.....
.....kkkkkk.....
`);

/** The open book held in both hands when casting a verse. */
const BOOK_FRONT = rows(`
...kkkkkkkkk...
..kSkpppppkSk..
..kskpYpYpksk..
...kkkkkkkkk...
`);
const BOOK_SIDE = rows(`
.kkkkkk
kpppppk
kpYpYYk
skkkkkk
`);

/** Seated on Virgil's bench: the robe folds at the knees. */
const SIT_LEGS = rows(`
.kRrrrrrrrrrrRk.
kRRrrrrrrrrrrRRk
kkkkkkkkkkkkkkkk
..kbbk....kbbk..
..kkkk....kkkk..
`);

/** Fallen (a faint, the she-wolf's push): lying on the ground, head to the right. */
const FAINT = rows(`
..................kkkk......
.........kkkkkkkkkrrrrk.....
...kkkkkkRrrrrrrrrqqrrkkk...
.kkRrrrrrrrrrrrrrrrGggggk...
kbRrrrrrrrrrrrrqqrrRRsssk...
kbRRrrrrrrrrrrrrrrrRRsesk...
.kkRRRRRRRRRRRRRRRRRRRSSk...
..kkkkkkkkkkkkkkkkkkkkkk....
`);

export const CHAR_FRAME = 32;

/** A 16-wide figure placed in the 32 x 32 frame, feet one pixel above the bottom. */
export function framed(map: readonly string[]): string[] {
  return pad(map, CHAR_FRAME, CHAR_FRAME, 'bottom', 0, -1);
}

/** Motion streaks behind a dashing figure. */
export function streaks(map: readonly string[], dir: 'left' | 'right' | 'up' | 'down'): string[] {
  const lines = rows(
    dir === 'right' || dir === 'left'
      ? `
zz.....
.......
zzzz...
.......
zz.....
`
      : `
z.z.z
z.z.z
.....
z...z
`,
  );
  switch (dir) {
    case 'right':
      return overlay(map, lines, 3, 14);
    case 'left':
      return overlay(map, mirror(lines), 22, 14);
    case 'down':
      return overlay(map, lines, 13, 3);
    case 'up':
      return overlay(map, lines, 13, 27);
  }
  return [...map];
}

export function danteFrames(): Array<[string, string[]]> {
  const front = framed(FRONT);
  const back = framed(BACK);
  const side = framed(SIDE);
  const frontA = framed(replaceFrom(FRONT, 23, FRONT_STEP_A));
  const frontB = framed(replaceFrom(FRONT, 23, FRONT_STEP_B));
  const backA = framed(replaceFrom(BACK, 23, FRONT_STEP_B));
  const backB = framed(replaceFrom(BACK, 23, FRONT_STEP_A));
  const sideA = framed(replaceFrom(SIDE, 23, SIDE_STEP_A));
  const sideB = framed(replaceFrom(SIDE, 23, SIDE_STEP_B));

  const castFront = overlay(front, BOOK_FRONT, 9, 17);
  const castSide = overlay(side, BOOK_SIDE, 17, 18);
  const sit = framed([...FRONT.slice(0, 18), ...SIT_LEGS]);
  const faint = pad(FAINT, CHAR_FRAME, CHAR_FRAME, 'bottom', 0, -1);

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
    ['dash-down', streaks(shift(frontA, 0, 1), 'down')],
    ['dash-up', streaks(shift(backA, 0, -1), 'up')],
    ['dash-right', streaks(shift(sideA, 1, 0), 'right')],
    ['dash-left', streaks(shift(mirror(sideA), -1, 0), 'left')],
    ['cast-down', castFront],
    ['cast-up', back],
    ['cast-right', castSide],
    ['cast-left', mirror(castSide)],
    ['sit', sit],
    ['faint', faint],
    ['faint-left', mirror(faint)],
  ];
}
