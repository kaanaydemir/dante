/**
 * LevelHost: what a level (LevelModule or the generic fallback) builds into
 * and talks to at runtime. Implements the contract's LevelBuildContext (and so
 * LevelRuntime): bounds, named places, spawns, NPCs, solids and mechanics.
 *
 * Owner: team D (world).
 */

import type * as Phaser from 'phaser';
import type { CantoPalette } from '../config';
import type {
  ActorHandle,
  EventBus,
  GameStateStore,
  LevelBuildContext,
  Mechanic,
  NpcDef,
  PlaceDef,
  Rect,
  SpawnPoint,
  WorldCameraApi,
} from '../runtime/contracts';
import type { CantoId, CantoScript, EventId, MechanicName, PlaceId, SpeakerId } from '../story/types';
import { createLibraryMechanic } from '../mechanics/index';
import { npcTextureKey } from '../art/textures';
import { Npc } from '../entities/npc';
import type { PlaceTracker } from './places';

/** What the host needs from the world. */
export interface LevelHostWorld {
  readonly scene: Phaser.Scene;
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly tracker: PlaceTracker;
  readonly camera: WorldCameraApi;
  readonly player: ActorHandle;
  readonly virgil: ActorHandle;
  emit(event: EventId): void;
  wait(ms: number, signal?: AbortSignal): Promise<void>;
  setLevelControl(enabled: boolean): void;
  isPlayerIn(id: PlaceId): boolean;
  /** A solid list changed (rebuild caches). */
  solidsChanged(): void;
}

export class LevelHost implements LevelBuildContext {
  readonly scene: Phaser.Scene;
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly camera: WorldCameraApi;
  readonly player: ActorHandle;
  readonly virgil: ActorHandle | null;
  bounds: { w: number; h: number } | null = null;
  start: { x: number; y: number } | null = null;
  readonly spawns = new Map<string, SpawnPoint>();
  readonly npcList: Npc[] = [];
  readonly solidList: Rect[] = [];
  readonly mechanicList: Mechanic[] = [];
  private npcCounter = 0;

  constructor(
    private readonly world: LevelHostWorld,
    readonly cantoId: CantoId,
    readonly palette: CantoPalette,
    readonly script: CantoScript | null,
  ) {
    this.scene = world.scene;
    this.bus = world.bus;
    this.store = world.store;
    this.camera = world.camera;
    this.player = world.player;
    this.virgil = world.virgil;
  }

  // -------------------------------------------------------------------------
  // LevelRuntime
  // -------------------------------------------------------------------------

  npc(speaker: SpeakerId): ActorHandle | null {
    if (speaker === 'VIRGIL') return this.virgil;
    if (speaker === 'DANTE') return this.player;
    return this.npcList.find((n) => n.speaker === speaker)?.actor ?? null;
  }

  npcObject(speaker: SpeakerId): Npc | null {
    return this.npcList.find((n) => n.speaker === speaker) ?? null;
  }

  place(id: PlaceId): PlaceDef | null {
    return this.world.tracker.get(id);
  }

  isPlayerIn(id: PlaceId): boolean {
    return this.world.isPlayerIn(id);
  }

  emit(event: EventId): void {
    this.world.emit(event);
  }

  wait(ms: number, signal?: AbortSignal): Promise<void> {
    return this.world.wait(ms, signal);
  }

  setPlayerControl(enabled: boolean): void {
    this.world.setLevelControl(enabled);
  }

  mechanic<M extends Mechanic = Mechanic>(id: string): M | null {
    const byId = this.mechanicList.find((m) => m.id === id);
    if (byId) return byId as M;
    const byName = this.mechanicList.find((m) => m.name === id);
    return (byName as M | undefined) ?? null;
  }

  // -------------------------------------------------------------------------
  // LevelBuildContext
  // -------------------------------------------------------------------------

  setBounds(width: number, height: number): void {
    this.bounds = { w: Math.max(16, Math.round(width)), h: Math.max(16, Math.round(height)) };
  }

  addPlace(def: PlaceDef): void {
    this.world.tracker.add(def);
  }

  addSpawn(def: SpawnPoint): void {
    this.spawns.set(def.id, def);
  }

  setStart(x: number, y: number): void {
    this.start = { x, y };
  }

  addNpc(def: NpcDef): ActorHandle {
    return this.addNpcObject(def).actor;
  }

  addNpcObject(def: NpcDef & { readonly id?: string }): Npc {
    this.npcCounter += 1;
    const texture = npcTextureKey(this.scene, def.speaker, def.texture);
    const npc = new Npc(this.scene, {
      id: def.id ?? `npc-${def.speaker.toLowerCase()}-${this.npcCounter}`,
      speaker: def.speaker,
      texture,
      x: def.x,
      y: def.y,
      talkable: def.talkable ?? true,
      ...(def.facing ? { facing: def.facing } : {}),
    });
    this.npcList.push(npc);
    return npc;
  }

  removeNpc(npc: Npc): void {
    const i = this.npcList.indexOf(npc);
    if (i >= 0) this.npcList.splice(i, 1);
    npc.destroy();
  }

  addSolid(rect: Rect): void {
    this.solidList.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
    this.world.solidsChanged();
  }

  addMechanic<M extends Mechanic>(mechanic: M): M {
    this.mechanicList.push(mechanic);
    return mechanic;
  }

  createMechanic<C extends object>(name: MechanicName, config: C): Mechanic | null {
    const m = createLibraryMechanic(name, { level: this }, config as unknown as Record<string, unknown>);
    if (m) this.addMechanic(m);
    return m;
  }

  // -------------------------------------------------------------------------
  // Teardown
  // -------------------------------------------------------------------------

  destroy(): void {
    for (const m of this.mechanicList.splice(0)) {
      try {
        m.destroy();
      } catch {
        // ignore
      }
    }
    for (const n of this.npcList.splice(0)) n.destroy();
    this.solidList.length = 0;
  }
}
