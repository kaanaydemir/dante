/**
 * The default time source (setTimeout-based). Tests inject their own Clock.
 *
 * Owner: team B (runtime). Pure: uses only timers available in browsers and Node.
 */

import type { Clock } from './contracts';

export const realClock: Clock = {
  now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  },
  wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const finish = (): void => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      const onAbort = (): void => {
        clearTimeout(timer);
        finish();
      };
      const timer = setTimeout(finish, Math.max(0, Number.isFinite(ms) ? ms : 0));
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  },
};
