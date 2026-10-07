import { describe, expect, it } from 'vitest';
import type * as Phaser from 'phaser';
import { touchPanel } from '../../src/ui/art/textureCache';

describe('panel texture cache', () => {
  it('sweeps old panels that nothing shows, and keeps the ones on screen', () => {
    const removed: string[] = [];
    const existing = new Set<string>();
    const onScreen = [{ texture: { key: 'ui-verse-3' } }, { list: [{ texture: { key: 'ui-card-7' } }] }];
    const game = {
      scene: { getScenes: () => [{ children: { list: onScreen } }] },
      textures: {
        exists: (k: string) => existing.has(k),
        remove: (k: string) => {
          existing.delete(k);
          removed.push(k);
        },
      },
    };
    const scene = { game } as unknown as Phaser.Scene;
    const keys = ['ui-verse-3', 'ui-card-7', ...Array.from({ length: 70 }, (_, i) => `ui-strip-${i}`)];
    for (const k of keys) {
      existing.add(k);
      touchPanel(scene, k);
    }
    expect(removed.length).toBeGreaterThan(0);
    // On screen (directly or inside a container): never removed.
    expect(removed).not.toContain('ui-verse-3');
    expect(removed).not.toContain('ui-card-7');
    // The newest ones stay.
    expect(removed).not.toContain('ui-strip-69');
    expect(existing.size).toBeLessThanOrEqual(58);
  });
});
