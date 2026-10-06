/**
 * Typed synchronous event bus.
 *
 * STARTER IMPLEMENTATION written by the architect. Owner: team B (runtime).
 * The implementation may change; the export `createEventBus` and the
 * EventBus contract (src/runtime/contracts.ts) are frozen.
 */

import type { CreateEventBus, EventBus, GameEventName, GameEvents, Unsubscribe } from './contracts';

type Handler<K extends GameEventName> = (payload: GameEvents[K]) => void;
type AnyHandler = (type: GameEventName, payload: GameEvents[GameEventName]) => void;

export const createEventBus: CreateEventBus = (): EventBus => {
  const handlers = new Map<GameEventName, Set<Handler<GameEventName>>>();
  const anyHandlers = new Set<AnyHandler>();

  function on<K extends GameEventName>(type: K, handler: Handler<K>): Unsubscribe {
    let set = handlers.get(type);
    if (!set) {
      set = new Set();
      handlers.set(type, set);
    }
    set.add(handler as Handler<GameEventName>);
    return () => {
      handlers.get(type)?.delete(handler as Handler<GameEventName>);
    };
  }

  function once<K extends GameEventName>(type: K, handler: Handler<K>): Unsubscribe {
    const off = on(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  function onAny(handler: AnyHandler): Unsubscribe {
    anyHandlers.add(handler);
    return () => {
      anyHandlers.delete(handler);
    };
  }

  function report(type: GameEventName, err: unknown): void {
    const message = `Event handler for '${type}' threw: ${err instanceof Error ? err.message : String(err)}`;
    console.error(message, err);
    // Never recurse into debug:log from a failing debug:log handler.
    if (type !== 'debug:log') emit('debug:log', { level: 'error', message, data: err });
  }

  function emit<K extends GameEventName>(type: K, payload: GameEvents[K]): void {
    const set = handlers.get(type);
    if (set && set.size > 0) {
      // Copy so handlers may unsubscribe while we dispatch.
      for (const handler of [...set]) {
        try {
          (handler as Handler<K>)(payload);
        } catch (err) {
          report(type, err);
        }
      }
    }
    if (anyHandlers.size > 0) {
      for (const handler of [...anyHandlers]) {
        try {
          handler(type, payload);
        } catch (err) {
          report(type, err);
        }
      }
    }
  }

  function clear(): void {
    handlers.clear();
    anyHandlers.clear();
  }

  return { on, once, onAny, emit, clear };
};
