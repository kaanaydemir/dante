/**
 * The World: everything that lives in WorldScene for one canto. Loads a level
 * (its LevelModule, else the generic level built from the script), runs the
 * player, Virgil, NPCs and mechanics every frame, publishes `world:signal`
 * (enter / exit a place, talk to someone, gameplay events), and carries out
 * what the runner asks through the WorldBridge (beats, DO lines, CAM verbs,
 * control, checkpoints, trust, armed beats).
 *
 * Robustness rules (docs/ENGINE.md §11): nothing here throws into a Phaser
 * frame or into the runner; every promise settles (level hooks are capped in
 * game time and abort with the run); a broken mechanic is switched off and
 * reported once.
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
} from '../runtime/contracts';
import type { CantoId, CantoScript, DoStmt, EventId, PlaceId, Scene, SpeakerId, Statement, Trigger } from '../story/types';
import { tryServices } from '../app/services';
import { ensureCantoTextures, generateTextures } from '../art/textures';
import { Player, FEET } from '../entities/player';
import { Companion } from '../entities/virgil';
import { getLevel } from '../levels/_framework/registry';
import { createGenericLevel, emptyLevel } from '../levels/_framework/generic';
import { placesOfBeat, planGenericLevel, virgilOnStage, type GenericLayout } from '../levels/_framework/layout';
import { Ambience } from './ambience';
import { WorldCamera } from './camera';
import { registerExtras, type Interactable, type InteractableDef, type MechanicHooks, type VerseCast, type WorldExtras } from './extras';
import { leadWaypoints } from './follow';
import { dist, findFreeSpot, rectCenter, type Vec } from './geometry';
import { WorldInput, type WorldInputState } from './input';
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
/** A level hook (one beat phase) never holds the story longer than this, in game time. */
const HOOK_CAP_MS = 5 * 60_000;
/** Prompts and glints are lights: they stay visible over the darkness. */
const PROMPT_DEPTH = DEPTH.darkness + 2;

const IDLE_INPUT: WorldInputState = {
  moveX: 0,
  moveY: 0,
  dashPressed: false,
  versePressed: false,
  interactPressed: false,
  lookBackHeld: false,
  anyMove: false,
};

/** One signal that aborts when any of `signals` does; `dispose` detaches the listeners. */
function linkSignals(signals: readonly (AbortSignal | undefined)[]): { signal: AbortSignal; dispose: () => void } {
  const ctl = new AbortController();
  const detach: Array<() => void> = [];
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ctl.abort();
      break;
    }
    const on = (): void => ctl.abort();
    s.addEventListener('abort', on, { once: true });
    detach.push(() => s.removeEventListener('abort', on));
  }
  return {
    signal: ctl.signal,
    dispose: () => {
      for (const d of detach.splice(0)) d();
    },
  };
}

function untilAbort(signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

/** Does a beat's script contain this CAM verb? */
function hasCam(lines: readonly Statement[], verb: 'engrave' | 'unengrave'): boolean {
  return lines.some((s) => s.type === 'cam' && s.verb === verb);
}

/** Does the canto's first playable beat open with the colour seeping back in (CAM unengrave)? */
function opensEngraved(script: CantoScript | null): boolean {
  if (!script) return false;
  const first = script.scenes.find((s) => s.number > 0);
  const beat = first?.beats[0];
  return beat ? hasCam(beat.lines, 'unengrave') : false;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class World implements LevelHostWorld {
  readonly tracker = new PlaceTracker();
  readonly camera: WorldCamera;
  readonly input: WorldInput;
  readonly bus: EventBus;
  readonly store: GameStateStore;
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
  private worldBounds: Rect = { x: 0, y: 0, w: 640, h: 360 };

  private runnerControl = false;
  private levelLock = false;
  private readonly locks = new Map<number, string>();
  private lockSeq = 0;
  private readonly captures = new Map<number, string>();
  private captureSeq = 0;
  private fainting = false;
  private rescuing = false;
  private rescueRule: { at: number; to: number } | null = null;
  /** 'auto': Virgil comes on stage where the script first brings him; 'manual': the level decides. */
  private virgilStaging: 'auto' | 'manual' = 'auto';
  /** Where the next `checkpoint()` puts its bench (a level's own stone), once. */
  private checkpointNext: Vec | null = null;
  /** The level's walkable spine (the generic path): Virgil leads along it. */
  private leadSpine: Vec[] | null = null;
  /** Virgil leads the way to the place the story waits for (off while a level directs him). */
  private leadingOn = true;
  private armed: readonly ArmedBeat[] = [];
  private trust: number = TRUST.start;
  private abort = new AbortController();
  /** Aborts when the current level is torn down (moments that outlive a beat end with it). */
  private levelAbort = new AbortController();
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
  private cameraAhead: Vec | null = null;
  private readonly benches: Array<{ x: number; y: number; sprite: Phaser.GameObjects.Image | null }> = [];
  private pendingSceneSync = false;
  private restoredCheckpoint = false;
  private caughtThisCanto = false;
  private lookBackOn = false;
  /** Play beats whose `enter:` place Dante has already walked through leave him where he is (`keepAhead`). */
  private keepAhead = false;
  /** Places Dante has stood in since the level loaded. */
  private readonly visited = new Set<PlaceId>();
  private movedFrame = false;
  private frameInput: WorldInputState = IDLE_INPUT;
  private loadToken = 0;
  private virgilPrompt: Phaser.GameObjects.Image | null = null;
  private virgilGlint: Phaser.GameObjects.Sprite | null = null;
  private interactPrompt: Phaser.GameObjects.Image | null = null;
  private faded = false;
  private destroyed = false;
  private readonly reported = new Set<string>();

  constructor(
    readonly scene: Phaser.Scene,
    deps: WorldDeps,
  ) {
    this.bus = deps.bus;
    this.store = deps.store;
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
      let timer: Phaser.Time.TimerEvent | null = null;
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
      try {
        timer = this.scene.time ? this.scene.time.delayedCall(Math.max(0, ms), finish) : null;
      } catch {
        timer = null;
      }
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
      this.log('error', `Could not plan a level for ${cantoId}: ${describe(err)}`);
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
    if (!ok) {
      // A broken level never stops the story: fall back to the generic level, then to an empty one.
      this.log('error', `Level ${module.id} failed to build; using a fallback level.`);
      this.teardownLevel();
      this.dante = new Player(this.scene, 0, 0);
      this.companion = new Companion(this.scene, 0, 0);
      this.companion.trust = this.trust;
      module = script && this.plan && registered ? createGenericLevel(script, this.plan) : emptyLevel(cantoId);
      ok = await this.build(module, script, cantoId);
      if (token !== this.loadToken) return;
      if (!ok && !module.id.startsWith('empty:')) {
        this.teardownLevel();
        this.dante = new Player(this.scene, 0, 0);
        this.companion = new Companion(this.scene, 0, 0);
        this.companion.trust = this.trust;
        module = emptyLevel(cantoId);
        await this.build(module, script, cantoId);
        if (token !== this.loadToken) return;
      }
    }
    this.generic = module !== registered;
    this.finishLoad();
  }

  private async build(module: LevelModule, script: CantoScript | null, cantoId: CantoId): Promise<boolean> {
    this.levelAbort.abort();
    this.levelAbort = new AbortController();
    const host = new LevelHost(this, cantoId, module.palette ?? this.palette, script);
    this.host = host;
    this.module = module;
    registerExtras(host, this.extrasFor(host));
    try {
      await module.build(host);
      return true;
    } catch (err) {
      this.log('error', `Level ${module.id} build failed: ${describe(err)}`);
      return false;
    }
  }

  private finishLoad(): void {
    const host = this.host;
    const dante = this.dante;
    const companion = this.companion;
    if (!host || !dante || !companion) return;
    const b = host.bounds ?? { w: 640, h: 360 };
    this.worldBounds = { x: 0, y: 0, w: b.w, h: b.h };
    this.camera.configure(host.palette, b.w, b.h);
    this.camera.clearFade();
    this.faded = false;
    this.ambience.configure(host.palette);

    const firstSpawn = [...host.spawns.values()][0];
    const firstPlace = this.tracker.places[0];
    let start: Vec = host.start ?? (firstSpawn ? { x: firstSpawn.x, y: firstSpawn.y } : firstPlace ? placeSpawn(firstPlace) : { x: b.w / 2, y: b.h / 2 });
    // Continue: wake at the saved checkpoint of this canto.
    const cp = this.store.state.position.checkpoint;
    this.restoredCheckpoint = false;
    if (cp && cp.canto === this.cantoId && cp.x > 0 && cp.y > 0 && cp.x < b.w && cp.y < b.h) {
      start = { x: cp.x, y: cp.y };
      this.restoredCheckpoint = true;
      this.placeBench(cp.x - 2, cp.y - 10);
    }
    const free = this.freeSpot(start.x, start.y);
    dante.teleport(free.x, free.y);
    companion.placeNear(dante.x, dante.y);
    // A level that stages Virgil itself has already shown or hidden him in build().
    if (this.virgilStaging === 'auto') companion.setPresent(this.virgilPresentAtStart());
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
    if (!this.plan || this.virgilStaging === 'manual') return true;
    if (this.plan.virgilNever) return false;
    // He joins at the scene in which the script first brings him (beginBeat updates it).
    return this.plan.virgilFrom === null;
  }

  private createPrompts(): void {
    const s = this.scene;
    this.virgilPrompt?.destroy();
    this.virgilGlint?.destroy();
    this.interactPrompt?.destroy();
    this.virgilPrompt = s.textures.exists('prop-key-e') ? s.add.image(0, 0, 'prop-key-e').setDepth(PROMPT_DEPTH).setVisible(false) : null;
    this.interactPrompt = s.textures.exists('prop-key-e') ? s.add.image(0, 0, 'prop-key-e').setDepth(PROMPT_DEPTH).setVisible(false) : null;
    this.virgilGlint = s.textures.exists('fx-glint') ? s.add.sprite(0, 0, 'fx-glint', '2').setDepth(PROMPT_DEPTH).setVisible(false) : null;
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
    this.levelAbort.abort();
    try {
      this.module?.destroy?.();
    } catch (err) {
      this.log('warn', `Level destroy failed: ${describe(err)}`);
    }
    try {
      this.host?.destroy();
    } catch {
      // keep tearing down
    }
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
    this.captures.clear();
    this.fainting = false;
    this.rescuing = false;
    this.rescueRule = null;
    this.virgilStaging = 'auto';
    this.leadSpine = null;
    this.leadingOn = true;
    this.checkpointNext = null;
    this.lookBackOn = false;
    this.keepAhead = false;
    this.visited.clear();
  }

  // =========================================================================
  // Runner-facing operations (through the bridge)
  // =========================================================================

  async beginBeat(info: BeatRunInfo): Promise<void> {
    if (!this.host || !this.dante || info.canto.id !== this.cantoId) return;
    this.levelLock = false;
    this.locks.clear();
    this.captures.clear();
    this.lookBackOn = false;
    if (this.dante.pose === 'lookBack') this.dante.clearPose();
    const beat = info.beat;

    if (this.virgilStaging === 'auto' && this.plan && this.companion) {
      const on = virgilOnStage(this.plan, beat.id);
      if (on !== this.companion.visible) this.showVirgil(on, info.autoplay);
    }

    if (this.pendingSceneSync) {
      this.pendingSceneSync = false;
      const ahead = this.checkpointAhead(info.scene);
      if (!beat.place && info.scene.number > 0 && (!this.restoredCheckpoint || ahead)) {
        if (this.firstSceneOfCanto(info)) {
          if (ahead) this.toCantoStart();
        } else {
          const home = this.plan?.sceneHome[info.scene.id] ?? null;
          if (home && this.tracker.has(home) && !this.isPlayerIn(home)) this.teleport(home);
        }
      }
    }

    if (beat.place && this.tracker.has(beat.place) && !this.isPlayerIn(beat.place) && !this.walkedThrough(beat)) {
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
    this.captures.clear();
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
    this.syncSceneOnArm();
    this.markers.set(armed, (id) => this.tracker.get(id));
    this.applyArmed();
  }

  /**
   * A jump (or a continue without a checkpoint in this canto) that lands on a
   * scene whose first beat waits for Dante somewhere (`enter:` / `talk:`):
   * he starts at that scene's place instead of the canto's first one.
   */
  private syncSceneOnArm(): void {
    if (!this.pendingSceneSync || !this.dante || !this.plan || !this.script) return;
    const cursor = this.armed.find((a) => a.cursor);
    if (!cursor || cursor.nextScene) return;
    const t = cursor.trigger;
    if (t.kind !== 'enter' && t.kind !== 'talk') return;
    const scene = this.script.scenes.find((s) => s.id === cursor.scene);
    if (!scene || scene.beats[0]?.id !== cursor.beat) return;
    // A continue wakes at its checkpoint, unless that lies beyond everything this scene uses (a jump back).
    const ahead = this.checkpointAhead(scene);
    if (this.restoredCheckpoint && !ahead) return;
    this.pendingSceneSync = false;
    const first = this.script.scenes.find((s) => s.number > 0);
    if (first?.id === scene.id) {
      if (ahead) this.toCantoStart();
      return;
    }
    const home = this.plan.sceneHome[scene.id] ?? (t.kind === 'enter' ? t.place : null);
    if (home && this.tracker.has(home) && !this.isPlayerIn(home)) this.teleport(home);
  }

  /**
   * The restored checkpoint lies past every place the scene uses (levels run
   * left to right): the story was sent back (a jump), so the checkpoint is not
   * where this scene can be played from.
   */
  private checkpointAhead(scene: Scene): boolean {
    const dante = this.dante;
    if (!this.restoredCheckpoint || !dante) return false;
    let right = Number.NEGATIVE_INFINITY;
    for (const beat of scene.beats) {
      for (const id of placesOfBeat(beat)) {
        const p = this.tracker.get(id);
        if (p) right = Math.max(right, p.x + p.w);
      }
    }
    return Number.isFinite(right) && dante.x > right + 16;
  }

  /** Dante back at the canto's start (beside Virgil). */
  private toCantoStart(): void {
    const dante = this.dante;
    const start = this.host?.start;
    if (!dante || !start) return;
    const spot = this.freeSpot(start.x, start.y);
    dante.teleport(spot.x, spot.y);
    this.companion?.placeNear(dante.x, dante.y);
    this.camera.follow(dante.actor);
    this.camera.cam.centerOn(dante.x, dante.y - 16);
    this.updatePlaces();
  }

  private applyArmed(): void {
    const talk = new Set<SpeakerId>();
    for (const a of this.armed) if (a.trigger.kind === 'talk') talk.add(a.trigger.speaker);
    for (const npc of this.host?.npcList ?? []) npc.armed = talk.has(npc.speaker);
    if (talk.has('VIRGIL') && this.companion && !this.companion.visible) this.showVirgil(true, false);
    this.updateLead();
  }

  /**
   * While the story waits for Dante to reach a place (the cursor is `enter:`),
   * Virgil walks ahead to it and waits there for him ("Vergilius önde yürür").
   */
  private updateLead(): void {
    const c = this.companion;
    if (!c) return;
    const cursor = this.armed.find((a) => a.cursor);
    const t = cursor?.trigger;
    if (!this.leadingOn || !c.visible || !t || t.kind !== 'enter' || this.armed.some((a) => a.trigger.kind === 'talk' && a.trigger.speaker === 'VIRGIL')) {
      if (c.leading) c.lead(null);
      return;
    }
    const def = this.tracker.get(t.place);
    if (!def || this.isPlayerIn(def.id)) {
      if (c.leading) c.lead(null);
      return;
    }
    const spawn = placeSpawn(def);
    const dest = this.freeSpot(spawn.x + 14, spawn.y - 6);
    c.lead(leadWaypoints({ x: c.actor.x, y: c.actor.y }, dest, this.leadSpine));
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
        return (this.host?.mechanicList ?? []).some((m) => m.enabled && ((m as MechanicHooks).emits?.includes(t.id) ?? false));
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
            const spot = this.freeSpot(npc.x - 18, npc.y);
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
    const spot = this.freeSpot(p.x, p.y);
    this.dante.teleport(spot.x, spot.y);
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
    this.captures.clear();
    this.dante?.actor.stopWalk();
    this.companion?.actor.stopWalk();
    for (const n of this.host?.npcList ?? []) n.actor.stopWalk();
  }

  checkpoint(): void {
    if (!this.dante || !this.cantoId) return;
    const where = this.checkpointNext;
    this.checkpointNext = null;
    const x = Math.round(where ? where.x : this.dante.x);
    const y = Math.round(where ? where.y : this.dante.y);
    const bench = this.benches.find((b) => dist(b.x, b.y, x, y) < (where ? 40 : 72)) ?? this.placeBench(where ? x : x - 22, where ? y : y - 8);
    const cp: CheckpointRef = { canto: this.cantoId, place: this.tracker.current()[0] ?? null, x: bench.x + 4, y: bench.y + 12 };
    this.store.setPosition({ checkpoint: cp });
    this.bus.emit('checkpoint:set', { checkpoint: cp });
    // A Virgil the level is directing stays where it put him.
    if (this.companion && this.companion.mode !== 'hold') this.companion.waitAt(bench.x, bench.y + 2);
  }

  /** A stone bench: Virgil waits there; E lets Dante rest (Resolve refills). */
  placeBench(x: number, y: number): { x: number; y: number } {
    const spot = findFreeSpot(x, y - 3, 24, 6, this.solids(), this.worldBounds);
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
    try {
      dante.teleport(bench.x - 4, bench.y + 1);
      dante.setPose('sit');
      this.store.refillResolve();
      await this.wait(1300, this.abort.signal);
    } finally {
      if (this.dante === dante) {
        dante.clearPose();
        const off = this.freeSpot(bench.x - 4, bench.y + 10);
        dante.teleport(off.x, off.y);
      }
      unlock();
    }
  }

  debugInfo(): Record<string, unknown> {
    return {
      canto: this.cantoId,
      level: this.module?.id ?? null,
      generic: this.generic,
      bounds: this.worldBounds,
      player: this.dante ? { x: Math.round(this.dante.x), y: Math.round(this.dante.y), pose: this.dante.pose } : null,
      virgil: this.companion
        ? { x: Math.round(this.companion.actor.x), y: Math.round(this.companion.actor.y), mode: this.companion.mode, visible: this.companion.visible }
        : null,
      inside: this.tracker.current(),
      places: this.tracker.places.map((p) => p.id),
      npcs: (this.host?.npcList ?? []).map((n) => `${n.speaker}${n.talkable ? '' : '(silent)'}`),
      control: {
        runner: this.runnerControl,
        level: !this.levelLock,
        locks: [...this.locks.values()],
        captures: [...this.captures.values()],
        fainting: this.fainting,
        rescuing: this.rescuing,
        playable: this.playable(),
      },
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
    this.frameInput = input;
    const dante = this.dante;
    const host = this.host;
    if (!dante || !host || !this.companion) {
      this.camera.update();
      return;
    }
    this.interactCooldown = Math.max(0, this.interactCooldown - dt);
    this.caster.update(dt);
    const playable = this.playable();
    const busy = this.presenterBusy();
    // Dante acts on input only while playable, no blocking text is open and no mechanic holds the input.
    const steer = playable && !busy && this.captures.size === 0;
    this.frameSlow = 1;

    // Mechanics first: they push, slow and hurt before Dante moves.
    for (const m of host.mechanicList) {
      if (!m.enabled) continue;
      try {
        m.update(dt, this.time);
      } catch (err) {
        m.enabled = false;
        this.reportError(`Mechanic ${m.id} failed and was switched off: ${describe(err)}`);
      }
    }
    try {
      this.module?.update?.(dt, host);
    } catch (err) {
      this.reportError(`Level ${this.module?.id ?? '?'} update failed: ${describe(err)}`);
    }

    // Look back (bible §7.0): holding the key turns Dante around while he has control.
    if (steer && input.lookBackHeld && !input.anyMove && dante.pose === 'none') dante.setPose('lookBack');
    else if ((!input.lookBackHeld || !steer) && dante.pose === 'lookBack' && !this.lookBackOn) dante.clearPose();

    const resolve = this.store.state.resolve;
    const lowResolve = resolve <= 1.5 ? 0.72 : 1;
    const moved = dante.update(
      dt,
      steer ? input : null,
      // Without control, wind and crowds no longer move him (only knocks already under way finish).
      { control: steer, solids: this.solids(), bounds: this.worldBounds, speedFactor: Math.min(this.frameSlow, lowResolve), external: playable },
      () => this.sfx('dash'),
    );
    this.movedFrame = moved > 0.15 || dante.dashing;

    if (steer) {
      if (input.versePressed) this.castVerse();
      if (input.interactPressed && this.interactCooldown <= 0) this.interact();
    }

    this.companion.update(dt, { x: dante.x, y: dante.y, heading: dante.heading });
    // Only the one E would speak to shows the key; the others keep their glint.
    const talkTarget = steer ? this.nearestTalkable() : null;
    for (const npc of host.npcList) {
      try {
        npc.update(dt, talkTarget?.who === npc);
      } catch (err) {
        npc.behaviour = null;
        this.reportError(`NPC ${npc.speaker} update failed: ${describe(err)}`);
      }
    }
    this.updatePrompts();
    this.updatePlaces();
    this.camera.update();
    const view = this.camera.cam.worldView;
    this.ambience.update(dt, view);
    this.markers.update(dt, view, (id) => this.isPlayerIn(id));

    const r = this.store.state.resolve;
    if (this.rescueRule && !this.rescuing && !this.fainting && playable && r <= this.rescueRule.at + 1e-6) void this.rescue();
    else if (!this.fainting && !this.rescuing && r <= 0.0001 && playable) void this.faint('resolve');
  }

  /** Dante can act: the runner gave control, no level lock, no cinematic lock, no faint. */
  playable(): boolean {
    return this.runnerControl && !this.levelLock && this.locks.size === 0 && !this.fainting && !this.rescuing && this.dante !== null;
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
    for (const id of tr.entered) this.visited.add(id);
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
      this.interactPrompt.setVisible(Boolean(it) && !it?.silent && !talkTarget && this.playable() && this.captures.size === 0);
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

  /**
   * Whom E speaks to: the nearest figure in reach whose talk the story waits
   * for, else the nearest talkable one. Figures standing close together (the
   * great spirits of Limbo) never hide the one the story waits for behind one
   * already heard.
   */
  private nearestTalkable(): { speaker: SpeakerId; x: number; y: number; who: object } | null {
    const dante = this.dante;
    if (!dante) return null;
    let best: { speaker: SpeakerId; x: number; y: number; who: object; d: number; armed: boolean } | null = null;
    const consider = (speaker: SpeakerId, x: number, y: number, who: object, armedOnly: boolean): void => {
      const d = dist(x, y, dante.x, dante.y);
      if (d > TALK_REACH * 1.25) return;
      const armed = this.armed.some((a) => a.trigger.kind === 'talk' && a.trigger.speaker === speaker);
      if (armedOnly && !armed) return;
      if (!best || (armed && !best.armed) || (armed === best.armed && d < best.d)) best = { speaker, x, y, who, d, armed };
    };
    if (this.companion?.visible) consider('VIRGIL', this.companion.actor.x, this.companion.actor.y, this.companion, true);
    for (const n of this.host?.npcList ?? []) if (n.talkable && n.actor.sprite.visible) consider(n.speaker, n.x, n.y, n, false);
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
        this.reportError(`Interaction ${it.id} failed: ${describe(err)}`);
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
        } catch (err) {
          this.reportError(`Mechanic ${m.id} onVerse failed: ${describe(err)}`);
        }
      }
    }
    for (const fn of [...this.verseHandlers]) {
      try {
        fn(cast);
      } catch (err) {
        this.reportError(`Verse handler failed: ${describe(err)}`);
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
        if (this.dante && img.active) img.setPosition(this.dante.x, this.dante.y - 14);
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

  /** Bible §7.3 / §7.5: at the bottom of his strength Dante sinks to his knees and Virgil lifts him. */
  private async rescue(): Promise<void> {
    const dante = this.dante;
    const companion = this.companion;
    const rule = this.rescueRule;
    if (!dante || !companion || !rule || this.rescuing) return;
    this.rescuing = true;
    try {
      dante.setPose('sit');
      this.sfx('hurt');
      if (companion.visible && companion.mode !== 'hold') {
        // Virgil comes and lifts him.
        const spot = this.freeSpot(dante.x + 14, dante.y + 1);
        await Promise.race([companion.actor.moveTo(spot.x, spot.y, { speed: 120, signal: this.abort.signal }), this.wait(1800, this.abort.signal)]);
        if (this.dante !== dante) return;
        companion.actor.stopWalk();
        companion.actor.faceToward(dante.x, dante.y);
        companion.gesture(1);
        await this.wait(600, this.abort.signal);
      } else {
        // Alone (Canto I before the shade comes): he gathers himself.
        await this.wait(1400, this.abort.signal);
      }
      const r = this.store.state.resolve;
      if (r < rule.to) this.store.adjustResolve(rule.to - r, 'virgil');
    } finally {
      if (this.dante === dante) {
        dante.clearPose();
        dante.grantInvulnerability(1500);
      }
      this.rescuing = false;
    }
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
    try {
      dante.setPose('faint');
      this.sfx('faint');
      this.bus.emit('player:faint', { cause });
      this.store.recordFaint();
      await this.camera.fade('black', TIMINGS.faintFadeMs);
      if (this.dante !== dante) return;
      const cp = this.store.state.position.checkpoint;
      const here = cp && cp.canto === this.cantoId ? { x: cp.x, y: cp.y } : null;
      const start = here ?? this.host?.start ?? placeSpawn(this.tracker.places[0] ?? { id: 'x', x: 32, y: 160, w: 32, h: 32 });
      const spot = this.freeSpot(start.x, start.y);
      dante.teleport(spot.x, spot.y);
      companion.placeNear(dante.x, dante.y);
      this.camera.cam.centerOn(dante.x, dante.y - 16);
      this.store.refillResolve();
      this.bus.emit('player:respawn', { checkpoint: here ? (cp as CheckpointRef) : null });
      for (const m of this.host?.mechanicList ?? []) {
        const h = m as unknown as MechanicHooks;
        if (typeof h.onRespawn === 'function') {
          try {
            h.onRespawn();
          } catch (err) {
            this.reportError(`Mechanic ${m.id} onRespawn failed: ${describe(err)}`);
          }
        }
      }
      this.updatePlaces();
      await this.wait(250, signal);
      await this.camera.fade('clear', TIMINGS.respawnMs);
    } finally {
      if (this.dante === dante) {
        dante.clearPose();
        dante.grantInvulnerability(1500);
        if (this.store.state.resolve <= 0.0001) this.store.refillResolve();
        this.camera.clearFade();
      }
      this.fainting = false;
    }
  }

  /** A scripted faint (the quake, Francesca): Dante falls; the world goes dark behind the presenter's white-out. */
  async scriptedFaint(opts: { color?: 'white' | 'red' | 'black'; ms?: number; signal?: AbortSignal } = {}): Promise<void> {
    const dante = this.dante;
    if (!dante) return;
    const unlock = this.lock('faint');
    const linked = linkSignals([opts.signal, this.abort.signal]);
    try {
      dante.setPose('faint');
      this.sfx('faint');
      this.faded = true;
      const colour = opts.color === 'red' ? 'red' : opts.color === 'white' ? 'white' : 'black';
      await Promise.race([this.camera.fade(colour, opts.ms ?? TIMINGS.whiteOutMs), untilAbort(linked.signal)]);
    } finally {
      linked.dispose();
      unlock();
    }
  }

  lock(reason: string): () => void {
    const id = ++this.lockSeq;
    this.locks.set(id, reason);
    return () => {
      this.locks.delete(id);
    };
  }

  /** A mechanic takes the input (a menu in the world); Dante stands still meanwhile. */
  captureInput(owner: string): () => void {
    const id = ++this.captureSeq;
    this.captures.set(id, owner);
    this.input.reset();
    return () => {
      if (this.captures.delete(id)) this.interactCooldown = Math.max(this.interactCooldown, 250);
    };
  }

  addInteractable(def: InteractableDef): Interactable {
    const it: Interactable = { ...def, enabled: true, silent: def.silent === true };
    this.interactables.set(def.id, it);
    return it;
  }

  /** Static solids of the level plus the runtime ones. */
  solids(): Rect[] {
    if (!this.solidsCache) this.solidsCache = [...(this.host?.solidList ?? []), ...this.dynamicSolids.values()];
    return this.solidsCache;
  }

  /** A free spot for Dante's feet near (x, y) (feet point convention: the actor's point). */
  freeSpot(x: number, y: number): Vec {
    const p = findFreeSpot(x, y - FEET.h / 2, FEET.w + 2, FEET.h + 2, this.solids(), this.worldBounds);
    return { x: p.x, y: p.y + FEET.h / 2 };
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
      const spot = this.freeSpot(c.actor.x, c.actor.y);
      c.actor.teleport(spot.x, spot.y);
      c.setPresent(true);
      if (!instant) {
        c.actor.sprite.setAlpha(0);
        this.scene.tweens.add({ targets: c.actor.sprite, alpha: 1, duration: 900 });
      }
      this.updateLead();
    }
  }

  private async bringPlayerTo(place: PlaceId, info: BeatRunInfo): Promise<void> {
    const def = this.tracker.get(place);
    const dante = this.dante;
    if (!def || !dante) return;
    const p = placeSpawn(def);
    const spot = this.freeSpot(p.x, p.y);
    const d = dist(dante.x, dante.y, spot.x, spot.y);
    if (info.autoplay || d < 4) {
      this.teleport(place);
      return;
    }
    const linked = linkSignals([info.signal, this.abort.signal]);
    const signal = linked.signal;
    try {
      if (d > 220) {
        await this.camera.fade('black', 180);
        if (!signal.aborted) this.teleport(place);
        await this.camera.fade('clear', 220);
        return;
      }
      const unlock = this.lock('walk-to-place');
      try {
        await Promise.race([dante.actor.moveTo(spot.x, spot.y, { speed: 95, signal }), this.wait(2200, signal)]);
        dante.actor.stopWalk();
        if (!this.isPlayerIn(place)) this.teleport(place);
        this.companion?.trail.reset(dante.x, dante.y);
        this.updatePlaces();
      } finally {
        unlock();
      }
    } finally {
      linked.dispose();
    }
  }

  /**
   * A play beat whose `enter:` place Dante has already crossed while an
   * earlier beat was still being read (the signal waited its turn): with
   * `keepAhead`, he is not pulled back over ground he has already won.
   */
  private walkedThrough(beat: BeatRunInfo['beat']): boolean {
    const t = beat.trigger;
    return this.keepAhead && beat.mode === 'play' && t.kind === 'enter' && t.place === beat.place && this.visited.has(t.place);
  }

  private firstSceneOfCanto(info: BeatRunInfo): boolean {
    const first = info.canto.scenes.find((s) => s.number > 0);
    return first?.id === info.scene.id;
  }

  private aheadPoint(): Vec | null {
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
    const linked = linkSignals([info.signal, this.abort.signal]);
    const signal = linked.signal;
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
    let capped = false;
    try {
      await Promise.race([
        Promise.resolve(hook(ctx)),
        untilAbort(signal),
        this.wait(HOOK_CAP_MS, signal).then(() => {
          capped = !signal.aborted;
        }),
      ]);
      if (capped) this.log('error', `Beat hook ${info.beat.id} (${phase}) ran past ${HOOK_CAP_MS / 1000} s; the story goes on.`);
    } catch (err) {
      this.log('error', `Beat hook ${info.beat.id} (${phase}) failed: ${describe(err)}`);
    } finally {
      linked.dispose();
    }
  }

  private extrasFor(host: LevelHost): WorldExtras {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const world = this;
    const levelSignal = this.levelAbort.signal;
    return {
      scene: this.scene,
      levelSignal,
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
      lookBackHeld: () => this.frameInput.lookBackHeld && this.playable(),
      movedThisFrame: () => this.movedFrame,
      solids: () => this.solids(),
      input: () => (this.playable() ? this.frameInput : IDLE_INPUT),
      captureInput: (owner) => this.captureInput(owner),
      bounds: () => ({ ...this.worldBounds }),
      freeSpot: (x, y) => this.freeSpot(x, y),
      setRescue: (rule) => {
        this.rescueRule = rule ? { at: Math.max(0, rule.at), to: Math.max(rule.at + 0.5, rule.to) } : null;
      },
      presenterBusy: () => this.presenterBusy(),
      setVirgilStaging: (mode) => {
        this.virgilStaging = mode;
      },
      setLeadPath: (points) => {
        this.leadSpine = points ? points.map((p) => ({ x: p.x, y: p.y })) : null;
      },
      checkpointAt: (x, y) => {
        this.checkpointNext = { x, y };
      },
      setVirgilLeads: (on) => {
        this.leadingOn = on;
        if (!on) this.companion?.lead(null);
        else this.updateLead();
      },
      setKeepAhead: (on) => {
        this.keepAhead = on;
      },
      showVirgil: (on, instant) => this.showVirgil(on, instant ?? false),
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

  /** Report an error once (the update loop must never flood the log). */
  reportError(message: string): void {
    if (this.reported.has(message) || this.reported.size > 50) return;
    this.reported.add(message);
    this.log('error', message);
  }

  /** True once the World has been destroyed (its scene shut down). */
  get destroyedFlag(): boolean {
    return this.destroyed;
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

  /** Resolve max, for tests and tools. */
  static readonly resolveMax = RESOURCES.resolveMax;
}
