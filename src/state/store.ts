/**
 * The game state store: effects, bookkeeping, resources, save / load, settings.
 *
 * Owner: team B (state). Contract: GameStateStore (src/runtime/contracts.ts),
 * semantics: docs/ENGINE.md §5.7 and §6, bible §2.10 and §3.
 *
 * - The single owner of mutable game state. `state` is the live object (typed
 *   deeply read-only); it is replaced on reset() / restore(), so read
 *   `store.state` each time instead of caching it.
 * - Every mutation emits 'state:changed' (and more specific events).
 * - Pure: no Phaser, no DOM. Storage is injected; every storage call is wrapped
 *   in try/catch, and the game plays (without saves) when storage is missing.
 */

import { RESOURCES, STORAGE_KEYS } from '../config';
import type {
  Canticle,
  CantoId,
  ConditionContext,
  Effect,
  EventId,
  OptionLetter,
} from '../story/types';
import type {
  ChoiceRecord,
  ComposedVerse,
  CreateGameStateStore,
  EffectResult,
  EffectSource,
  EventBus,
  GameProfile,
  GameStateData,
  GameStateStore,
  GameStateView,
  PendingReveal,
  Position,
  ReadingLogEntry,
  Settings,
  StorageLike,
} from '../runtime/contracts';
import { applyEffectTo } from './apply';
import { createConditionContext } from './conditions';
import { createInitialState } from './initial';
import { cloneJson, normalizeSettings, normalizeState, parseSave, parseSettings, serializeSave, serializeSettings } from './persistence';
import { m0KitEffects } from './profile';

/** `${canticle}:${canto}`: the key of `state.linesSeen` (same as story-core's sourceKey). */
export function linesSeenKey(canticle: Canticle, canto: number): string {
  return `${canticle}:${canto}`;
}

function cloneVerse(verse: ComposedVerse): ComposedVerse {
  return { tercets: verse.tercets.map((t) => [t[0], t[1], t[2]] as const), coda: verse.coda };
}

class StateStore implements GameStateStore {
  private data: GameStateData;
  private currentSettings: Settings;
  private readonly ctx: ConditionContext;

  constructor(
    private readonly bus: EventBus,
    private readonly storage: StorageLike | null,
  ) {
    this.data = createInitialState('full');
    this.currentSettings = this.readSettings();
    this.ctx = createConditionContext(() => this.data);
  }

  // -------------------------------------------------------------------------
  // Views
  // -------------------------------------------------------------------------

  get state(): GameStateView {
    return this.data;
  }

  get settings(): Settings {
    return this.currentSettings;
  }

  conditions(): ConditionContext {
    return this.ctx;
  }

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  apply(effect: Effect, source: EffectSource): EffectResult {
    let res: EffectResult;
    try {
      const applied = applyEffectTo(this.data, effect, { easyMode: this.currentSettings.easyMode });
      res = { effect, changed: applied.changed, outcome: applied.outcome };
      this.bus.emit('effect:applied', { result: res, source });
      if (applied.heart && effect.type === 'heart') {
        this.bus.emit('heart:changed', {
          pity: this.data.heart.pity,
          justice: this.data.heart.justice,
          side: effect.side,
          amount: effect.amount,
          sin: effect.sin,
        });
      }
      if (applied.trustDelta !== 0) {
        this.bus.emit('trust:changed', { trust: this.data.trust, delta: applied.trustDelta });
      }
      if (applied.resources) this.emitResources();
      if (applied.changed) this.changed(`effect:${effect.type}`);
    } catch (err) {
      res = { effect, changed: false, outcome: 'ignored' };
      this.bus.emit('debug:log', {
        level: 'error',
        message: `store.apply failed: ${err instanceof Error ? err.message : String(err)}`,
        data: { effect, source },
      });
    }
    return res;
  }

  applyAll(effects: readonly Effect[], source: EffectSource): EffectResult[] {
    return effects.map((e) => this.apply(e, source));
  }

  // -------------------------------------------------------------------------
  // Story bookkeeping (runner)
  // -------------------------------------------------------------------------

  markSeen(id: string): void {
    if (!id || this.data.seen.includes(id)) return;
    this.data.seen.push(id);
    this.changed('seen');
  }

  recordEvent(id: EventId): boolean {
    if (!id || this.data.events.includes(id)) return false;
    this.data.events.push(id);
    this.changed('event');
    return true;
  }

  recordChoice(record: ChoiceRecord): void {
    const copy: ChoiceRecord = {
      ...record,
      canon: Array.isArray(record.canon) ? [...record.canon] : record.canon,
    };
    this.data.choices[record.choice] = copy;
    this.data.stats.choicesMade += 1;
    this.changed('choice');
  }

  addLog(entry: ReadingLogEntry): void {
    this.data.log.push(cloneJson(entry));
    this.changed('log');
  }

  markLinesSeen(canticle: Canticle, canto: number, lines: readonly number[]): void {
    const valid = lines.filter((n) => Number.isInteger(n) && n > 0);
    if (valid.length === 0) return;
    const key = linesSeenKey(canticle, canto);
    const current = this.data.linesSeen[key] ?? [];
    const merged = [...new Set([...current, ...valid])].sort((a, b) => a - b);
    if (merged.length === current.length) return;
    this.data.linesSeen[key] = merged;
    this.changed('lines');
  }

  markHintUsed(key: string): void {
    if (!key || this.data.hintsUsed.includes(key)) return;
    this.data.hintsUsed.push(key);
    this.changed('hint');
  }

  pushPendingReveal(reveal: PendingReveal): void {
    this.data.pendingReveals.push(cloneJson(reveal));
    this.changed('reveal');
  }

  takePendingReveals(canto: CantoId): PendingReveal[] {
    const taken = this.data.pendingReveals.filter((r) => r.canto === canto);
    if (taken.length === 0) return [];
    this.data.pendingReveals = this.data.pendingReveals.filter((r) => r.canto !== canto);
    this.changed('reveal');
    return taken;
  }

  completeCanto(canto: CantoId): void {
    if (!canto || this.data.completedCantos.includes(canto)) return;
    this.data.completedCantos.push(canto);
    this.changed('canto');
  }

  setPosition(position: Partial<Position>): void {
    const next: Position = { ...this.data.position };
    if (position.canto !== undefined) next.canto = position.canto;
    if (position.scene !== undefined) next.scene = position.scene;
    if (position.beat !== undefined) next.beat = position.beat;
    if (position.checkpoint !== undefined) next.checkpoint = position.checkpoint ? { ...position.checkpoint } : null;
    this.data.position = next;
    this.changed('position');
  }

  // -------------------------------------------------------------------------
  // Gameplay (world)
  // -------------------------------------------------------------------------

  adjustResolve(delta: number, cause: string): number {
    void cause;
    if (!Number.isFinite(delta) || delta === 0) return this.data.resolve;
    if (delta < 0 && this.currentSettings.easyMode) return this.data.resolve;
    const before = this.data.resolve;
    const after = Math.max(0, Math.min(RESOURCES.resolveMax, before + delta));
    if (after !== before) {
      this.data.resolve = after;
      this.emitResources();
      this.changed('resolve');
    }
    return after;
  }

  refillResolve(): void {
    if (this.data.resolve === RESOURCES.resolveMax) return;
    this.data.resolve = RESOURCES.resolveMax;
    this.emitResources();
    this.changed('resolve');
  }

  adjustGrace(delta: number): number {
    if (!Number.isFinite(delta) || delta === 0) return this.data.grace;
    const before = this.data.grace;
    const after = Math.max(0, Math.min(this.data.gracemax, before + delta));
    if (after !== before) {
      this.data.grace = after;
      this.emitResources();
      this.changed('grace');
    }
    return after;
  }

  recordFaint(): void {
    this.data.stats.faints += 1;
    this.changed('faint');
  }

  setEquippedVerse(verse: ComposedVerse | null): void {
    this.data.equippedVerse = verse ? cloneVerse(verse) : null;
    this.changed('verse');
  }

  addVerse(canto: CantoId, verse: ComposedVerse): void {
    this.data.verses.push({ canto, verse: cloneVerse(verse), order: this.data.verses.length + 1 });
    this.changed('verse');
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  reset(profile: GameProfile = 'full'): void {
    this.data = createInitialState(profile);
    if (profile === 'm0') {
      for (const effect of m0KitEffects(this.data)) this.apply(effect, { canto: null, beat: null, system: true });
    }
    this.bus.emit('state:restored', { profile });
    this.emitResources();
    this.changed('reset');
  }

  snapshot(): GameStateData {
    return cloneJson(this.data);
  }

  restore(data: GameStateData): void {
    const normalized = normalizeState(cloneJson(data));
    if (!normalized) {
      this.bus.emit('debug:log', { level: 'warn', message: 'store.restore: invalid state ignored' });
      return;
    }
    this.data = normalized;
    this.bus.emit('state:restored', { profile: normalized.profile });
    this.emitResources();
    this.changed('restore');
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  save(): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(STORAGE_KEYS.save, serializeSave(this.data));
      return true;
    } catch (err) {
      this.bus.emit('debug:log', {
        level: 'warn',
        message: `Saving failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return false;
    }
  }

  load(): GameStateData | null {
    if (!this.storage) return null;
    try {
      return parseSave(this.storage.getItem(STORAGE_KEYS.save));
    } catch {
      return null;
    }
  }

  hasSave(): boolean {
    return this.load() !== null;
  }

  clearSave(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(STORAGE_KEYS.save);
    } catch {
      // storage unavailable: nothing to clear
    }
  }

  updateSettings(patch: Partial<Settings>): void {
    this.currentSettings = normalizeSettings({ ...this.currentSettings, ...patch }, this.currentSettings);
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEYS.settings, serializeSettings(this.currentSettings));
      } catch {
        // settings still apply for this session
      }
    }
    this.bus.emit('settings:changed', { settings: this.currentSettings });
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private readSettings(): Settings {
    if (!this.storage) return normalizeSettings({});
    try {
      return parseSettings(this.storage.getItem(STORAGE_KEYS.settings));
    } catch {
      return normalizeSettings({});
    }
  }

  private emitResources(): void {
    this.bus.emit('resources:changed', {
      resolve: this.data.resolve,
      grace: this.data.grace,
      gracemax: this.data.gracemax,
    });
  }

  private changed(reason: string): void {
    this.bus.emit('state:changed', { reason });
  }
}

export const createGameStateStore: CreateGameStateStore = (deps) => new StateStore(deps.bus, deps.storage ?? null);

/** Helper for UIs and tests: the letter recorded for a choice, or null. */
export function recordedLetter(state: GameStateView, choice: string): OptionLetter | null {
  return state.choices[choice]?.letter ?? null;
}
