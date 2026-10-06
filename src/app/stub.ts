/**
 * Scaffolding helper: builds a placeholder object for an interface whose real
 * implementation has not landed yet. Listed properties return the given
 * values; every other property is a no-op function returning a resolved
 * Promise. Calls are logged once per member at debug level.
 *
 * Only entry-point stubs use this. Implementers delete the stub call when they
 * write the real module; nothing else should depend on it.
 */
export function stubObject<T extends object>(name: string, defaults: Partial<T> = {}): T {
  const warned = new Set<string>();
  const fns = new Map<string, (...args: unknown[]) => Promise<undefined>>();
  return new Proxy(defaults as T, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined;
      if (prop in target) return Reflect.get(target, prop, receiver) as unknown;
      let fn = fns.get(prop);
      if (!fn) {
        fn = (..._args: unknown[]) => {
          if (!warned.has(prop)) {
            warned.add(prop);
            console.debug(`[stub] ${name}.${prop}() is not implemented yet`);
          }
          return Promise.resolve(undefined);
        };
        fns.set(prop, fn);
      }
      return fn;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value);
    },
  });
}
