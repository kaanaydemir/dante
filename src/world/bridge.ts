/**
 * The WorldBridge: the runner's handle on the playable world (WorldScene,
 * player, Virgil, level module, mechanics, camera).
 *
 * ENTRY-POINT STUB created by the architect. Owner: team D (world).
 * Replace the body; keep the export `createWorldBridge` (contract CreateWorldBridge).
 * Construction must not touch scenes (the game has not booted yet).
 * Gameplay signals go out on the bus as 'world:signal'; never call the runner.
 */

import { stubObject } from '../app/stub';
import type { CreateWorldBridge, WorldBridge } from '../runtime/contracts';

export const createWorldBridge: CreateWorldBridge = (deps) => {
  void deps;
  const noop = (): void => undefined;
  return stubObject<WorldBridge>('WorldBridge', {
    unloadCanto: noop,
    setPlayerControl: noop,
    checkpoint: noop,
    setVirgilTrust: noop,
    setArmed: noop,
    satisfy: noop,
    cancel: noop,
    canSatisfy: () => false,
    isSatisfied: () => false,
    teleport: () => false,
    places: () => [],
    debugInfo: () => ({ stub: true }),
  });
};
