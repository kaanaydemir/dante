/**
 * The World: everything that lives in WorldScene for one canto. Loads a level
 * (its LevelModule, else the generic level built from the script), runs the
 * player, Virgil, NPCs and mechanics every frame, publishes `world:signal`
 * (enter / exit a place, talk to someone, gameplay events), and carries out
 * what the runner asks through the WorldBridge (beats, DO lines, CAM verbs,
 * control, checkpoints, trust, armed beats).
 *
 * Owner: team D (world).
 */

import type * as Phaser from 'phaser';
import { DEPTH, PLAYER, RESOURCES, TIMINGS, TRUST, paletteFor, type CantoPalette } from '../config';
import type {
  ActorHandle,
  ArmedBeat,
  AudioService,
  BeatHookContext,
  BeatHookPhase,
  BeatRunInfo,
  CamCommand,
  CheckpointRef,
  EventBus,
  GameStateStore,
  LevelModule,
  PlaceDef,
  Rect,
  SfxName,
  StoryLibrary,
  StoryPresenter,
  Trigger,
} from '../runtime/contracts';
import type { Beat, CantoId, CantoScript, DoStmt, EventId, PlaceId, SpeakerId, Statement } from '../story/types';
import { tryServices } from '../app/services';
import { ensureCantoTextures, generateTextures } from '../art/textures';
import { Player } from '../entities/player';
import { Companion } from '../entities/virgil';
import type { Npc } from '../entities/npc';
import { getLevel } from '../levels/_framework/registry';
import { createGenericLevel, emptyLevel } from '../levels/_framework/generic';
import { planGenericLevel, virgilOnStage, type GenericLayout } from '../levels/_framework/layout';
import { Ambience } from './ambience';
import { WorldCamera } from './camera';
import { registerExtras, type Interactable, type InteractableDef, type MechanicHooks, type VerseCast, type WorldExtras } from './extras';
import { dist, findFreeSpot, rectCenter } from './geometry';
import { WorldInput } from './input';
import { LevelHost, type LevelHostWorld } from './level';
import { ArmedMarkers } from './markers';
import { PlaceTracker, placeSpawn } from './places';
import { mendAmount, VerseCaster, VERSE_EFFECT } from './verse';

export interface WorldDeps {
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly audio: AudioService;
}

/** Talking reach from Dante's feet to someone's feet (a little more than the interact radius: 32 px figures). */
const TALK_REACH = PLAYER.interactRadius + 12;

function anySignal(signals: readonly (AbortSignal | undefined)[]): AbortSignal {
  const ctl = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ctl.abort();
      break;
    }
    s.addEventListener('abort', () => ctl.abort(), { once: true });
  }
  return ctl.signal;
}

function untilAbort(signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

/** Does a beat's script open with the colour seeping back in (CAM unengrave)? */
function hasCam(lines: readonly Statement[], verb: 'engrave' | 'unengrave'): boolean {
  return lines.some((s) => s.type === 'cam' && s.verb === verb);
}

function opensEngraved(script: CantoScript | null): boolean {
  if (!script) return false;
  const first = script.scenes.find((s) => s.number > 0);
  const beat = first?.beats[0];
  return beat ? hasCam(beat.lines, 'unengrave') : false;
}

export class World implements LevelHostWorld {
  readonly tracker = new PlaceTracker();
  readonly camera: WorldCamera;
  readonly input: WorldInput;
  readonly bus: EventBus;
  readonly store: GameStateStore;
  private readonly story: StoryLibrary;
  private readonly audio: AudioService;
  private readonly ambience: Ambience;
  private readonly markers: ArmedMarkers;
  private readonly caster: VerseCaster;

  dante: Player | null = null;
  companion: Companion | null = null;
  host: LevelHost | null = null;
  module: LevelModule | null = null;
  script: CantoScript | null = null;
  cantoId: CantoId | null = null;
  plan: GenericLayout | null = null;
  generic = false;
  palette: CantoPalette = paletteFor(null);
  private bounds: Rect = { x: 0, y: 0, w: 640, h: 360 };

  private runnerControl = false;
  private levelLock = false;
  private readonly locks = new Map<number, string>();
  private lockSeq = 0;
  private fainting = false;
  private armed: readonly ArmedBeat[] = [];
  private trust: number = TRUST.start;
  private abort = new AbortController();
  private readonly waits = new Set<() => void>();
  private time = 0;
  private interactCooldown = 0;
  private solidsCache: Rect[] | null = null;
  private readonly dynamicSolids = new Map<number, Rect>();
  private solidSeq = 0;
  private readonly interactables = new Map<string, Interactable>();
  private readonly verseHandlers = new Set<(c: VerseCast) => void>();
  private readonly emitted = new Set<EventId>();
  private frameSlow = 1;
  private stilledUntilMs = 0;
  private cameraAhead: { x: number; y: number } | null = null;
  private readonly benches: Array<{ x: number; y: number; sprite: Phaser.GameObjects.Image | null }> = [];
  private pendingSceneSync = false;
  private restoredCheckpoint = false;
  private caughtThisCanto = false;
  private lookBackOn = false;
  private movedFrame = false;
  private loadToken = 0;
  private virgilPrompt: Phaser.GameObjects.Image | null = null;
  private virgilGlint: Phaser.GameObjects.Sprite | null = null;
  private interactPrompt: Phaser.GameObjects.Image | null = null;
  private faded = false;
  private destroyed = false;

  constructor(
    readonly scene: Phaser.Scene,
    deps: WorldDeps,
  ) {
    this.bus = deps.bus;
    this.store = deps.store;
    this.story = deps.story;
    this.audio = deps.audio;
    generateTextures(scene);
    this.input = new WorldInput(scene);
    this.camera = new WorldCamera(scene, {
      player: () => this.dante?.actor ?? null,
      virgil: () => (this.companion?.visible ? this.companion.actor : null),
      npc: (speaker) => this.host?.npc(speaker) ?? null,
      ahead: () => this.aheadPoint(),
      screenShake: () => this.store.settings.screenShake,
    });
    this.ambience = new Ambience(scene);
    this.markers = new ArmedMarkers(scene);
    this.caster = new VerseCaster({
      scene,
      store: this.store,
      presenter: () => this.presenter(),
      sfx: (name) => this.sfx(name),
      flashes: () => this.store.settings.flashes,
    });
  }

  // =========================================================================
  // LevelHostWorld
  // =========================================================================

  get player(): ActorHandle {
    return (this.dante as Player).actor;
  }

  get virgil(): ActorHandle {
    return (this.companion as Companion).actor;
  }

  emit(event: EventId): void {
    if (!event) return;
    this.emitted.add(event);
    this.bus.emit('world:signal', { kind: 'event', id: event });
  }

  wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        this.waits.delete(finish);
        signal?.removeEventListener('abort', finish);
        timer?.remove(false);
        resolve();
      };
      if (signal?.aborted || this.destroyed) {
        resolve();
        return;
      }
      this.waits.add(finish);
      signal?.addEventListener('abort', finish, { once: true });
      const timer: Phaser.Time.TimerEvent | null = this.scene.time ? this.scene.time.delayedCall(Math.max(0, ms), finish) : null;
      if (!timer) finish();
    });
  }

  setLevelControl(enabled: boolean): void {
    this.levelLock = !enabled;
  }

  isPlayerIn(id: PlaceId): boolean {
    const def = this.tracker.get(id);
    if (!def || !this.dante) return false;
    const x = this.dante.x;
    const y = this.dante.y;
    return x >= def.x && x < def.x + def.w && y >= def.y && y < def.y + def.h;
  }

  solidsChanged(): void {
    this.solidsCache = null;
  }

  // =========================================================================
  // Loading
  // =========================================================================

  async load(script: CantoScript | null, cantoId: CantoId): Promise<void> {
    this.unload();
    const token = ++this.loadToken;
    this.cantoId = cantoId;
    this.script = script;
    ensureCantoTextures(this.scene, cantoId);
    try {
      this.plan = script ? planGenericLevel(script) : null;
    } catch (err) {
      this.log('error', `Could not plan a level for ${cantoId}: ${String(err)}`);
      this.plan = null;
    }
    const registered = getLevel(cantoId);
    this.palette = registered?.palette ?? paletteFor(cantoId);
    this.dante = new Player(this.scene, 0, 0);
    this.companion = new Companion(this.scene, 0, 0);
    this.companion.trust = this.trust;

    let module: LevelModule = registered ?? (script && this.plan ? createGenericLevel(script, this.plan) : emptyLevel(cantoId));
    let ok = await this.build(module, script, cantoId);
    if (token !== this.loadToken) return;
    if (!ok && registered && script && this.plan) {
      this.log('error', `Level ${cantoId} failed to build; using the generic level.`);
      this.teardownLevel();
      this.dante = new Player(this.scene, 0, 0);
      this.companion = new Companion(this.scene, 0, 0);
      this.companion.trust = this.trust;
      module = createGenericLevel(script, this.plan);
      ok = await this.build(module, script, cantoId);
      if (token !== this.loadToken) return;
    }
    this.generic = module.id === `generic:${cantoId}` || !registered;
    this.finishLoad();
  }

  private async build(module: LevelModule, script: CantoScript | null, cantoId: CantoId): Promise<boolean> {
    const host = new LevelHost(this, cantoId, module.palette ?? this.palette, script);
    this.host = host;
    this.module = module;
    registerExtras(host, this.extrasFor(host));
    try {
      await module.build(host);
      return true;
    } catch (err) {
      this.log('error', `Level ${module.id} build failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  private finishLoad(): void {
    const host = this.host;
    const dante = this.dante;
    const companion = this.companion;
    if (!host || !dante || !companion) return;
    const b = host.bounds ?? { w: 640, h: 360 };
    this.bounds = { x: 0, y: 0, w: b.w, h: b.h };
    this.camera.configure(host.palette, b.w, b.h);
    this.camera.clearFade();
    this.faded = false;
    this.ambience.configure(host.palette);

    const firstSpawn = [...host.spawns.values()][0];
    const firstPlace = this.tracker.places[0];
    let start = host.start ?? (firstSpawn ? { x: firstSpawn.x, y: firstSpawn.y } : firstPlace ? placeSpawn(firstPlace) : { x: b.w / 2, y: b.h / 2 });
    // Continue: wake at the saved checkpoint of this canto.
    const cp = this.store.state.position.checkpoint;
    this.restoredCheckpoint = false;
    if (cp && cp.canto === this.cantoId && cp.x > 0 && cp.y > 0 && cp.x < b.w && cp.y < b.h) {
      start = { x: cp.x, y: cp.y };
      this.restoredCheckpoint = true;
      this.placeBench(cp.x - 2, cp.y - 10);
    }
    const free = findFreeSpot(start.x, start.y - 3, 10, 6, this.solids(), this.bounds);
    dante.teleport(free.x, free.y + 3);
    companion.placeNear(dante.x, dante.y);
    companion.setPresent(this.virgilPresentAtStart());
    this.camera.follow(dante.actor);
    this.camera.cam.centerOn(dante.x, dante.y - 16);
    this.camera.setEngraved(opensEngraved(this.script));
    this.createPrompts();
    this.tracker.reset();
    this.updatePlaces();
    this.pendingSceneSync = true;
    this.caughtThisCanto = false;
    this.markers.set(this.armed, (id) => this.tracker.get(id));
    this.applyArmed();
  }

  private virgilPresentAtStart(): boolean {
    if (!this.plan) return true;
    if (this.plan.virgilNever) return false;
    // In the generic level he joins at the first beat that involves him (beginBeat updates it).
    return this.generic ? this.plan.virgilFrom === null : true;
  }

  private createPrompts(): void {
    const s = this.scene;
    this.virgilPrompt?.destroy();
    this.virgilGlint?.destroy();
    this.interactPrompt?.destroy();
    this.virgilPrompt = s.textures.exists('prop-key-e') ? s.add.image(0, 0, 'prop-key-e').setDepth(DEPTH.fx).setVisible(false) : null;
    this.interactPrompt = s.textures.exists('prop-key-e') ? s.add.image(0, 0, 'prop-key-e').setDepth(DEPTH.fx).setVisible(false) : null;
    this.virgilGlint = s.textures.exists('fx-glint') ? s.add.sprite(0, 0, 'fx-glint', '2').setDepth(DEPTH.fx).setVisible(false) : null;
    if (this.virgilGlint && s.anims.exists('fx-glint-twinkle')) this.virgilGlint.play('fx-glint-twinkle');
  }

  unload(): void {
    this.loadToken++;
    this.cancelAll();
    this.teardownLevel();
    this.cantoId = null;
    this.script = null;
    this.plan = null;
  }

  private teardownLevel(): void {
    try {
      this.module?.destroy?.();
    } catch {
      // ignore
    }
    this.host?.destroy();
    this.dante?.destroy();
    this.companion?.destroy();
    this.host = null;
    this.module = null;
    this.dante = null;
    this.companion = null;
    this.tracker.clear();
    this.markers.clear();
    this.ambience.destroy();
    this.camera.destroy();
    this.virgilPrompt = null;
    this.virgilGlint = null;
    this.interactPrompt = null;
    // Whatever level code created on the scene goes with it.
    try {
      this.scene.tweens.killAll();
      this.scene.time.removeAllEvents();
      this.scene.children.removeAll(true);
    } catch {
      // ignore
    }
    this.interactables.clear();
    this.verseHandlers.clear();
    this.dynamicSolids.clear();
    this.solidsCache = null;
    this.emitted.clear();
    this.benches.length = 0;
    this.cameraAhead = null;
    this.stilledUntilMs = 0;
    this.levelLock = false;
    this.locks.clear();
    this.fainting = false;
    this.lookBackOn = false;
  }

  // =========================================================================
  // Runner-facing operations (through the bridge)
  // =========================================================================

  async beginBeat(info: BeatRunInfo): Promise<void> {
    if (!this.host || !this.dante || info.canto.id !== this.cantoId) return;
    this.levelLock = false;
    this.locks.clear();
    this.lookBackOn = false;
    if (this.dante.pose === 'lookBack') this.dante.clearPose();
    const beat = info.beat;

    if (this.generic && this.plan && this.companion) {
      const on = virgilOnStage(this.plan, beat.id);
      if (on !== this.companion.visible) this.showVirgil(on, info.autoplay);
    }

    if (this.pendingSceneSync) {
      this.pendingSceneSync = false;
      if (!beat.place && info.scene.number > 0 && !this.restoredCheckpoint) {
        const home = this.plan?.sceneHome[info.scene.id] ?? null;
        if (home && this.tracker.has(home) && !this.isPlayerIn(home) && !this.firstSceneOfCanto(info)) this.teleport(home);
      }
    }

    if (beat.place && this.tracker.has(beat.place) && !this.isPlayerIn(beat.place)) {
      await this.bringPlayerTo(beat.place, info);
    }

    if (this.faded && beat.mode !== 'colophon' && beat.mode !== 'page') {
      this.faded = false;
      void this.camera.fade('clear', info.autoplay ? 1 : 400);
    }
    if (this.camera.engraved && beat.mode === 'play' && !hasCam(beat.lines, 'engrave') && !hasCam(beat.lines, 'unengrave')) {
      void this.camera.engrave(false, info.autoplay ? 1 : 600);
    }
    await this.runHook('start', info, null, -1);
  }

  async endBeat(info: BeatRunInfo): Promise<void> {
    if (!this.host || info.canto.id !== this.cantoId) return;
    await this.runHook('end', info, null, -1);
    this.camera.restore();
    this.levelLock = false;
    this.locks.clear();
  }

  async direct(stmt: DoStmt, index: number, info: BeatRunInfo): Promise<void> {
    if (!this.host || info.canto.id !== this.cantoId) return;
    await this.runHook('do', info, stmt, index);
  }

  async cam(cmd: CamCommand, autoplay: boolean): Promise<void> {
    if (!this.host) return;
    await this.camera.command(cmd, autoplay);
  }

  setRunnerControl(enabled: boolean): void {
    if (enabled && !this.runnerControl) {
      this.input.reset();
      this.interactCooldown = 180;
    }
    this.runnerControl = enabled;
  }

  setTrust(trust: number, delta: number): void {
    this.trust = trust;
    if (this.companion) {
      this.companion.trust = trust;
      this.companion.gesture(delta);
    }
  }

  setArmed(armed: readonly ArmedBeat[]): void {
    this.armed = armed;
    this.markers.set(armed, (id) => this.tracker.get(id));
    this.applyArmed();
  }

  private applyArmed(): void {
    const talk = new Set<SpeakerId>();
    for (const a of this.armed) if (a.trigger.kind === 'talk') talk.add(a.trigger.speaker);
    for (const npc of this.host?.npcList ?? []) npc.armed = talk.has(npc.speaker);
    if (talk.has('VIRGIL') && this.companion && !this.companion.visible) this.showVirgil(true, false);
  }

  canSatisfy(t: Trigger): boolean {
    switch (t.kind) {
      case 'auto':
      case 'after':
        return true;
      case 'enter':
        return this.tracker.has(t.place);
      case 'talk':
        if (t.speaker === 'VIRGIL') return this.companion !== null;
        return (this.host?.npcList ?? []).some((n) => n.speaker === t.speaker && n.talkable);
      case 'event':
        if (this.module?.emits?.includes(t.id)) return true;
        return (this.host?.mechanicList ?? []).some((m) => (m as MechanicHooks).emits?.includes(t.id) ?? false);
    }
    return false;
  }

  isSatisfied(t: Trigger): boolean {
    return t.kind === 'enter' ? this.isPlayerIn(t.place) : false;
  }

  satisfy(t: Trigger): void {
    switch (t.kind) {
      case 'enter':
        this.teleport(t.place);
        return;
      case 'talk': {
        if (t.speaker === 'VIRGIL') {
          if (this.companion && !this.companion.visible) this.showVirgil(true, true);
        } else {
          const npc = this.host?.npcObject(t.speaker);
          if (npc && this.dante) {
            const spot = findFreeSpot(npc.x - 18, npc.y, 10, 6, this.solids(), this.bounds);
            this.dante.teleport(spot.x, spot.y);
            this.companion?.placeNear(this.dante.x, this.dante.y);
            this.updatePlaces();
          }
        }
        this.bus.emit('world:signal', { kind: 'talk', speaker: t.speaker });
        return;
      }
      case 'event':
        this.emit(t.id);
        return;
      default:
        return;
    }
  }

  teleport(place: PlaceId): boolean {
    const def = this.tracker.get(place);
    if (!def || !this.dante) return false;
    const p = placeSpawn(def);
    const spot = findFreeSpot(p.x, p.y - 3, 10, 6, this.solids(), this.bounds);
    this.dante.teleport(spot.x, spot.y + 3);
    this.companion?.placeNear(this.dante.x, this.dante.y);
    this.camera.follow(this.dante.actor);
    this.camera.cam.centerOn(this.dante.x, this.dante.y - 16);
    this.updatePlaces();
    return true;
  }

  places(): readonly PlaceDef[] {
    return this.tracker.places;
  }

  /** The runner stopped: settle everything that waits. */
  cancelAll(): void {
    this.abort.abort();
    this.abort = new AbortController();
    for (const w of [...this.waits]) w();
    this.waits.clear();
    this.camera.cancel();
    this.levelLock = false;
    this.locks.clear();
    this.dante?.actor.stopWalk();
    this.companion?.actor.stopWalk();
    for (const n of this.host?.npcList ?? []) n.actor.stopWalk();
  }

  checkpoint(): void {
    if (!this.dante || !this.cantoId) return;
    const x = Math.round(this.dante.x);
    const y = Math.round(this.dante.y);
    const bench = this.benches.find((b) => dist(b.x, b.y, x, y) < 72) ?? this.placeBench(x - 22, y - 8);
    const cp: CheckpointRef = { canto: this.cantoId, place: this.tracker.current()[0] ?? null, x: bench.x + 4, y: bench.y + 12 };
    this.store.setPosition({ checkpoint: cp });
    this.bus.emit('checkpoint:set', { checkpoint: cp });
    this.companion?.waitAt(bench.x, bench.y + 2);
  }

  /** A stone bench: Virgil waits there; E lets Dante rest (Resolve refills). */
  placeBench(x: number, y: number): { x: number; y: number } {
    const spot = findFreeSpot(x, y - 3, 24, 6, this.solids(), this.bounds);
    const bx = Math.round(spot.x);
    const by = Math.round(spot.y + 3);
    const sprite = this.scene.textures.exists('prop-bench')
      ? this.scene.add.image(bx, by, 'prop-bench').setOrigin(0.5, 1).setDepth(DEPTH.actors + by / 10_000)
      : null;
    const bench = { x: bx, y: by, sprite };
    this.benches.push(bench);
    this.addInteractable({
      id: `bench@${bx},${by}`,
      x: bx,
      y: by + 4,
      radius: 26,
      onInteract: () => void this.rest(bench),
    });
    return { x: bx, y: by };
  }

  private async rest(bench: { x: number; y: number }): Promise<void> {
    const dante = this.dante;
    if (!dante || dante.pose === 'sit') return;
    const unlock = this.lock('rest');
    dante.teleport(bench.x - 4, bench.y + 1);
    dante.setPose('sit');
    this.store.refillResolve();
    await this.wait(1300, this.abort.signal);
    if (this.dante === dante) {
      dante.clearPose();
      dante.teleport(bench.x - 4, bench.y + 10);
    }
    unlock();
  }

  debugInfo(): Record<string, unknown> {
    return {
      canto: this.cantoId,
      level: this.module?.id ?? null,
      generic: this.generic,
      bounds: this.bounds,
      player: this.dante ? { x: Math.round(this.dante.x), y: Math.round(this.dante.y), pose: this.dante.pose } : null,
      virgil: this.companion
        ? { x: Math.round(this.companion.actor.x), y: Math.round(this.companion.actor.y), mode: this.companion.mode, visible: this.companion.visible }
        : null,
      inside: this.tracker.current(),
      places: this.tracker.places.map((p) => p.id),
      npcs: (this.host?.npcList ?? []).map((n) => `${n.speaker}${n.talkable ? '' : '(silent)'}`),
      control: { runner: this.runnerControl, level: !this.levelLock, locks: [...this.locks.values()], fainting: this.fainting, playable: this.playable() },
      armed: this.armed.map((a) => `${a.beat}:${a.trigger.kind}`),
      mechanics: (this.host?.mechanicList ?? []).map((m) => {
        try {
          return m.debugInfo();
        } catch {
          return { id: m.id, error: true };
        }
      }),
      engraved: this.camera.engraved,
      emitted: [...this.emitted],
    };
  }

  // =========================================================================
  // Frame
  // =========================================================================

  update(_time: number, delta: number): void {
    if (this.destroyed) return;
    const dt = Math.min(Math.max(delta, 0), 50);
    this.time += dt;
    const input = this.input.update();
    const dante = this.dante;
    const host = this.host;
    if (!dante || !host || !this.companion) {
      this.camera.update();
      return;
    }
    this.interactCooldown = Math.max(0, this.interactCooldown - dt);
    this.caster.update(dt);
    const playable = this.playable();
    this.frameSlow = 1;

    // Mechanics first: they push, slow and hurt before Dante moves.
    for (const m of host.mechanicList) {
      if (!m.enabled) continue;
      try {
        m.update(dt, this.time);
      } catch (err) {
        m.enabled = false;
        this.log('error', `Mechanic ${m.id} failed and was switched off: ${String(err)}`);
      }
    }
    try {
      this.module?.update?.(dt, host);
    } catch (err) {
      this.log('error', `Level ${this.module?.id ?? '?'} update failed: ${String(err)}`);
    }

    // Look back (bible §7.0): holding the key turns Dante around while he has control.
    if (playable && input.lookBackHeld && !input.anyMove && dante.pose === 'none') dante.setPose('lookBack');
    else if ((!input.lookBackHeld || !playable) && dante.pose === 'lookBack' && !this.lookBackOn) dante.clearPose();

    const resolve = this.store.state.resolve;
    const lowResolve = resolve <= 1.5 ? 0.72 : 1;
    const moved = dante.update(
      dt,
      playable ? input : null,
      { control: playable, solids: this.solids(), bounds: this.bounds, speedFactor: Math.min(this.frameSlow, lowResolve) },
      () => this.sfx('dash'),
    );
    this.movedFrame = moved > 0.15 || dante.dashing;

    if (playable && !this.presenterBusy()) {
      if (input.versePressed) this.castVerse();
      if (input.interactPressed && this.interactCooldown <= 0) this.interact();
    }

    this.companion.update(dt, { x: dante.x, y: dante.y, heading: dante.heading });
    const reach2 = TALK_REACH * TALK_REACH;
    for (const npc of host.npcList) {
      const dx = npc.x - dante.x;
      const dy = npc.y - dante.y;
      npc.update(dt, dx * dx + dy * dy <= reach2 * 1.6);
    }
    this.updatePrompts();
    this.updatePlaces();
    this.camera.update();
    const view = this.camera.cam.worldView;
    this.ambience.update(dt, view);
    this.markers.update(dt, view, (id) => this.isPlayerIn(id));

    if (!this.fainting && this.store.state.resolve <= 0.0001 && playable) void this.faint('resolve');
  }

  /** Dante can act on input. */
  playable(): boolean {
    return this.runnerControl && !this.levelLock && this.locks.size === 0 && !this.fainting && this.dante !== null;
  }

  private presenterBusy(): boolean {
    try {
      return this.presenter()?.busy ?? false;
    } catch {
      return false;
    }
  }

  private presenter(): StoryPresenter | null {
    return tryServices()?.presenter ?? null;
  }

  private updatePlaces(): void {
    if (!this.dante) return;
    const tr = this.tracker.update(this.dante.x, this.dante.y);
    for (const id of tr.exited) this.bus.emit('world:signal', { kind: 'exit', place: id });
    for (const id of tr.entered) this.bus.emit('world:signal', { kind: 'enter', place: id });
  }

  private updatePrompts(): void {
    const dante = this.dante;
    const companion = this.companion;
    if (!dante || !companion) return;
    const v = companion.actor;
    const virgilArmed = this.armed.some((a) => a.trigger.kind === 'talk' && a.trigger.speaker === 'VIRGIL');
    const near = companion.visible && dist(v.x, v.y, dante.x, dante.y) <= TALK_REACH * 1.25;
    const t = Math.round(Math.sin(this.time / 220));
    if (this.virgilPrompt) {
      this.virgilPrompt.setVisible(virgilArmed && near && companion.visible);
      this.virgilPrompt.setPosition(v.x, v.y - 40 + t);
    }
    if (this.virgilGlint) {
      this.virgilGlint.setVisible(virgilArmed && !near && companion.visible);
      this.virgilGlint.setPosition(v.x, v.y - 38);
    }
    if (this.interactPrompt) {
      const it = this.nearestInteractable();
      const talkTarget = this.nearestTalkable();
      this.interactPrompt.setVisible(Boolean(it) && !talkTarget && this.playable());
      if (it) {
        const key = it.key ?? 'e';
        if (this.interactPrompt.texture.key !== `prop-key-${key}` && this.scene.textures.exists(`prop-key-${key}`)) this.interactPrompt.setTexture(`prop-key-${key}`);
        this.interactPrompt.setPosition(it.x, it.y - 26 + t);
      }
    }
  }

  // =========================================================================
  // Interaction, verses, hurting, fainting
  // =========================================================================

  private nearestTalkable(): { speaker: SpeakerId; x: number; y: number } | null {
    const dante = this.dante;
    if (!dante) return null;
    let best: { speaker: SpeakerId; x: number; y: number; d: number } | null = null;
    const consider = (speaker: SpeakerId, x: number, y: number, armedOnly: boolean): void => {
      const d = dist(x, y, dante.x, dante.y);
      if (d > TALK_REACH * 1.25) return;
      if (armedOnly && !this.armed.some((a) => a.trigger.kind === 'talk' && a.trigger.speaker === speaker)) return;
      if (!best || d < best.d) best = { speaker, x, y, d };
    };
    if (this.companion?.visible) consider('VIRGIL', this.companion.actor.x, this.companion.actor.y, true);
    for (const n of this.host?.npcList ?? []) if (n.talkable && n.actor.sprite.visible) consider(n.speaker, n.x, n.y, false);
    return best;
  }

  private nearestInteractable(): Interactable | null {
    const dante = this.dante;
    if (!dante) return null;
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.interactables.values()) {
      if (!it.enabled) continue;
      const d = dist(it.x, it.y, dante.x, dante.y);
      if (d <= (it.radius ?? 24) && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  private interact(): void {
    const dante = this.dante;
    if (!dante) return;
    const who = this.nearestTalkable();
    if (who) {
      this.interactCooldown = 350;
      dante.actor.faceToward(who.x, who.y);
      if (who.speaker === 'VIRGIL') this.companion?.actor.faceToward(dante.x, dante.y);
      else this.host?.npcObject(who.speaker)?.actor.faceToward(dante.x, dante.y);
      this.bus.emit('world:signal', { kind: 'talk', speaker: who.speaker });
      return;
    }
    const it = this.nearestInteractable();
    if (it) {
      this.interactCooldown = 350;
      try {
        it.onInteract();
      } catch (err) {
        this.log('error', `Interaction ${it.id} failed: ${String(err)}`);
      }
    }
  }

  private castVerse(): void {
    const dante = this.dante;
    if (!dante) return;
    this.caster.cast(dante, (cast) => this.applyVerse(cast));
  }

  /** The world's own share of a verse; then every listener (mechanics, level code). */
  private applyVerse(cast: VerseCast): void {
    const dante = this.dante;
    if (!dante) return;
    switch (cast.category) {
      case 'Ward':
        dante.shield(VERSE_EFFECT.wardMs * cast.power);
        this.flashShield(VERSE_EFFECT.wardMs * cast.power);
        break;
      case 'Mend':
        this.store.adjustResolve(mendAmount(cast.power), 'verse');
        break;
      case 'Still':
        this.stilledUntilMs = Math.max(this.stilledUntilMs, this.time + VERSE_EFFECT.stillMs * cast.power);
        break;
      case 'Swift':
        dante.swiftDash(cast.power);
        break;
      default:
        break;
    }
    for (const m of this.host?.mechanicList ?? []) {
      const h = m as unknown as MechanicHooks;
      if (m.enabled && typeof h.onVerse === 'function') {
        try {
          h.onVerse(cast);
        } catch {
          // ignore
        }
      }
    }
    for (const fn of [...this.verseHandlers]) {
      try {
        fn(cast);
      } catch {
        // ignore
      }
    }
  }

  private flashShield(ms: number): void {
    const dante = this.dante;
    if (!dante || !this.scene.textures.exists('fx-shield')) return;
    const img = this.scene.add.image(dante.x, dante.y - 14, 'fx-shield').setDepth(DEPTH.fx).setAlpha(0.85);
    const follow = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.dante) img.setPosition(this.dante.x, this.dante.y - 14);
      },
    });
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      delay: Math.max(0, ms - 500),
      duration: 500,
      onComplete: () => {
        follow.remove(false);
        img.destroy();
      },
    });
  }

  hurt(amount: number, cause: string, from?: { x: number; y: number } | null, knock = 150): boolean {
    const dante = this.dante;
    if (!dante || !this.playable() || dante.invulnerable || amount <= 0) return false;
    this.store.adjustResolve(-amount, cause);
    dante.flash();
    dante.grantInvulnerability(700);
    if (from) {
      const dx = dante.x - from.x;
      const dy = dante.y - from.y;
      const d = Math.hypot(dx, dy) || 1;
      dante.knock((dx / d) * knock, (dy / d) * knock);
    }
    this.sfx('hurt');
    return true;
  }

  private drain(unitsPerSecond: number, dtMs: number, cause: string, floor = 0): void {
    if (!this.playable() || unitsPerSecond <= 0) return;
    const current = this.store.state.resolve;
    let amount = (unitsPerSecond * dtMs) / 1000;
    if (current - amount < floor) amount = Math.max(0, current - floor);
    if (amount > 0) this.store.adjustResolve(-amount, cause);
  }

  /** Resolve fell to nothing (GDD 2.4): fade, wake at the last bench beside Virgil. */
  private async faint(cause: string): Promise<void> {
    const dante = this.dante;
    const companion = this.companion;
    if (!dante || !companion || this.fainting) return;
    // Faithful (trust ≥ 7): Virgil catches Dante once per circle when he is close (GDD 2.4, bible §3.3).
    if (this.trust >= TRUST.faithful && companion.visible && !this.caughtThisCanto && dist(companion.actor.x, companion.actor.y, dante.x, dante.y) < 90) {
      this.caughtThisCanto = true;
      this.store.adjustResolve(3, 'virgil');
      companion.gesture(1);
      dante.grantInvulnerability(1500);
      return;
    }
    this.fainting = true;
    const signal = this.abort.signal;
    dante.setPose('faint');
    this.sfx('faint');
    this.bus.emit('player:faint', { cause });
    this.store.recordFaint();
    await this.camera.fade('black', TIMINGS.faintFadeMs);
    if (this.dante !== dante) return;
    const cp = this.store.state.position.checkpoint;
    const here = cp && cp.canto === this.cantoId ? { x: cp.x, y: cp.y } : null;
    const start = here ?? this.host?.start ?? placeSpawn(this.tracker.places[0] ?? { id: 'x', x: 32, y: 160, w: 32, h: 32 });
    const spot = findFreeSpot(start.x, start.y - 3, 10, 6, this.solids(), this.bounds);
    dante.teleport(spot.x, spot.y + 3);
    companion.placeNear(dante.x, dante.y);
    this.camera.cam.centerOn(dante.x, dante.y - 16);
    this.store.refillResolve();
    this.bus.emit('player:respawn', { checkpoint: here ? (cp as CheckpointRef) : null });
    for (const m of this.host?.mechanicList ?? []) {
      const h = m as unknown as MechanicHooks;
      if (typeof h.onRespawn === 'function') {
        try {
          h.onRespawn();
        } catch {
          // ignore
        }
      }
    }
    this.updatePlaces();
    await this.wait(250, signal);
    await this.camera.fade('clear', TIMINGS.respawnMs);
    if (this.dante !== dante) return;
    dante.clearPose();
    dante.grantInvulnerability(1500);
    this.fainting = false;
  }

  /** A scripted faint (the quake, Francesca): Dante falls; the world goes dark behind the presenter's white-out. */
  async scriptedFaint(opts: { color?: 'white' | 'red' | 'black'; ms?: number; signal?: AbortSignal } = {}): Promise<void> {
    const dante = this.dante;
    if (!dante) return;
    const unlock = this.lock('faint');
    dante.setPose('faint');
    this.sfx('faint');
    this.faded = true;
    const colour = opts.color === 'red' ? 'red' : opts.color === 'white' ? 'white' : 'black';
    await Promise.race([this.camera.fade(colour, opts.ms ?? TIMINGS.whiteOutMs), untilAbort(anySignal([opts.signal, this.abort.signal]))]);
    unlock();
  }

  lock(reason: string): () => void {
    const id = ++this.lockSeq;
    this.locks.set(id, reason);
    return () => {
      this.locks.delete(id);
    };
  }

  addInteractable(def: InteractableDef): Interactable {
    const it: Interactable = { ...def, enabled: true };
    this.interactables.set(def.id, it);
    return it;
  }

  /** Static solids of the level plus the runtime ones. */
  solids(): Rect[] {
    if (!this.solidsCache) this.solidsCache = [...(this.host?.solidList ?? []), ...this.dynamicSolids.values()];
    return this.solidsCache;
  }

  private addDynamicSolid(rect: Rect): () => void {
    const id = ++this.solidSeq;
    this.dynamicSolids.set(id, { ...rect });
    this.solidsCache = null;
    return () => {
      this.dynamicSolids.delete(id);
      this.solidsCache = null;
    };
  }

  private showVirgil(on: boolean, instant: boolean): void {
    const c = this.companion;
    const d = this.dante;
    if (!c || !d) return;
    if (!on) {
      c.setPresent(false);
      return;
    }
    if (!c.visible) {
      c.placeNear(d.x, d.y, d.heading.x >= 0 ? 1 : -1);
      c.setPresent(true);
      if (!instant) {
        c.actor.sprite.setAlpha(0);
        this.scene.tweens.add({ targets: c.actor.sprite, alpha: 1, duration: 900 });
      }
    }
  }

  private async bringPlayerTo(place: PlaceId, info: BeatRunInfo): Promise<void> {
    const def = this.tracker.get(place);
    const dante = this.dante;
    if (!def || !dante) return;
    const p = placeSpawn(def);
    const spot = findFreeSpot(p.x, p.y - 3, 10, 6, this.solids(), this.bounds);
    const tx = spot.x;
    const ty = spot.y + 3;
    const d = dist(dante.x, dante.y, tx, ty);
    if (info.autoplay || d < 4) {
      this.teleport(place);
      return;
    }
    const signal = anySignal([info.signal, this.abort.signal]);
    if (d > 220) {
      await this.camera.fade('black', 180);
      if (!signal.aborted) this.teleport(place);
      await this.camera.fade('clear', 220);
      return;
    }
    const unlock = this.lock('walk-to-place');
    try {
      await Promise.race([dante.actor.moveTo(tx, ty, { speed: 95, signal }), this.wait(2200, signal)]);
      dante.actor.stopWalk();
      if (!this.isPlayerIn(place)) this.teleport(place);
      this.companion?.trail.reset(dante.x, dante.y);
      this.updatePlaces();
    } finally {
      unlock();
    }
  }

  private firstSceneOfCanto(info: BeatRunInfo): boolean {
    const first = info.canto.scenes.find((s) => s.number > 0);
    return first?.id === info.scene.id;
  }

  private aheadPoint(): { x: number; y: number } | null {
    if (this.cameraAhead) return this.cameraAhead;
    const d = this.dante;
    if (!d) return null;
    const next = this.tracker.places.find((p) => p.x > d.x + 40 && !this.isPlayerIn(p.id));
    if (next) {
      const c = rectCenter(next);
      return { x: Math.min(c.x, d.x + 260), y: c.y };
    }
    return { x: d.x + 160, y: d.y - 16 };
  }

  private async runHook(phase: BeatHookPhase, info: BeatRunInfo, stmt: DoStmt | null, index: number): Promise<void> {
    const hook = this.module?.beatHooks?.[info.beat.id];
    const host = this.host;
    if (!hook || !host) return;
    const signal = anySignal([info.signal, this.abort.signal]);
    const ctx: BeatHookContext = {
      phase,
      canto: info.canto,
      scene: info.scene,
      beat: info.beat,
      stmt,
      doIndex: index,
      level: host,
      state: this.store.state,
      autoplay: info.autoplay,
      signal,
    };
    try {
      await Promise.race([Promise.resolve(hook(ctx)), untilAbort(signal)]);
    } catch (err) {
      this.log('error', `Beat hook ${info.beat.id} (${phase}) failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private extrasFor(host: LevelHost): WorldExtras {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const world = this;
    return {
      scene: this.scene,
      get palette() {
        return host.palette;
      },
      get dante() {
        return world.dante as Player;
      },
      get companion() {
        return world.companion as Companion;
      },
      get settings() {
        return world.store.settings;
      },
      get player() {
        return host.player;
      },
      now: () => this.time,
      playable: () => this.playable(),
      hurt: (amount, cause, from, knock) => this.hurt(amount, cause, from ?? null, knock),
      drain: (ups, dt, cause, floor) => this.drain(ups, dt, cause, floor),
      push: (vx, vy) => this.dante?.addForce(vx, vy),
      slow: (factor) => {
        this.frameSlow = Math.min(this.frameSlow, factor);
      },
      get stilledUntil() {
        return world.stilledUntilMs;
      },
      set stilledUntil(v: number) {
        world.stilledUntilMs = v;
      },
      stilled: () => this.time < this.stilledUntilMs,
      onVerse: (handler) => {
        this.verseHandlers.add(handler);
        return () => this.verseHandlers.delete(handler);
      },
      addInteractable: (def) => this.addInteractable(def),
      removeInteractable: (id) => {
        this.interactables.delete(id);
      },
      addSolid: (rect) => this.addDynamicSolid(rect),
      lock: (reason) => this.lock(reason),
      npcOf: (speaker) => host.npcObject(speaker),
      npcs: () => host.npcList,
      emitOnce: (event) => {
        if (this.emitted.has(event)) return false;
        this.emit(event);
        return true;
      },
      sfx: (name) => this.sfx(name),
      scriptedFaint: (opts) => this.scriptedFaint(opts ? { ...opts } : {}),
      setCameraAhead: (point) => {
        this.cameraAhead = point;
      },
      spawnActor: (opts) =>
        host.addNpcObject({
          id: opts.id,
          speaker: opts.speaker ?? opts.id.toUpperCase(),
          texture: opts.texture,
          x: opts.x,
          y: opts.y,
          talkable: false,
          ...(opts.facing ? { facing: opts.facing } : {}),
        }),
      placeBench: (x, y) => this.placeBench(x, y),
      setFog: (alpha) => this.ambience.setFog(alpha),
      setLookBack: (on, dir) => {
        this.lookBackOn = on;
        const d = this.dante;
        if (!d) return;
        if (dir) d.lookBackFacing = dir;
        if (on) d.setPose('lookBack');
        else if (d.pose === 'lookBack') d.clearPose();
      },
      lookBackHeld: () => this.input.current.lookBackHeld && this.playable(),
      movedThisFrame: () => this.movedFrame,
      solids: () => this.solids(),
    };
  }

  // =========================================================================
  // Misc
  // =========================================================================

  sfx(name: SfxName): void {
    try {
      this.audio.play(name);
    } catch {
      // Audio is optional.
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    try {
      this.bus.emit('debug:log', { level, message: `[world] ${message}` });
    } catch {
      // ignore
    }
  }

  onResume(): void {
    this.input.reset();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.unload();
    this.destroyed = true;
    for (const w of [...this.waits]) w();
    this.input.destroy();
  }

  /** Grace given for listening is the runner's; Resolve max for tests. */
  static readonly resolveMax = RESOURCES.resolveMax;
}

/** Unused-type guard so `Beat` stays imported for hook typing in editors. */
export type _BeatRef = Beat;
export type _NpcRef = Npc;
