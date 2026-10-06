/**
 * Effect textures for the world: the light that cuts the darkness, glints on
 * armed places, the roar's fear ring, dust, the Ward shield, golden letters
 * of a cast verse, the engraving hatch, fog, the screen vignette, wind
 * streaks, shadows under feet, key caps for prompts, and Minos's circle
 * stones (II–IX).
 *
 * Owner: team D (art). Pure: no Phaser.
 */

import { painted, paintedSheet, image, type Bitmap } from './bitmap';
import { radialAlpha } from './paint';
import { rows, type Palette } from './pixelmap';
import { seededRandom } from '../world/geometry';

/** White radial light used to erase the darkness overlay (`fx-light`), 128 x 128. */
function light(): Bitmap {
  return painted('fx-light', 128, 128, (t) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const d = Math.hypot(x + 0.5 - 64, y + 0.5 - 64) / 64;
        const a = radialAlpha(d, 0.45);
        if (a > 0) t.set(x, y, 0xffffff, a);
      }
    }
  });
}

/** Soft glow (fire, glints, the light on the hill), 32 x 32. */
function glow(): Bitmap {
  return painted('fx-glow', 32, 32, (t) => {
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16) / 16;
        const a = radialAlpha(d, 0.05) * 0.9;
        if (a > 0) t.set(x, y, 0xffffff, a);
      }
    }
  });
}

/** A four-point sparkle, 4 frames (the glint on an armed place). */
function glint(): Bitmap {
  return paintedSheet('fx-glint', ['0', '1', '2', '3'], 9, 9, (t, i) => {
    const len = [1, 2, 4, 2][i] as number;
    const c = 0xfff4c8;
    t.set(4, 4, 0xffffff, 1);
    for (let k = 1; k <= len; k++) {
      const a = 1 - k / (len + 1.5);
      t.set(4 + k, 4, c, a);
      t.set(4 - k, 4, c, a);
      t.set(4, 4 + k, c, a);
      t.set(4, 4 - k, c, a);
    }
  });
}

/** A ring (the lion's roar; a verse's wave), 64 x 64; scaled at runtime. */
function ring(): Bitmap {
  return painted('fx-ring', 64, 64, (t) => {
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32);
        const a = Math.max(0, 1 - Math.abs(d - 29) / 2.5);
        if (a > 0) t.set(x, y, 0xffffff, a);
      }
    }
  });
}

/** Dust puffs (the lunge telegraph, footfalls), 3 frames of 8 x 8. */
function dust(): Bitmap {
  return paintedSheet('fx-dust', ['0', '1', '2'], 8, 8, (t, i) => {
    const r = 1.5 + i * 1.2;
    t.ellipse(4, 5, r, r * 0.7, 0xd8ccb0, (d) => (1 - d) * (0.9 - i * 0.25));
  });
}

/** The Ward verse's shield bubble, 28 x 28. */
function shield(): Bitmap {
  return painted('fx-shield', 28, 28, (t) => {
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const d = Math.hypot(x + 0.5 - 14, y + 0.5 - 14) / 13;
        if (d > 1) continue;
        const rim = Math.max(0, 1 - Math.abs(d - 0.92) / 0.1);
        const a = 0.12 + rim * 0.75;
        t.set(x, y, d > 0.85 ? 0xfff0b8 : 0xe8f0ff, a);
      }
    }
    t.set(9, 7, 0xffffff, 0.9);
    t.set(8, 8, 0xffffff, 0.7);
  });
}

/** Golden letters that rise from a cast verse, 6 frames of 5 x 7. */
function letters(): Bitmap {
  const glyphs = [
    rows(`
.yy.
y..y
yyyy
y..y
y..y
`),
    rows(`
yyy.
y..y
yyy.
y..y
yyy.
`),
    rows(`
.yyy
y...
y...
y...
.yyy
`),
    rows(`
y...
y...
y...
y...
yyyy
`),
    rows(`
y..y
yy.y
y.yy
y..y
y..y
`),
    rows(`
.yy.
y..y
y..y
y..y
.yy.
`),
  ];
  const pal: Palette = { y: 0xf3d77a };
  return paintedSheet('fx-letters', ['0', '1', '2', '3', '4', '5'], 6, 7, (t, i) => t.map(glyphs[i] as string[], pal, 1, 1));
}

/** Diagonal engraving hatch, tileable 16 x 16 (alpha only; tinted with the palette ink). */
function hatch(): Bitmap {
  return painted('fx-hatch', 16, 16, (t) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if ((x + y) % 4 === 0) t.set(x, y, 0xffffff, 0.55);
        else if ((x - y + 16) % 8 === 0) t.set(x, y, 0xffffff, 0.25);
      }
    }
  });
}

/** Tileable fog (soft value noise), 128 x 64. */
function fog(): Bitmap {
  const rnd = seededRandom(1867);
  const cellsX = 8;
  const cellsY = 4;
  const grid = Array.from({ length: cellsX * cellsY }, () => rnd());
  const at = (i: number, j: number): number => grid[(((j % cellsY) + cellsY) % cellsY) * cellsX + (((i % cellsX) + cellsX) % cellsX)] as number;
  return painted('fx-fog', 128, 64, (t) => {
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x++) {
        const fx = (x / 128) * cellsX;
        const fy = (y / 64) * cellsY;
        const i = Math.floor(fx);
        const j = Math.floor(fy);
        const u = fx - i;
        const v = fy - j;
        const su = u * u * (3 - 2 * u);
        const sv = v * v * (3 - 2 * v);
        const a0 = at(i, j) + (at(i + 1, j) - at(i, j)) * su;
        const b0 = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su;
        const n = a0 + (b0 - a0) * sv;
        const a = Math.max(0, n - 0.35) * 1.4;
        if (a > 0) t.set(x, y, 0xffffff, Math.min(1, a));
      }
    }
  });
}

/** Screen vignette (dark edges, Doré's frame), 160 x 90; stretched over the view. */
function vignette(): Bitmap {
  return painted('fx-vignette', 160, 90, (t) => {
    for (let y = 0; y < 90; y++) {
      for (let x = 0; x < 160; x++) {
        const dx = (x + 0.5 - 80) / 80;
        const dy = (y + 0.5 - 45) / 45;
        const d = Math.sqrt(dx * dx * 0.85 + dy * dy);
        const a = Math.max(0, Math.min(1, (d - 0.62) / 0.55));
        if (a > 0) t.set(x, y, 0x000000, a * a);
      }
    }
  });
}

/** A wind streak, 24 x 1 (fades at both ends). */
function windStreak(): Bitmap {
  return painted('fx-wind', 24, 1, (t) => {
    for (let x = 0; x < 24; x++) {
      const k = x / 23;
      t.set(x, 0, 0xffffff, Math.sin(k * Math.PI) * (0.4 + 0.6 * k));
    }
  });
}

/** The soft shadow under a character's feet, 16 x 6. */
function footShadow(): Bitmap {
  return painted('fx-shadow', 16, 6, (t) => t.ellipse(8, 3, 7.5, 2.6, 0x000000, (d) => 0.45 * (1 - d * d)));
}

/** A small arrow for the off-screen hint toward the place the story waits for. */
function arrow(): Bitmap {
  const map = rows(`
...k...
..kyk..
.kyyyk.
kyyyyyk
..kyk..
..kyk..
..kkk..
`);
  return image('fx-arrow', map, { k: 0x1a140c, y: 0xf3d77a });
}

/** 2 x 2 white pixel (particles, sparks). */
function pixel(): Bitmap {
  return painted('fx-pixel', 2, 2, (t) => t.rect(0, 0, 2, 2, 0xffffff, 1));
}

// ---------------------------------------------------------------------------
// Key caps and the circle stones
// ---------------------------------------------------------------------------

const KEY_GLYPHS: Readonly<Record<string, string[]>> = {
  e: rows(`
yyy
y..
yy.
y..
yyy
`),
  r: rows(`
yy.
y.y
yy.
y.y
y.y
`),
  j: rows(`
..y
..y
..y
y.y
.y.
`),
  q: rows(`
.y.
y.y
y.y
y.y
.yy
`),
};

function keycap(letter: string): Bitmap {
  const cap = rows(`
.kkkkkkkk.
kwwwwwwwwk
kwppppppwk
kwppppppwk
kwppppppwk
kwppppppwk
kwppppppwk
kwppppppwk
kWWWWWWWWk
.kkkkkkkk.
`);
  const pal: Palette = { k: 0x15100a, w: 0xf2e6c4, W: 0x9a8a62, p: 0x2a2218, y: 0xf3d77a };
  return painted(`prop-key-${letter}`, 10, 10, (t) => {
    t.map(cap, pal, 0, 0);
    t.map(KEY_GLYPHS[letter] ?? [], pal, 4, 2);
  });
}

const NUMERAL_GLYPH: Readonly<Record<string, string[]>> = {
  I: rows(`
y
y
y
y
y
`),
  V: rows(`
y...y
y...y
.y.y.
.y.y.
..y..
`),
  X: rows(`
y...y
.y.y.
..y..
.y.y.
y...y
`),
};

/** A standing stone with a Roman numeral cut in it (Minos's court: the circles II–IX). */
function circleStone(n: number): Bitmap {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const text = numerals[n] ?? '';
  const stone = rows(`
...kkkkkkkkkkkkkkkk...
..kLLLLLLLLLLLLLLLLk..
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kLllllllllllllllllmk.
.kmmmmmmmmmmmmmmmmmmk.
kkkkkkkkkkkkkkkkkkkkkk
`);
  const pal: Palette = { k: 0x0e0c0a, L: 0xaaa28a, l: 0x8e8670, m: 0x5a5244, y: 0x8a1a10 };
  return painted(`prop-num-${n}`, 22, 13, (t) => {
    t.map(stone, pal, 0, 0);
    // Glyph widths: I = 1, V = 5, X = 5, with a 1 px gap.
    const widths = [...text].map((c) => (c === 'I' ? 1 : 5));
    const total = widths.reduce((s, w) => s + w, 0) + Math.max(0, text.length - 1);
    let x = Math.floor((22 - total) / 2);
    for (const c of text) {
      t.map(NUMERAL_GLYPH[c] ?? [], pal, x, 4);
      x += (c === 'I' ? 1 : 5) + 1;
    }
  });
}

export function fxBitmaps(): Bitmap[] {
  const out: Bitmap[] = [
    light(),
    glow(),
    glint(),
    ring(),
    dust(),
    shield(),
    letters(),
    hatch(),
    fog(),
    vignette(),
    windStreak(),
    footShadow(),
    arrow(),
    pixel(),
    keycap('e'),
    keycap('r'),
    keycap('j'),
    keycap('q'),
  ];
  for (let n = 2; n <= 9; n++) out.push(circleStone(n));
  return out;
}
