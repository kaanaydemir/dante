/**
 * Panels are painted once per size (`ui-verse-680x248-n`), and a long
 * session meets many sizes. This keeps the most recently used ones and,
 * when there are too many, removes old ones that nothing on screen uses any
 * more (every scene's display list is checked first), so memory stays flat
 * over a whole chapter.
 *
 * Owner: team C (presentation). Never throws.
 */

import type * as Phaser from 'phaser';

/** Panels kept before old ones are swept. */
const KEEP = 56;

const order: string[] = [];

/** Record a use of a cached panel texture (most recent last); sweep when the cache is full. */
export function touchPanel(scene: Phaser.Scene, key: string): void {
  const i = order.indexOf(key);
  if (i >= 0) order.splice(i, 1);
  order.push(key);
  if (order.length > KEEP) sweep(scene.game, key);
}

function collect(list: readonly Phaser.GameObjects.GameObject[], out: Set<string>): void {
  for (const obj of list) {
    const tex = (obj as unknown as { texture?: { key?: string } }).texture;
    if (tex?.key) out.add(tex.key);
    const children = (obj as unknown as { list?: Phaser.GameObjects.GameObject[] }).list;
    if (Array.isArray(children) && children.length > 0) collect(children, out);
  }
}

function sweep(game: Phaser.Game, keep: string): void {
  try {
    const inUse = new Set<string>([keep]);
    for (const s of game.scene.getScenes(false)) {
      const list = s.children?.list;
      if (list) collect(list, inUse);
    }
    const target = Math.floor(KEEP * 0.7);
    for (const key of [...order]) {
      if (order.length <= target) break;
      if (inUse.has(key)) continue;
      const idx = order.indexOf(key);
      if (idx >= 0) order.splice(idx, 1);
      if (game.textures.exists(key)) game.textures.remove(key);
    }
  } catch {
    // a missed sweep only costs memory
  }
}

/** Forget a key (its texture was removed elsewhere). */
export function forgetPanel(key: string): void {
  const i = order.indexOf(key);
  if (i >= 0) order.splice(i, 1);
}
