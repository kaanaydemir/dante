/**
 * The mechanics library registry (bible §7.0, docs/ENGINE.md §8.2): one
 * factory per library mechanic name, one class per file. Levels create
 * mechanics with `ctx.createMechanic(name, config)` and find them again with
 * `ctx.mechanic(idOrName)`.
 *
 * Names without a level mechanic return null: `move`, `dash`, `talk`,
 * `follow` and `verse` are Dante's and Virgil's own abilities (the world),
 * `compose`, `heart`, `remembrance`, `chain` and `read_pages` belong to the
 * book (the presenter).
 *
 *   const lion = ctx.createMechanic('chase', { mode: 'lunge', actor: 'LION' }) as Chase;
 *   const roar = ctx.createMechanic('hold_ground', { source: 'LION', event: 'inf01.held_ground' }) as HoldGround;
 *   await roar.cue();
 *
 * Owner: team D (mechanics).
 */

import type { Mechanic, MechanicContext } from '../runtime/contracts';
import type { MechanicName } from '../story/types';
import { createChase, type ChaseConfig } from './chase';
import { createCrowdFlow, type CrowdFlowConfig } from './crowd_flow';
import { createDarkness, type DarknessConfig } from './darkness';
import { createFaint, type FaintConfig } from './faint';
import { createFear, type FearConfig } from './fear';
import { createGuardian, type GuardianConfig } from './guardian';
import { createHoldGround, type HoldGroundConfig } from './hold_ground';
import { createHub, type HubConfig } from './hub';
import { createInscription, type InscriptionConfig } from './inscription';
import { createJudgementGame, type JudgementGameConfig } from './judgement_game';
import { createLookBack, type LookBackConfig } from './look_back';
import { createPushBack, type PushBackConfig } from './push_back';
import { createQuake, type QuakeConfig } from './quake';
import { createSwarm, type SwarmConfig } from './swarm';
import { createWalkOnWater, type WalkOnWaterConfig } from './walk_on_water';
import { createShelter, createWindField, createWindLull, type ShelterConfig, type WindFieldConfig, type WindLullConfig } from './wind_field';

export { BaseMechanic, Waiter, num, type AreaRef, type Point } from './base';
export { Chase, type ChaseConfig } from './chase';
export { CrowdFlow, type CrowdFlowConfig } from './crowd_flow';
export { Darkness, type DarknessConfig, type LightDef } from './darkness';
export { Faint, type FaintConfig } from './faint';
export { FearZones, type FearConfig } from './fear';
export { Guardian, type GuardianConfig } from './guardian';
export { HoldGround, type HoldGroundConfig } from './hold_ground';
export { Hub, type HubConfig } from './hub';
export { Inscription, type InscriptionConfig } from './inscription';
export { JudgementGameMechanic, type JudgementGameConfig } from './judgement_game';
export { LookBack, type LookBackConfig } from './look_back';
export { PushBack, type PushBackConfig } from './push_back';
export { Quake, type QuakeConfig, type QuakeEnd } from './quake';
export { Swarm, type SwarmConfig } from './swarm';
export { WalkOnWater, type WalkOnWaterConfig } from './walk_on_water';
export { Shelter, WindField, WindLull, type FlockConfig, type ShelterConfig, type WindFieldConfig, type WindLullConfig } from './wind_field';

type AnyFactory = (ctx: MechanicContext, config: Record<string, unknown>) => Mechanic;

function factory<C>(fn: (ctx: MechanicContext, config: C) => Mechanic): AnyFactory {
  return (ctx, config) => fn(ctx, config as unknown as C);
}

const FACTORIES: Partial<Record<MechanicName, AnyFactory>> = {
  fear: factory<FearConfig>(createFear),
  darkness: factory<DarknessConfig>(createDarkness),
  look_back: factory<LookBackConfig>(createLookBack),
  chase: factory<ChaseConfig>(createChase),
  hold_ground: factory<HoldGroundConfig>(createHoldGround),
  push_back: factory<PushBackConfig>(createPushBack),
  crowd_flow: factory<CrowdFlowConfig>(createCrowdFlow),
  swarm: factory<SwarmConfig>(createSwarm),
  guardian: factory<GuardianConfig>(createGuardian),
  quake: factory<QuakeConfig>(createQuake),
  faint: factory<FaintConfig>(createFaint),
  inscription: factory<InscriptionConfig>(createInscription),
  hub: factory<HubConfig>(createHub),
  walk_on_water: factory<WalkOnWaterConfig>(createWalkOnWater),
  wind_field: factory<WindFieldConfig>(createWindField),
  shelter: factory<ShelterConfig>(createShelter),
  wind_lull: factory<WindLullConfig>(createWindLull),
  judgement_game: factory<JudgementGameConfig>(createJudgementGame),
};

/** Mechanic names that are abilities of the world or features of the book, not level mechanics. */
export const NON_LEVEL_MECHANICS: readonly MechanicName[] = [
  'move',
  'dash',
  'talk',
  'follow',
  'verse',
  'compose',
  'heart',
  'remembrance',
  'chain',
  'read_pages',
];

/** Names with a library implementation. */
export function libraryMechanicNames(): MechanicName[] {
  return Object.keys(FACTORIES) as MechanicName[];
}

/**
 * Instantiate a library mechanic. Never throws: a failing constructor is
 * reported on the bus and yields null, so a level keeps building.
 */
export function createLibraryMechanic(name: MechanicName, ctx: MechanicContext, config: Record<string, unknown>): Mechanic | null {
  const make = FACTORIES[name];
  if (!make) return null;
  try {
    return make(ctx, config ?? {});
  } catch (err) {
    try {
      ctx.level.bus.emit('debug:log', {
        level: 'error',
        message: `[mechanics] ${name} could not be created: ${err instanceof Error ? err.message : String(err)}`,
      });
    } catch {
      // nothing else to do
    }
    return null;
  }
}
