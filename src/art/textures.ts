/**
 * Procedural art: ASCII pixel maps + palettes turned into textures at boot
 * (characters, animals, souls, tiles, props, vignettes, icons, effects).
 * The bitmaps come from the pure catalog (catalog.ts); this file only uploads
 * them as canvas textures, registers their frames and creates animations.
 *
 * Every key is checked first: a texture another layer already made is kept
 * (Phaser logs an error for a duplicate key), so calling this twice is safe.
 *
 * Owner: team D (art). Entry point kept: `generateTextures(scene)`.
 */

import type * as Phaser from 'phaser';
import type { Bitmap } from './bitmap';
import { buildCatalog, cantoBitmaps, PALETTE_CANTOS } from './catalog';

let cachedCatalog: ReturnType<typeof buildCatalog> | null = null;

function uploadBitmap(scene: Phaser.Scene, bmp: Bitmap): boolean {
  const textures = scene.textures;
  if (textures.exists(bmp.key)) return false;
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const data = new Uint8ClampedArray(bmp.width * bmp.height * 4);
  data.set(bmp.data.subarray(0, data.length));
  ctx.putImageData(new ImageData(data, bmp.width, bmp.height), 0, 0);
  const tex = textures.addCanvas(bmp.key, canvas);
  if (!tex) return false;
  for (const f of bmp.frames) tex.add(f.name, 0, f.x, f.y, f.w, f.h);
  return true;
}

/** Generates every texture and animation once (idempotent). Never throws. */
export function generateTextures(scene: Phaser.Scene): void {
  try {
    cachedCatalog ??= buildCatalog(PALETTE_CANTOS);
    for (const bmp of cachedCatalog.bitmaps) {
      try {
        uploadBitmap(scene, bmp);
      } catch {
        // A single broken texture must not stop the others.
      }
    }
    const anims = scene.anims;
    for (const a of cachedCatalog.anims) {
      if (anims.exists(a.key) || !scene.textures.exists(a.texture)) continue;
      const tex = scene.textures.get(a.texture);
      const frames = a.frames.filter((f) => tex.has(f)).map((frame) => ({ key: a.texture, frame }));
      if (frames.length === 0) continue;
      anims.create({ key: a.key, frames, frameRate: a.frameRate, repeat: a.repeat });
    }
  } catch {
    // Art is never worth a crash: the world falls back to whatever exists.
  }
}

/** Makes sure a canto's tiles and props exist (later cantos get generated on demand with their palette). */
export function ensureCantoTextures(scene: Phaser.Scene, cantoId: string): void {
  if (scene.textures.exists(`tileset-${cantoId}`)) return;
  try {
    for (const bmp of cantoBitmaps(cantoId)) uploadBitmap(scene, bmp);
  } catch {
    // ignore
  }
}

/** Texture key for a speaker's NPC, falling back through groups to the generic stranger. */
export function npcTextureKey(scene: Phaser.Scene, speaker: string, explicit?: string): string {
  const candidates: string[] = [];
  if (explicit) candidates.push(explicit);
  const id = speaker.toLowerCase();
  candidates.push(`npc-${id}`);
  const group = NPC_GROUPS[speaker];
  if (group) candidates.push(group);
  candidates.push('npc-generic');
  for (const key of candidates) if (scene.textures.exists(key)) return key;
  return '__MISSING';
}

/** Speakers drawn with a shared figure. */
const NPC_GROUPS: Readonly<Record<string, string>> = {
  ARISTOTLE: 'npc-limbo_great',
  SOCRATES: 'npc-limbo_great',
  PLATO: 'npc-limbo_great',
  AVICENNA: 'npc-limbo_great',
  AVERROES: 'npc-limbo_great',
  HECTOR: 'npc-limbo_great',
  CAESAR: 'npc-limbo_great',
  LATINUS: 'npc-limbo_great',
  BRUTUS: 'npc-limbo_great',
  DEMOCRITUS: 'npc-limbo_great',
  DIOGENES: 'npc-limbo_great',
  ANAXAGORAS: 'npc-limbo_great',
  THALES: 'npc-limbo_great',
  ZENO: 'npc-limbo_great',
  EMPEDOCLES: 'npc-limbo_great',
  HERACLITUS: 'npc-limbo_great',
  DIOSCORIDES: 'npc-limbo_great',
  ORPHEUS: 'npc-limbo_great',
  TULLY: 'npc-limbo_great',
  LIVY: 'npc-limbo_great',
  SENECA: 'npc-limbo_great',
  EUCLID: 'npc-limbo_great',
  PTOLEMY: 'npc-limbo_great',
  GALEN: 'npc-limbo_great',
  HIPPOCRATES: 'npc-limbo_great',
  AENEAS: 'npc-limbo_great',
  SALADIN: 'npc-limbo_great',
  ELECTRA: 'npc-limbo_great_f',
  CAMILLA: 'npc-limbo_great_f',
  PENTHESILEA: 'npc-limbo_great_f',
  LAVINIA: 'npc-limbo_great_f',
  LUCRETIA: 'npc-limbo_great_f',
  JULIA: 'npc-limbo_great_f',
  MARCIA: 'npc-limbo_great_f',
  CORNELIA: 'npc-limbo_great_f',
  SEMIRAMIS: 'npc-windsoul',
  DIDO: 'npc-windsoul',
  CLEOPATRA: 'npc-windsoul',
  HELEN: 'npc-windsoul',
  ACHILLES: 'npc-windsoul',
  PARIS: 'npc-windsoul',
  TRISTAN: 'npc-windsoul',
  SHADE: 'npc-shade',
  NEUTRAL: 'npc-neutral',
  SOUL: 'npc-soul',
};
