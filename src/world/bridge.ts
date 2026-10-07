/**
 * The WorldBridge: the runner's handle on the playable world (WorldScene,
 * player, Virgil, level module, mechanics, camera).
 *
 * Owner: team D (world). Contract: WorldBridge (CreateWorldBridge).
 *
 * - Construction never touches a scene (the game has not booted yet).
 * - `loadCanto` starts WorldScene when it is not running and waits (bounded)
 *   for its World; every later call goes to that World when it holds the
 *   same canto, and is a harmless no-op otherwise.
 * - Control, armed beats and trust are remembered here and re-applied when a
 *   World attaches (a restarted scene never loses the runner's state).
 * - Every promise settles: world calls are raced against a generous real-time
 *   cap, so a broken level can slow the story down but never stop it.
 * - Gameplay signals go out on the bus as 'world:signal'; the runner is never
 *   called directly.
 */

import * as Phaser from 'phaser';
import { TRUST } from '../config';
import type {
  ArmedBeat,
  BeatRunInfo,
  CamCommand,
  CreateWorldBridge,
  PhaserDeps,
  PlaceDef,
  WorldBridge,
} from '../runtime/contracts';
import { SceneKeys } from '../scenes/keys';
import type { CantoId, CantoScript, DoStmt, PlaceId, Trigger } from '../story/types';
import { worldHost } from './host';
import type { World, WorldDeps } from './world';

/** How long loadCanto waits for WorldScene to come up. */
const SCENE_READY_MS = 6000;
/** Building a level never takes longer than this. */
const LOAD_CAP_MS = 12_000;
/** Last-resort caps (real time) for the world's share of a beat; level hooks have their own, shorter, game-time limits. */
const BEAT_CAP_MS = 10 * 60_000;
const CAMERA_CAP_MS = 20_000;

const S = Phaser.Scenes;

/** Resolves with the promise's value, or `fallback` after `ms` (real time). Never rejects. */
function capped<T>(p: Promise<T>, ms: number, fallback: T, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      onTimeout?.();
      resolve(fallback);
    }, ms);
    p.then(
      (v) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

class Bridge implements WorldBridge {
  private control = false;
  private armed: readonly ArmedBeat[] = [];
  private trust: number = TRUST.start;
  /** The canto the runner asked for last (null after unloadCanto). */
  private wanted: CantoId | null = null;
  private loadSeq = 0;

  constructor(private readonly deps: PhaserDeps) {
    worldHost.onAttach((w) => this.reapply(w));
  }

  // -------------------------------------------------------------------------
  // Plumbing
  // -------------------------------------------------------------------------

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    try {
      this.deps.bus.emit('debug:log', { level, message: `[world] ${message}` });
    } catch {
      // nothing else to do
    }
  }

  private worldDeps(): WorldDeps {
    return { bus: this.deps.bus, store: this.deps.store, story: this.deps.story, audio: this.deps.audio };
  }

  /** The attached World, whatever it holds. */
  private attached(): World | null {
    return worldHost.world;
  }

  /** The World when it holds `canto` (the runner's current canto by default). */
  private live(canto?: CantoId): World | null {
    const w = worldHost.world;
    if (!w || w.destroyedFlag) return null;
    const id = canto ?? this.wanted;
    if (!id || w.cantoId !== id) return null;
    return w;
  }

  private autoplay(): boolean {
    try {
      return this.deps.session.runner.autoplay !== null;
    } catch {
      return false;
    }
  }

  private sceneStatus(): number {
    try {
      const scene = this.deps.game.scene.getScene(SceneKeys.World);
      return scene ? scene.sys.settings.status : -1;
    } catch {
      return -1;
    }
  }

  /** Start WorldScene when needed and wait (bounded) for its World. */
  private async ensureWorld(): Promise<World | null> {
    const current = this.attached();
    const st = this.sceneStatus();
    if (current && !current.destroyedFlag && (st === S.RUNNING || st === S.PAUSED)) return current;
    try {
      if (st === S.SLEEPING) this.deps.game.scene.wake(SceneKeys.World);
      // Not started yet, shut down, or running without a World (it failed to build one): (re)start it.
      // A scene that is already starting (START … CREATING) is left alone.
      else if (st < S.START || st > S.CREATING) this.deps.game.scene.start(SceneKeys.World, { deps: this.worldDeps() });
    } catch (err) {
      this.log('error', `WorldScene could not start: ${err instanceof Error ? err.message : String(err)}`);
    }
    const w = await worldHost.whenReady(SCENE_READY_MS);
    if (!w) this.log('error', 'WorldScene did not come up; the story goes on without the world.');
    return w;
  }

  private reapply(w: World): void {
    try {
      w.setTrust(this.trust, 0);
      w.setRunnerControl(this.control);
      w.setArmed(this.armed);
    } catch (err) {
      this.log('error', `Could not re-apply world state: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -------------------------------------------------------------------------
  // WorldBridge
  // -------------------------------------------------------------------------

  async loadCanto(script: CantoScript | null, cantoId: CantoId): Promise<void> {
    const seq = ++this.loadSeq;
    this.wanted = cantoId;
    this.armed = [];
    try {
      this.trust = this.deps.store.state.trust;
    } catch {
      // keep the last value
    }
    const w = await this.ensureWorld();
    if (!w || seq !== this.loadSeq) return;
    await capped(
      w.load(script, cantoId).catch((err: unknown) => {
        this.log('error', `Level ${cantoId} failed to load: ${err instanceof Error ? err.message : String(err)}`);
      }),
      LOAD_CAP_MS,
      undefined,
      () => this.log('error', `Level ${cantoId} took too long to load; going on.`),
    );
    if (seq !== this.loadSeq) return;
    this.reapply(w);
  }

  unloadCanto(): void {
    this.loadSeq++;
    this.wanted = null;
    this.armed = [];
    this.control = false;
    try {
      this.attached()?.unload();
    } catch (err) {
      this.log('warn', `unloadCanto failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async beginBeat(info: BeatRunInfo): Promise<void> {
    const w = this.live(info.canto.id);
    if (!w) return;
    await capped(w.beginBeat(info), BEAT_CAP_MS, undefined, () => this.log('error', `beginBeat ${info.beat.id} timed out.`));
  }

  async endBeat(info: BeatRunInfo): Promise<void> {
    const w = this.live(info.canto.id);
    if (!w) return;
    await capped(w.endBeat(info), BEAT_CAP_MS, undefined, () => this.log('error', `endBeat ${info.beat.id} timed out.`));
  }

  async direct(stmt: DoStmt, index: number, info: BeatRunInfo): Promise<void> {
    const w = this.live(info.canto.id);
    if (!w) return;
    await capped(w.direct(stmt, index, info), BEAT_CAP_MS, undefined, () =>
      this.log('error', `DO ${index} of ${info.beat.id} timed out.`),
    );
  }

  async camera(cam: CamCommand): Promise<void> {
    const w = this.live();
    if (!w) return;
    await capped(w.cam(cam, this.autoplay()), CAMERA_CAP_MS, undefined);
  }

  setPlayerControl(enabled: boolean): void {
    this.control = enabled;
    try {
      this.attached()?.setRunnerControl(enabled);
    } catch (err) {
      this.log('error', `setPlayerControl failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  checkpoint(): void {
    try {
      this.live()?.checkpoint();
    } catch (err) {
      this.log('error', `checkpoint failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  setVirgilTrust(trust: number, delta: number): void {
    this.trust = trust;
    try {
      this.attached()?.setTrust(trust, delta);
    } catch (err) {
      this.log('error', `setVirgilTrust failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  setArmed(armed: readonly ArmedBeat[]): void {
    this.armed = armed;
    try {
      this.attached()?.setArmed(armed);
    } catch (err) {
      this.log('error', `setArmed failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  canSatisfy(trigger: Trigger): boolean {
    const w = this.live();
    if (!w) return false;
    try {
      return w.canSatisfy(trigger);
    } catch {
      return false;
    }
  }

  isSatisfied(trigger: Trigger): boolean {
    const w = this.live();
    if (!w) return false;
    try {
      return w.isSatisfied(trigger);
    } catch {
      return false;
    }
  }

  satisfy(trigger: Trigger): void {
    const w = this.live();
    try {
      if (w) {
        w.satisfy(trigger);
        return;
      }
      // No world: events and talks can still be published (autoplay, debug).
      if (trigger.kind === 'event') this.deps.bus.emit('world:signal', { kind: 'event', id: trigger.id });
      else if (trigger.kind === 'talk') this.deps.bus.emit('world:signal', { kind: 'talk', speaker: trigger.speaker });
    } catch (err) {
      this.log('error', `satisfy failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  teleport(place: PlaceId): boolean {
    const w = this.live();
    if (!w) return false;
    try {
      return w.teleport(place);
    } catch {
      return false;
    }
  }

  places(): readonly PlaceDef[] {
    const w = this.live();
    if (!w) return [];
    try {
      return w.places();
    } catch {
      return [];
    }
  }

  cancel(): void {
    try {
      this.attached()?.cancelAll();
    } catch (err) {
      this.log('warn', `cancel failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  debugInfo(): Record<string, unknown> {
    const w = this.attached();
    let world: Record<string, unknown> | null = null;
    try {
      world = w ? w.debugInfo() : null;
    } catch (err) {
      world = { error: err instanceof Error ? err.message : String(err) };
    }
    return {
      wanted: this.wanted,
      sceneStatus: this.sceneStatus(),
      control: this.control,
      armed: this.armed.map((a) => `${a.beat}:${a.trigger.kind}`),
      trust: this.trust,
      world,
    };
  }
}

export const createWorldBridge: CreateWorldBridge = (deps) => new Bridge(deps);
