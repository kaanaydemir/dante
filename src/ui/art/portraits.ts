/**
 * Fallback portraits for dialogue balloons (32×32 pixel art, shown ×3).
 * The world's art layer may provide `portrait-<speaker>[-<tag>]`; these are
 * used only when it does not. Dante: red hood and laurel; Virgil: grey-white
 * hood, white beard; everyone else: a hooded shade tinted per speaker.
 *
 * Owner: team C (presentation).
 */

import { fromAscii } from './pixels';

export const PORTRAIT_SIZE = 32;

const DANTE_ROWS = [
  '................................',
  '................................',
  '...........KKKKKKKK.............',
  '.........KKRRRRRRRRKK...........',
  '........KRRRRRRRRRRRRK..........',
  '.......KRRRRHHHRRRRRRRK.........',
  '......KRRRRHHRRRRRRRRRRK........',
  '......KRRRRRRRRRGgGgGgGKK.......',
  '.....KRRRRRRRRGgGGgGGgWWK.......',
  '.....KRRRRRRRRRRRRRRRWWSK.......',
  '.....KRRRRRRRRRRRRRRRWSSSK......',
  '....KrRRRRRRRRRRRRRRRWSSSSK.....',
  '....KrRRRRRRRRRRRRRRWSSSESSK....',
  '....KrRRRRRRRRRRRRRRWSSSSSSK....',
  '....KrrRRRRRRRRRRRRRWsSSSSSSK...',
  '....KrrRRRRRRRRRRRRRWsSSSSSSSK..',
  '....KrrRRRRRRRRRRRRRWsSSSSSSSSK.',
  '....KrrRRRRRRRRRRRRRWsSSSSSKKK..',
  '....KrrrRRRRRRRRRRRRWsSSSSSK....',
  '....KrrrRRRRRRRRRRRRWssSSKKK....',
  '.....KrrRRRRRRRRRRRRWssSSSK.....',
  '.....KrrRRRRRRRRRRRRWssSSSK.....',
  '.....KrrrRRRRRRRRRRRRWsssK......',
  '......KrrRRRRRRRRRRRRRWKK.......',
  '......KrrrRRRRRRRRRRRRRK........',
  '.....KrrrRRRRRRRRRRRRRRRK.......',
  '....KrrrRRRRRRRRRRRRRRRRRK......',
  '...KrrrRRRRRRRRRRRRRRRRRRRK.....',
  '..KrrrRRRRRRRRRRRRRRRRRRRRRK....',
  '.KrrrRRRRRRRRRRRRRRRRRRRRRRRK...',
  '.KrrRRRRRRRRRRRRRRRRRRRRRRRRRK..',
  '.KrRRRRRRRRRRRRRRRRRRRRRRRRRRK..',
];

const DANTE_PALETTE: Readonly<Record<string, number>> = {
  K: 0x1a0f0c,
  R: 0xa3242a,
  r: 0x6e1519,
  H: 0xc8443d,
  G: 0x5f8a42,
  g: 0x2f4d24,
  S: 0xe0b48c,
  s: 0xb7835e,
  E: 0x2a1a12,
  W: 0xe8e0d0,
};

const VIRGIL_ROWS = [
  '................................',
  '................................',
  '...........KKKKKKKKK............',
  '.........KKAAAAAAAAAKK..........',
  '........KAAAAAAAAAAAAAK.........',
  '.......KAAAAGgGgGgGAAAAK........',
  '.......KAAAGgGGgGGgGAAAK........',
  '......KAAAABBBBBBBBBAAAAK.......',
  '......KAAABBSSSSSSSBBAAAK.......',
  '......KAAABSSSSSSSSSBAAAK.......',
  '.....KaAAABSEESSSEESBAAAAK......',
  '.....KaAAABSSSSSSSSSBAAAAK......',
  '.....KaAAABSSSSsSSSSBAAAAK......',
  '.....KaAAABBSSSsSSSBBAAAAK......',
  '.....KaAAABBBSssSSBBBAAAAK......',
  '.....KaAAABBBBbbbBBBBAAAAK......',
  '.....KaaAABBBBBBBBBBBAAAaK......',
  '.....KaaAAABBBBBBBBBAAAAaK......',
  '....KaaAAAAbBBBBBBBbAAAAaaK.....',
  '....KaaAAAAAbBBBBBbAAAAAaaK.....',
  '....KaaAAAAAAbBBBbAAAAAAaaK.....',
  '....KaaAAAAAAAbBbAAAAAAAaaK.....',
  '...KaaaAAAAAAAAAAAAAAAAAaaaK....',
  '...KaaAAAAAAAAAAAAAAAAAAAaaK....',
  '..KaaaAAAAAAAAAAAAAAAAAAAaaaK...',
  '..KaaAAAAAAAAAAAAAAAAAAAAAaaK...',
  '.KaaaAAAAAAAAAAAAAAAAAAAAAaaaK..',
  '.KaaAAAAAAAAAAAAAAAAAAAAAAAaaK..',
  'KaaaAAAAAAAAAAAAAAAAAAAAAAAaaaK.',
  'KaaAAAAAAAAAAAAAAAAAAAAAAAAAaaK.',
  'KaaAAAAAAAAAAAAAAAAAAAAAAAAAaaK.',
  'KaAAAAAAAAAAAAAAAAAAAAAAAAAAAaK.',
];

const VIRGIL_PALETTE: Readonly<Record<string, number>> = {
  K: 0x15130f,
  A: 0xb8b4ac,
  a: 0x7e7a72,
  B: 0xece8e0,
  b: 0xbdb8ae,
  G: 0x5f8a42,
  g: 0x2f4d24,
  S: 0xd9ad86,
  s: 0xa97c58,
  E: 0x2a1a12,
};

const SHADE_ROWS = [
  '................................',
  '................................',
  '................................',
  '...........KKKKKKKKK............',
  '.........KKHHHHHHHHHKK..........',
  '........KHHHHHHHHHHHHHK.........',
  '.......KHHHHHHHHHHHHHHHK........',
  '.......KHHHHFFFFFFFHHHHK........',
  '......KHHHHFFFFFFFFFHHHHK.......',
  '......KHHHFFFFFFFFFFFHHHK.......',
  '......KHHHFFEEFFFEEFFHHHK.......',
  '......KHHHFFFFFFFFFFFHHHK.......',
  '......KHHHFFFFFFFFFFFHHHK.......',
  '......KHHHHFFFFfFFFFHHHHK.......',
  '......KHHHHFFFFFFFFFHHHHK.......',
  '......KhHHHHFFFFFFFHHHHhK.......',
  '......KhHHHHHFFFFFHHHHHhK.......',
  '......KhhHHHHHHHHHHHHHhhK.......',
  '.....KhhHHHHHHHHHHHHHHHhhK......',
  '.....KhhHHHHHHHHHHHHHHHhhK......',
  '....KhhhHHHHHHHHHHHHHHHhhhK.....',
  '....KhhHHHHHHHHHHHHHHHHHhhK.....',
  '...KhhhHHHHHHHHHHHHHHHHHhhhK....',
  '...KhhHHHHHHHHHHHHHHHHHHHhhK....',
  '..KhhhHHHHHHHHHHHHHHHHHHHhhhK...',
  '..KhhHHHHHHHHHHHHHHHHHHHHHhhK...',
  '.KhhhHHHHHHHHHHHHHHHHHHHHHhhhK..',
  '.KhhHHHHHHHHHHHHHHHHHHHHHHHhhK..',
  'KhhhHHHHHHHHHHHHHHHHHHHHHHHhhhK.',
  'KhhHHHHHHHHHHHHHHHHHHHHHHHHHhhK.',
  'KhhHHHHHHHHHHHHHHHHHHHHHHHHHhhK.',
  'KhHHHHHHHHHHHHHHHHHHHHHHHHHHHhK.',
];

/** Hood colours for the generic shade, by speaker family. */
const SHADE_TINTS: Readonly<Record<string, readonly [number, number, number]>> = {
  HOMER: [0x8a7a5a, 0x5e5240, 0xd8c0a0],
  HORACE: [0x6a7a8a, 0x48535e, 0xd6b090],
  OVID: [0x7a5a7a, 0x523c52, 0xdcb494],
  LUCAN: [0x5a7a62, 0x3d5443, 0xd4ae8e],
  SOUL: [0x4a4f5e, 0x30333d, 0xb8b8c0],
  NEUTRAL: [0x5e5a52, 0x3e3b36, 0xb0aaa0],
  SHADE: [0x52586a, 0x363a46, 0xc0c4cc],
};

function shadePalette(speaker: string): Record<string, number> {
  let [hood, shade, face] = SHADE_TINTS[speaker] ?? [0x6a6258, 0x46403a, 0xd2ae8c];
  if (!SHADE_TINTS[speaker]) {
    let h = 0;
    for (let i = 0; i < speaker.length; i++) h = (h * 33 + speaker.charCodeAt(i)) >>> 0;
    const hues = [0x6a6258, 0x5e6a58, 0x6a5862, 0x58626a, 0x6e5e4a];
    hood = hues[h % hues.length] as number;
    shade = ((hood >> 1) & 0x7f7f7f) as number;
    face = 0xd2ae8c;
  }
  return { K: 0x15130f, H: hood, h: shade, F: face, f: 0xa88664, E: 0x2a1a12 };
}

/** ImageData of a fallback portrait. */
export function portraitImage(speaker: string): ImageData {
  if (speaker === 'DANTE') return fromAscii(DANTE_ROWS, DANTE_PALETTE, PORTRAIT_SIZE, PORTRAIT_SIZE);
  if (speaker === 'VIRGIL') return fromAscii(VIRGIL_ROWS, VIRGIL_PALETTE, PORTRAIT_SIZE, PORTRAIT_SIZE);
  return fromAscii(SHADE_ROWS, shadePalette(speaker), PORTRAIT_SIZE, PORTRAIT_SIZE);
}
