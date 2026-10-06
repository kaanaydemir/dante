/**
 * Composition root: builds every service, the Phaser game and the debug API,
 * and wires them together. Architect-owned; the integrator adjusts it.
 *
 * Order matters:
 *   bus -> story -> store -> audio -> session (headless ports)
 *   -> Phaser.Game -> presenter + world (lazy: they must not touch scenes yet)
 *   -> session.attach() -> setServices() -> debug API.
 * All of this runs synchronously, before the game's first frame, so scenes can
 * call services() from their create().
 */

import * as Phaser from 'phaser';
import { createAudio } from '../audio/audio';
import { GAME_HEIGHT, GAME_WIDTH, PAGE_BACKGROUND } from '../config';
import { installDebugApi } from '../debug/DebugApi';
import { createEventBus } from '../runtime/bus';
import { createGameSession } from '../runtime/session';
import { SCENES } from '../scenes/registry';
import { createGameStateStore } from '../state/store';
import { loadStoryLibrary } from '../story/load';
import { createPresenter } from '../ui/presenter';
import { createWorldBridge } from '../world/bridge';
import { isDebugEnabled, safeLocalStorage } from './env';
import { setServices, type Services } from './services';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: PAGE_BACKGROUND,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    input: { keyboard: true, mouse: true, touch: true, gamepad: true },
    // Our own tiny WebAudio synth (src/audio) owns sound; Phaser's sound
    // manager would create an AudioContext before any user gesture.
    audio: { noAudio: true },
    disableContextMenu: true,
    banner: false,
    scene: SCENES,
  };
}

export function bootstrap(parent: HTMLElement): Services {
  const debug = isDebugEnabled();

  const bus = createEventBus();
  const story = loadStoryLibrary({ includeFixtures: debug });
  const store = createGameStateStore({ bus, storage: safeLocalStorage() });
  const audio = createAudio({ bus, store });
  const session = createGameSession({ bus, store, story });
  const core = { bus, store, story, session, audio };

  const game = new Phaser.Game(createGameConfig(parent));
  const presenter = createPresenter({ ...core, game });
  const world = createWorldBridge({ ...core, game });
  session.attach({ presenter, world });

  const services: Services = { ...core, game, presenter, world, debug };
  setServices(services);
  if (debug) installDebugApi(services);
  return services;
}
