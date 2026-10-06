/**
 * window.__dante: the debug / automation API (Playwright drives whole chapters
 * with it). Installed only with ?debug=1 or in `vite dev`; installing it never
 * changes how the game plays.
 *
 * SKELETON written by the architect against the contracts; it only forwards
 * to the session, runner, store, presenter and world. The integrator extends it.
 */

import type { Services } from '../app/services';
import type { DanteDebugApi, DebugLogEntry, GameEventName } from '../runtime/contracts';

declare global {
  interface Window {
    __dante?: DanteDebugApi;
  }
}

const RING_SIZE = 600;

/** Noisy events kept out of the ring buffer. */
const QUIET_EVENTS: ReadonlySet<GameEventName> = new Set<GameEventName>(['resources:changed', 'state:changed']);

export function installDebugApi(s: Services): DanteDebugApi {
  const errors: string[] = [];
  const ring: DebugLogEntry[] = [];
  const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const describe = (value: unknown): string => {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  window.addEventListener('error', (e) => {
    errors.push(`error: ${e.message}${e.filename ? ` (${e.filename}:${e.lineno})` : ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    errors.push(`unhandledrejection: ${describe(e.reason)}`);
  });

  s.bus.onAny((type, payload) => {
    if (QUIET_EVENTS.has(type)) return;
    ring.push({ t: now(), type, payload });
    if (ring.length > RING_SIZE) ring.shift();
  });
  s.bus.on('debug:log', (p) => {
    if (p.level === 'error') errors.push(`debug:log: ${p.message}`);
  });

  /** Fire-and-forget: the API never awaits a chapter. */
  const run = (label: string, p: Promise<unknown>): void => {
    p.catch((err: unknown) => {
      errors.push(`${label}: ${describe(err)}`);
    });
  };

  const api: DanteDebugApi = {
    version: '0.1.0',
    get session() {
      return s.session;
    },
    get runner() {
      return s.session.runner;
    },
    get store() {
      return s.store;
    },
    get story() {
      return s.story;
    },
    get state() {
      return s.store.state;
    },
    get status() {
      return s.session.status;
    },
    get runnerStatus() {
      return s.session.runner.status;
    },
    get canto() {
      return s.session.cantoId;
    },
    get scene() {
      return s.session.runner.scene?.id ?? null;
    },
    get beat() {
      return s.session.runner.beat?.id ?? s.session.runner.cursor;
    },
    get mode() {
      return s.session.runner.mode;
    },
    newGame(opts) {
      run('newGame', s.session.newGame(opts));
    },
    continueGame() {
      run('continueGame', s.session.continueGame());
    },
    jump(target, opts) {
      run(`jump(${target})`, s.session.jump(target, opts));
    },
    choose(letter) {
      return s.session.ports.presenter.answer(letter);
    },
    skipText() {
      s.session.ports.presenter.skip();
    },
    teleport(place) {
      return s.session.ports.world.teleport(place);
    },
    emit(event) {
      s.bus.emit('world:signal', { kind: 'event', id: event });
    },
    talk(speaker) {
      s.bus.emit('world:signal', { kind: 'talk', speaker });
    },
    autoplay(opts) {
      return s.session.setAutoplay(opts === false ? null : (opts ?? {}));
    },
    armed() {
      return s.session.runner.armed();
    },
    setSettings(patch) {
      s.store.updateSettings(patch);
    },
    errors() {
      return [...errors];
    },
    events() {
      return [...ring];
    },
    diagnostics() {
      return s.story.diagnostics();
    },
  };

  Object.defineProperty(window, '__dante', { value: api, configurable: true, enumerable: false, writable: false });
  return api;
}
