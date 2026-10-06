/**
 * Browser environment helpers (guarded: never throw). Architect-owned.
 */

import { DEBUG_QUERY_PARAM } from '../config';
import type { StorageLike } from '../runtime/contracts';

/** `?debug=1` (or any value but 0) enables the debug API; `vite dev` enables it unless `?debug=0`. */
export function isDebugEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(DEBUG_QUERY_PARAM)) return params.get(DEBUG_QUERY_PARAM) !== '0';
  } catch {
    // no window / location: fall through
  }
  return import.meta.env.DEV;
}

/** A URL query value, or null. */
export function queryParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

/** localStorage if it is usable (private mode, disabled storage and sandboxed frames return null). */
export function safeLocalStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = '__dante_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
