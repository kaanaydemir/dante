/**
 * The game session: plays a chapter canto by canto, shows missing-canto pages,
 * saves at scene starts (through the runner) and after each canto, continues
 * saved games, jumps (debug), and drives autoplay.
 *
 * Owner: team B (runtime). Contract: GameSession (src/runtime/contracts.ts),
 * semantics: docs/ENGINE.md §5.1. Pure: no Phaser import, no DOM.
 *
 * Every public promise resolves (never rejects). A newer newGame / continue /
 * jump / stop supersedes the play in progress: the old loop stops at the next
 * canto boundary and the runner's current canto resolves 'stopped'.
 */

import { chapterById, type ChapterDef } from '../config';
import { createInitialState } from '../state/initial';
import { m0KitEffects } from '../state/profile';
import { cantoLabel } from '../story/cite';
import type { CantoId } from '../story/types';
import { DEFAULT_AUTOPLAY, mergeAutoplay } from './autoplay';
import {
  cantoOfTarget,
  chapterOfCanto,
  KNOWN_CANTO_TITLES,
  nextInOrder,
  playOrder,
  previousInOrder,
} from './chapters';
import type {
  AutoplayOptions,
  CreateGameSession,
  EventBus,
  GameProfile,
  GameSession,
  GameStateData,
  GameStateStore,
  HintSpec,
  MissingCantoSpec,
  NewGameOptions,
  RunnerPorts,
  SessionDeps,
  SessionStatus,
  StoryLibrary,
  StoryRunner,
} from './contracts';
import { createHeadlessPresenter, createHeadlessWorld } from './headless';
import { Runner } from './runner';

export const MISSING_CANTO_MESSAGE = 'This canto is still being written.';

function describeError(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

function cantoNumberOf(id: CantoId): number {
  const n = Number(/\d+$/.exec(id)?.[0] ?? NaN);
  return Number.isFinite(n) ? n : 0;
}

class Session implements GameSession {
  status: SessionStatus = 'title';
  chapter: ChapterDef = chapterById(null);
  cantoId: CantoId | null = null;

  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly ports: RunnerPorts;
  private readonly impl: Runner;

  private generation = 0;
  private control: AbortController | null = null;
  private playing: Promise<void> | null = null;

  constructor(deps: SessionDeps) {
    this.bus = deps.bus;
    this.store = deps.store;
    this.story = deps.story;
    this.ports = { presenter: createHeadlessPresenter(), world: createHeadlessWorld() };
    this.impl = new Runner({
      bus: deps.bus,
      store: deps.store,
      story: deps.story,
      ports: this.ports,
      ...(deps.clock ? { clock: deps.clock } : {}),
    });
  }

  get runner(): StoryRunner {
    return this.impl;
  }

  attach(parts: Partial<RunnerPorts>): void {
    if (parts.presenter) this.ports.presenter = parts.presenter;
    if (parts.world) this.ports.world = parts.world;
  }

  // -------------------------------------------------------------------------
  // Starting play
  // -------------------------------------------------------------------------

  newGame(opts: NewGameOptions = {}): Promise<void> {
    return this.begin(async (gen, signal) => {
      const profile: GameProfile = opts.profile ?? 'full';
      const chapter = opts.chapter
        ? chapterById(opts.chapter)
        : (opts.startAt ? chapterOfCanto(cantoOfTarget(opts.startAt)) : null) ?? chapterById(null);
      const startCanto = opts.startAt ? cantoOfTarget(opts.startAt) : (chapter.cantos[0] ?? null);
      if (profile === 'm0' && startCanto === chapter.cantos[0]) {
        // M0 from Canto I: a fresh m0 state; the kit is applied when Canto V begins (bible §7.5).
        this.store.restore(createInitialState('m0'));
      } else {
        this.store.reset(profile);
      }
      await this.playChapter(gen, signal, chapter, profile, opts.startAt ?? null);
    });
  }

  continueGame(): Promise<void> {
    const data = this.store.load();
    if (!data) {
      this.log('warn', 'continueGame: no saved game; starting a new one.');
      return this.newGame();
    }
    return this.begin(async (gen, signal) => {
      this.store.restore(data);
      const profile = this.store.state.profile;
      const canto = data.position.canto;
      const chapter = chapterOfCanto(canto) ?? chapterById(null);
      if (!canto) {
        await this.playChapter(gen, signal, chapter, profile, null);
        return;
      }
      if (data.completedCantos.includes(canto)) {
        const next = nextInOrder(playOrder(chapter, profile), canto);
        if (!next) {
          this.chapter = chapter;
          this.finishChapter(gen);
          return;
        }
        await this.playChapter(gen, signal, chapter, profile, next);
        return;
      }
      await this.playChapter(gen, signal, chapter, profile, data.position.scene ?? canto);
    });
  }

  canContinue(): boolean {
    const data = this.store.load();
    return data !== null && !this.isChapterComplete(data);
  }

  jump(target: string, opts: { readonly profile?: GameProfile } = {}): Promise<void> {
    return this.begin(async (gen, signal) => {
      if (opts.profile === 'm0') this.applyM0Kit();
      const canto = cantoOfTarget(target);
      const chapter = chapterOfCanto(canto) ?? this.chapter;
      const profile = opts.profile ?? this.store.state.profile;
      await this.playChapter(gen, signal, chapter, profile, target);
    });
  }

  stop(): void {
    this.generation += 1;
    this.control?.abort();
    this.control = null;
    this.impl.stop('session stopped');
    this.setStatus('stopped');
    this.safe(() => this.ports.presenter.showTitle());
  }

  askVirgil(): HintSpec | null {
    return this.impl.askVirgil();
  }

  setAutoplay(opts: Partial<AutoplayOptions> | null): AutoplayOptions | null {
    this.impl.setAutoplay(opts === null ? null : mergeAutoplay(opts, DEFAULT_AUTOPLAY));
    return this.impl.autoplay;
  }

  // -------------------------------------------------------------------------
  // The chapter loop
  // -------------------------------------------------------------------------

  /** Supersedes the current play with `body`; resolves when `body` ends. Never rejects. */
  private begin(body: (gen: number, signal: AbortSignal) => Promise<void>): Promise<void> {
    const gen = ++this.generation;
    const previousControl = this.control;
    const control = new AbortController();
    this.control = control;
    const previous = this.playing;
    if (previousControl) previousControl.abort();
    if (previous) {
      this.impl.stop('superseded');
      this.safe(() => this.ports.presenter.cancelAll());
    }
    const p = (async (): Promise<void> => {
      if (previous) await previous.catch(() => undefined);
      if (gen !== this.generation) return;
      this.setStatus('playing');
      try {
        await body(gen, control.signal);
      } catch (err) {
        if (!control.signal.aborted) this.log('error', `Session failed: ${describeError(err)}`, err);
      }
    })();
    this.playing = p;
    void p.finally(() => {
      if (this.playing === p) this.playing = null;
    });
    return p;
  }

  private async playChapter(
    gen: number,
    signal: AbortSignal,
    chapter: ChapterDef,
    profile: GameProfile,
    startAt: string | null,
  ): Promise<void> {
    this.chapter = chapter;
    let order = playOrder(chapter, profile);
    const startCanto = startAt ? cantoOfTarget(startAt) : (order[0] ?? null);
    if (startCanto && !order.includes(startCanto)) {
      // A canto the profile's order skips (debug jump): play it, then what follows it in the chapter.
      const full = chapter.cantos.includes(startCanto) ? chapter.cantos : [startCanto];
      order = full.slice(full.indexOf(startCanto));
    }
    const startIndex = startCanto ? Math.max(0, order.indexOf(startCanto)) : 0;

    for (let i = startIndex; i < order.length; i++) {
      if (gen !== this.generation || signal.aborted) return;
      const id = order[i] as CantoId;
      this.cantoId = id;
      if (profile === 'm0' && id !== chapter.cantos[0]) this.applyM0Kit();

      const loaded = this.story.canto(id);
      if (loaded.status !== 'ok' || !loaded.script) {
        // The position stays at the first canto not played yet, so a later build that
        // has its script continues there.
        await this.showMissing(id, loaded.status === 'invalid' ? 'invalid' : 'missing', signal);
        continue;
      }

      const at = i === startIndex && startAt && startAt !== id ? startAt : undefined;
      const outcome = await this.impl.runCanto(loaded.script, {
        ...(at ? { at } : {}),
        chapter,
        order,
        previous: previousInOrder(order, id),
      });
      if (gen !== this.generation) return;
      if (outcome.status !== 'completed') {
        this.setStatus('stopped');
        return;
      }
      // Save the completed canto, positioned at the next one (continue starts there).
      const next = nextInOrder(order, id);
      this.store.setPosition({ canto: next ?? id, scene: null, beat: null });
      this.store.save();
    }
    if (gen !== this.generation || signal.aborted) return;
    this.finishChapter(gen);
  }

  private finishChapter(gen: number): void {
    if (gen !== this.generation) return;
    this.setStatus('chapter_complete');
    this.safe(() => this.ports.presenter.showTitle());
  }

  private async showMissing(id: CantoId, status: 'missing' | 'invalid', signal: AbortSignal): Promise<void> {
    const spec: MissingCantoSpec = {
      cantoId: id,
      cantoLabel: cantoLabel(cantoNumberOf(id)),
      title: KNOWN_CANTO_TITLES[id] ?? null,
      status,
      message: MISSING_CANTO_MESSAGE,
    };
    this.bus.emit('canto:missing', { canto: id, status });
    this.log('warn', `Canto ${id} is ${status}; showing the "still being written" page.`);
    try {
      await this.guard(this.impl.present(() => this.ports.presenter.missingCanto(spec)), signal);
    } catch (err) {
      if (!signal.aborted) this.log('error', `missingCanto failed: ${describeError(err)}`, err);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private applyM0Kit(): void {
    for (const effect of m0KitEffects(this.store.state)) {
      this.store.apply(effect, { canto: this.cantoId, beat: null, system: true });
    }
  }

  private isChapterComplete(data: GameStateData): boolean {
    const canto = data.position.canto;
    if (!canto || !data.completedCantos.includes(canto)) return false;
    const chapter = chapterOfCanto(canto);
    if (!chapter) return true;
    return nextInOrder(playOrder(chapter, data.profile), canto) === null;
  }

  private guard<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      p.catch(() => undefined);
      return Promise.reject(new Error('session superseded'));
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => reject(new Error('session superseded'));
      signal.addEventListener('abort', onAbort, { once: true });
      p.then(
        (v) => {
          signal.removeEventListener('abort', onAbort);
          resolve(v);
        },
        (err: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        },
      );
    });
  }

  private setStatus(status: SessionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.bus.emit('session:status', { status });
  }

  private safe(fn: () => unknown): void {
    try {
      fn();
    } catch (err) {
      this.log('error', `Call failed: ${describeError(err)}`, err);
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    this.bus.emit('debug:log', data === undefined ? { level, message } : { level, message, data });
  }
}

export const createGameSession: CreateGameSession = (deps) => new Session(deps);
