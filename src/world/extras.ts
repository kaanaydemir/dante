/**
 * The world's extended API for levels and mechanics, beyond the frozen
 * LevelRuntime contract: hurting and pushing Dante, fear drain, verse casts,
 * interactables, runtime solids, control locks, Virgil's modes, prompts.
 *
 *   import { worldExtras } from '../../world/extras';
 *   const w = worldExtras(ctx.level);   // inside a beat hook or a mechanic
 *   w?.hurt(1, 'lion', lion);
 *
 * Owner: team D (world). (Types and a registry only; the World implements it.)
 */

import type * as Phaser from 'phaser';
import type { CantoPalette } from '../config';
import type { ActorHandle, LevelRuntime, Rect, Settings, SfxName } from '../runtime/contracts';
import type { EventId, WordCategory, WordName } from '../story/types';
import type { Companion } from '../entities/virgil';
import type { Npc } from '../entities/npc';
import type { Player } from '../entities/player';

/** One step of a cast verse (a tercet, or the coda's strengthened closing). */
export interface VerseCast {
  readonly category: WordCategory;
  readonly word: WordName;
  readonly kind: 'tercet' | 'coda';
  /** 1 + same-category outer words, times the chain's rising bonus (or the coda multiplier). */
  readonly power: number;
  readonly index: number;
  /** Where Dante stood. */
  readonly x: number;
  readonly y: number;
  /** Unit vector Dante faced. */
  readonly dir: { readonly x: number; readonly y: number };
}

/** Something Dante can use with E (a bench, a stone, a book on a lectern). */
export interface InteractableDef {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Reach in px from Dante's feet (default 24). */
  readonly radius?: number;
  /** Key cap shown when Dante is in reach (default 'e'). */
  readonly key?: 'e' | 'r' | 'j' | 'q';
  onInteract(): void;
}

export interface Interactable extends InteractableDef {
  enabled: boolean;
}

/** Mechanics may implement these optional hooks (duck-typed). */
export interface MechanicHooks {
  /** A verse was cast. */
  onVerse?(cast: VerseCast): void;
  /** Dante woke at a checkpoint after a faint. */
  onRespawn?(): void;
  /** Event ids this mechanic can emit (the world then reports canSatisfy(event) = true). */
  readonly emits?: readonly EventId[];
}

export interface WorldExtras {
  readonly scene: Phaser.Scene;
  readonly palette: CantoPalette;
  readonly dante: Player;
  readonly companion: Companion;
  readonly settings: Settings;
  /** Scene time in ms (pauses with the Book). */
  now(): number;
  /** Dante can act: the runner gave control, no lock, no faint, no blocking text. */
  playable(): boolean;
  /** Hurt Dante (Resolve units). Respects the dash's i-frames, the Ward shield and easy mode. True if it hit. */
  hurt(amount: number, cause: string, from?: { x: number; y: number } | null, knock?: number): boolean;
  /** Continuous drain (fear), units per second over `dtMs`; never below `floor` (default 0). */
  drain(unitsPerSecond: number, dtMs: number, cause: string, floor?: number): void;
  /** Push Dante this frame (px/s). */
  push(vx: number, vy: number): void;
  /** Slow Dante this frame (the slowest factor wins). */
  slow(factor: number): void;
  /** Hazards are stilled by a Still verse until this time (scene ms). */
  stilledUntil: number;
  stilled(): boolean;
  /** Listen to verse casts. Returns an unsubscribe function. */
  onVerse(handler: (cast: VerseCast) => void): () => void;
  addInteractable(def: InteractableDef): Interactable;
  removeInteractable(id: string): void;
  /** A solid that can be removed later (a door, the walk-on-water stream). Returns its remover. */
  addSolid(rect: Rect): () => void;
  /** Lock player control for a cinematic moment. Returns the unlock (locks also clear at every beat start). */
  lock(reason: string): () => void;
  /** The NPC object (with behaviours and prompts) of a speaker. */
  npcOf(speaker: string): Npc | null;
  /** Every NPC of the level. */
  npcs(): readonly Npc[];
  /** Emit a gameplay event once per canto (repeats are ignored). Returns true the first time. */
  emitOnce(event: EventId): boolean;
  /** Play a sound through the audio service (no-op when unavailable). */
  sfx(name: SfxName): void;
  /** The scripted faint (III s7, V s7): Dante falls; the screen fades to colour then black. */
  scriptedFaint(opts?: { readonly color?: 'white' | 'red' | 'black'; readonly ms?: number; readonly signal?: AbortSignal }): Promise<void>;
  /** Where the camera pans when a CAM line looks "ahead". */
  setCameraAhead(point: { x: number; y: number } | null): void;
  /** Spawn an extra actor (beasts, crowds) that the level owns. */
  spawnActor(opts: { id: string; speaker?: string | null; texture: string; x: number; y: number; facing?: 'left' | 'right' | 'up' | 'down' }): Npc;
  /** A stone bench (a future checkpoint; Dante can rest on it with E). Returns its position. */
  placeBench(x: number, y: number): { x: number; y: number };
  /** Fog density over the level (0 = clear). */
  setFog(alpha: number): void;
  /** The look-back pose (bible §7.0): Dante faces `dir` while held. */
  setLookBack(on: boolean, dir?: 'left' | 'right' | 'up' | 'down'): void;
  /** Is the look-back key held this frame? */
  lookBackHeld(): boolean;
  /** Did Dante move or dash this frame? */
  movedThisFrame(): boolean;
  /** Solid rectangles (static and runtime). */
  solids(): readonly Rect[];
  /** The player's actor handle (same as LevelRuntime.player). */
  readonly player: ActorHandle;
}

const registry = new WeakMap<object, WorldExtras>();

export function registerExtras(level: LevelRuntime, extras: WorldExtras): void {
  registry.set(level, extras);
}

/** The world's extended API for a level runtime (null outside the real world, e.g. in tests). */
export function worldExtras(level: LevelRuntime | null | undefined): WorldExtras | null {
  if (!level) return null;
  return registry.get(level) ?? null;
}
