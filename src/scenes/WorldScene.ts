/**
 * The playable world (camera zoom 2: a 640x360 pixel-art view). Hosts the
 * World (src/world/world.ts): the level (a LevelModule or the generic
 * fallback level), Dante, Virgil, NPCs and mechanics. The WorldBridge
 * (src/world/bridge.ts) starts this scene when a canto loads and talks to the
 * World through `worldHost`.
 *
 * Owner: team D (world). Class name and scene key are fixed.
 */

import * as Phaser from 'phaser';
import { WORLD_ZOOM } from '../config';
import { tryServices } from '../app/services';
import { worldHost } from '../world/host';
import { World, type WorldDeps } from '../world/world';
import { SceneKeys } from './keys';

/** Optional data passed to `scene.start(SceneKeys.World, data)`. */
export interface WorldSceneData {
  readonly deps?: WorldDeps;
}

export class WorldScene extends Phaser.Scene {
  private world: World | null = null;

  constructor() {
    super({ key: SceneKeys.World });
  }

  create(data?: WorldSceneData): void {
    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM);
    cam.setRoundPixels(true);
    const deps = data?.deps ?? this.depsFromServices();
    if (!deps) {
      // No services (should not happen after bootstrap): stay an empty, harmless scene.
      return;
    }
    try {
      this.world = new World(this, deps);
      worldHost.attach(this.world);
    } catch (err) {
      this.world = null;
      try {
        deps.bus.emit('debug:log', {
          level: 'error',
          message: `[world] WorldScene could not create the world: ${err instanceof Error ? err.message : String(err)}`,
        });
      } catch {
        // nothing else to do
      }
    }
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
  }

  private depsFromServices(): WorldDeps | null {
    const s = tryServices();
    if (!s) return null;
    return { bus: s.bus, store: s.store, story: s.story, audio: s.audio };
  }

  override update(time: number, delta: number): void {
    const w = this.world;
    if (!w) return;
    try {
      w.update(time, delta);
    } catch (err) {
      // Never throw from the update loop (docs/ENGINE.md §11).
      w.reportError(`World update failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private onResume(): void {
    this.world?.onResume();
  }

  private onShutdown(): void {
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    const w = this.world;
    this.world = null;
    if (!w) return;
    worldHost.detach(w);
    try {
      w.destroy();
    } catch {
      // the scene is going away anyway
    }
  }
}
