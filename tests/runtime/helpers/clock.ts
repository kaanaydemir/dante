/**
 * A virtual clock for runner tests: waits resolve in time order, as soon as
 * the program is otherwise idle (one timer per macrotask), so fallback timers,
 * autoplay delays and reading times cost no real time but keep their order.
 */

import type { Clock } from '../../../src/runtime/contracts';

export interface VirtualClock extends Clock {
  /** Virtual milliseconds elapsed. */
  readonly time: number;
  /** Number of timers waiting. */
  readonly pending: number;
}

interface Timer {
  readonly at: number;
  readonly seq: number;
  readonly resolve: () => void;
  readonly cleanup: () => void;
}

export function createVirtualClock(): VirtualClock {
  let now = 0;
  let seq = 0;
  let scheduled = false;
  const timers: Timer[] = [];

  const schedule = (): void => {
    if (scheduled || timers.length === 0) return;
    scheduled = true;
    setTimeout(pump, 0);
  };

  const pump = (): void => {
    scheduled = false;
    if (timers.length === 0) return;
    timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
    const timer = timers.shift() as Timer;
    now = Math.max(now, timer.at);
    timer.cleanup();
    timer.resolve();
    schedule();
  };

  return {
    now: () => now,
    wait(ms: number, signal?: AbortSignal): Promise<void> {
      return new Promise<void>((resolve) => {
        if (signal?.aborted) {
          resolve();
          return;
        }
        const onAbort = (): void => {
          const i = timers.indexOf(timer);
          if (i >= 0) timers.splice(i, 1);
          resolve();
        };
        const timer: Timer = {
          at: now + Math.max(0, Number.isFinite(ms) ? ms : 0),
          seq: seq++,
          resolve,
          cleanup: () => signal?.removeEventListener('abort', onAbort),
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        timers.push(timer);
        schedule();
      });
    },
    get time() {
      return now;
    },
    get pending() {
      return timers.length;
    },
  };
}
