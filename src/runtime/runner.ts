/**
 * The story runner: executes a parsed canto beat by beat, awaiting the
 * presenter and the world (docs/ENGINE.md §5 "Runner semantics").
 *
 * Owner: team B (runtime). Contract: StoryRunner (src/runtime/contracts.ts).
 * Pure: no Phaser import, no DOM. Presenter and world are read from the
 * mutable `ports` at call time, so the session can attach the real ones late.
 *
 * Overview
 * - runCanto: canto:start -> beginCanto -> world.loadCanto -> scenes in file
 *   order (each scene start: markSeen, setPosition, save) -> completeCanto ->
 *   endCanto -> canto:end.
 * - Beat scheduling (§5.3): the cursor is the first beat of the scene that has
 *   neither run nor been missed. `auto` (and `after:` once its beat ran or was
 *   missed) runs at once; `enter:` / `talk:` / `event:` wait with an armed set
 *   (cursor, later non-auto beats, the next scene's head). Out-of-order beats
 *   run with the auto beats right after them; reaching the scene's last beat
 *   ends the scene and marks the rest missed. The next scene's head ends the
 *   scene. Triggers the level cannot produce fall back after
 *   TIMINGS.triggerFallbackMs.
 * - Statements (§5.5), choices and REVEAL cards (§5.6), effects with feedback
 *   (§5.7), collectible words (§5.8), the colophon and chapter end (§5.9),
 *   hints (§5.10), camera verbs (§5.11), autoplay (§5.12), cancellation (§5.13).
 * - Never rejects: unexpected exceptions are reported as 'debug:log' errors and
 *   play continues with the next statement or beat.
 */

import { TIMINGS, TRUST, chapterById, type ChapterDef } from '../config';
import { withEventScope } from '../state/conditions';
import { cantoLabel } from '../story/cite';
import { evaluateCondition } from '../story/conditions';
import { getWord } from '../story/words';
import { VERSE_TUNING } from '../verse/costs';
import type {
  Beat,
  BeatId,
  BeatMode,
  CamStmt,
  CantoId,
  CantoScript,
  ChoiceOption,
  ChoiceStmt,
  ConditionContext,
  DirectiveStmt,
  DoStmt,
  Effect,
  EffectsStmt,
  EventId,
  GotoStmt,
  HintStmt,
  OptionLetter,
  QuoteStmt,
  Scene,
  SourceCanto,
  Statement,
  Trigger,
  WordName,
} from '../story/types';
import { autoplayEmits, autoplayLetter, mergeAutoplay } from './autoplay';
import { chapterOfCanto, KNOWN_CANTO_TITLES, KNOWN_FAINT_CANTOS, nextInOrder, previousInOrder } from './chapters';
import { realClock } from './clock';
import type {
  ArmedBeat,
  AutoplayOptions,
  BeatContext,
  BeatRunInfo,
  CamCommand,
  CantoMeta,
  CantoOutcome,
  ChapterSummary,
  ChoiceOptionView,
  ChoiceRecord,
  ChoiceSpec,
  Clock,
  CodexGain,
  ColophonSpec,
  CreateStoryRunner,
  EffectResult,
  EffectSource,
  EventBus,
  GameStateStore,
  HintSpec,
  MemoryGain,
  OpeningPageSpec,
  QuoteSpec,
  RevealCard,
  RevealHeading,
  RunCantoOptions,
  RunnerDeps,
  RunnerPorts,
  RunnerStatus,
  StoryLibrary,
  StoryPresenter,
  StoryRunner,
  WordChange,
  WorldBridge,
  WorldSignal,
} from './contracts';
import {
  buildQuoteSpec,
  buildRevealCard,
  canticleLabel,
  cantoLabelOf,
  cantoMeta,
  chapterEndFlags,
  choiceRows,
  revealHeading,
  speakerName,
  trustLabel,
  withCollectibles,
} from './specs';

// ===========================================================================
// Types
// ===========================================================================

/**
 * runCanto options. The session passes the chapter context; everything is
 * optional, so plain RunCantoOptions work too (the chapter is then looked up
 * in config by canto id).
 */
export interface RunCantoContext extends RunCantoOptions {
  /** The chapter being played (CantoMeta.chapter, chapter-end summary). */
  readonly chapter?: ChapterDef | null;
  /** The cantos of this playthrough in play order (next canto on the colophon). */
  readonly order?: readonly CantoId[];
  /** The canto played just before (bible §1.3.9: waking epigraph after a faint). */
  readonly previous?: CantoId | null;
}

/** Thrown internally to unwind a run that was stopped. Never escapes runCanto. */
class StopRun extends Error {
  constructor() {
    super('run stopped');
    this.name = 'StopRun';
  }
}

/** Control flow out of a statement list: continue (null) or jump to a beat of the same scene. */
type Flow = { readonly goto: BeatId } | null;

type BeatState = 'pending' | 'ran' | 'missed';

interface SceneCtx {
  readonly scene: Scene;
  readonly index: number;
  readonly status: BeatState[];
  gotoCount: number;
}

interface CurrentHint {
  readonly key: string;
  readonly text: string;
  readonly short: string | null;
  readonly beat: BeatId;
}

interface RunCtx {
  readonly script: CantoScript;
  readonly meta: CantoMeta;
  readonly controller: AbortController;
  readonly signal: AbortSignal;
  readonly chapter: ChapterDef | null;
  readonly order: readonly CantoId[];
  readonly previous: CantoId | null;
  sceneCtx: SceneCtx | null;
  /** Events emitted in the current scene (bible §2.9 scene scope). */
  sceneEvents: Set<EventId>;
  /** enter / talk signals waiting to be checked at the next wait. */
  queue: WorldSignal[];
  music: string | null;
  ambience: string | null;
  hint: CurrentHint | null;
  /** Word changes in this run, for the colophon. */
  wordChanges: WordChange[];
  missed: BeatId[];
  chapterEnd: string | null;
  readonly warned: Set<string>;
}

interface BeatCtx {
  readonly sc: SceneCtx;
  readonly beat: Beat;
  readonly info: BeatRunInfo;
  readonly firstVisit: boolean;
  readonly mode: BeatMode;
  readonly doIndex: ReadonlyMap<DoStmt, number>;
  readonly hintIndex: ReadonlyMap<HintStmt, number>;
  /** Words taken from the quote just shown; applied by the EFFECTS line right after it. */
  collect: { readonly stmt: EffectsStmt; readonly words: ReadonlySet<WordName> } | null;
}

interface ArmedEntry {
  readonly beat: Beat;
  /** Index in its scene. */
  readonly index: number;
  readonly cursor: boolean;
  readonly nextScene: boolean;
  readonly view: ArmedBeat;
}

interface PendingCall {
  settled: boolean;
  looping: boolean;
  readonly answer: (() => OptionLetter | null) | null;
  readonly signal: AbortSignal;
}

interface FeedbackOptions {
  /** Words taken from a glowing line (fly from there to the Book). */
  readonly collected?: ReadonlySet<WordName>;
  /** Engine kits and colophon words: the Book updates, no flourish. */
  readonly silentWords?: boolean;
  readonly system?: boolean;
}

/** Bible §2.9 loop guard: at most this many GOTOs per scene run. */
const MAX_GOTOS_PER_SCENE = 50;

const NEVER: AbortSignal = new AbortController().signal;

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try {
    return typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function describeTrigger(t: Trigger): string {
  switch (t.kind) {
    case 'auto':
      return 'auto';
    case 'enter':
      return `enter:${t.place}`;
    case 'talk':
      return `talk:${t.speaker}`;
    case 'event':
      return `event:${t.id}`;
    case 'after':
      return `after:${t.beat}`;
  }
  return 'unknown';
}

/** Triggers the player (world) produces: they can arm the next scene's head. */
function isWorldTrigger(t: Trigger): boolean {
  return t.kind === 'enter' || t.kind === 'talk' || t.kind === 'event';
}

function signalMatches(sig: WorldSignal, t: Trigger): boolean {
  if (sig.kind === 'enter' && t.kind === 'enter') return sig.place === t.place;
  if (sig.kind === 'talk' && t.kind === 'talk') return sig.speaker === t.speaker;
  return false;
}

/** Index of every DO and HINT line of a beat in document order, nested bodies included (stable for level hooks). */
function indexStatements(lines: readonly Statement[]): {
  doIndex: Map<DoStmt, number>;
  hintIndex: Map<HintStmt, number>;
} {
  const doIndex = new Map<DoStmt, number>();
  const hintIndex = new Map<HintStmt, number>();
  const walk = (list: readonly Statement[]): void => {
    for (const s of list) {
      if (s.type === 'do') doIndex.set(s, doIndex.size);
      else if (s.type === 'hint') hintIndex.set(s, hintIndex.size);
      else if (s.type === 'if') {
        for (const b of s.branches) walk(b.body);
        if (s.elseBody) walk(s.elseBody);
      } else if (s.type === 'choice') {
        for (const o of s.options) walk(o.body);
      }
    }
  };
  walk(lines);
  return { doIndex, hintIndex };
}

function cantoNumberOf(id: CantoId): number {
  const n = Number(/\d+$/.exec(id)?.[0] ?? NaN);
  return Number.isFinite(n) ? n : 0;
}

// ===========================================================================
// Runner
// ===========================================================================

export class Runner implements StoryRunner {
  status: RunnerStatus = 'idle';
  canto: CantoScript | null = null;
  scene: Scene | null = null;
  beat: Beat | null = null;
  mode: BeatMode | null = null;
  cursor: BeatId | null = null;
  autoplay: AutoplayOptions | null = null;

  private readonly bus: EventBus;
  private readonly store: GameStateStore;
  private readonly story: StoryLibrary;
  private readonly ports: RunnerPorts;
  private readonly clock: Clock;

  private run: RunCtx | null = null;
  private active: Promise<CantoOutcome> | null = null;
  private armedViews: readonly ArmedBeat[] = [];
  private fallbackDue: BeatId | null = null;
  private wakeFlag = false;
  private wakeResolver: (() => void) | null = null;
  private readonly pending = new Set<PendingCall>();
  /** The Book (pause menu) is open: the story does not move on behind it. */
  private bookOpen = false;

  constructor(deps: RunnerDeps) {
    this.bus = deps.bus;
    this.store = deps.store;
    this.story = deps.story;
    this.ports = deps.ports;
    this.clock = deps.clock ?? realClock;
    this.bus.on('world:signal', (sig) => this.onSignal(sig));
    this.bus.on('ui:book', (p) => {
      this.bookOpen = p.open;
      if (!p.open) this.wake();
    });
  }

  private get presenter(): StoryPresenter {
    return this.ports.presenter;
  }

  private get world(): WorldBridge {
    return this.ports.world;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  runCanto(script: CantoScript, opts: RunCantoContext = {}): Promise<CantoOutcome> {
    const previous = this.active;
    if (previous) this.stop('a new canto run started');
    const p = (async (): Promise<CantoOutcome> => {
      if (previous) await previous.catch(() => undefined);
      return this.execute(script, opts);
    })();
    this.active = p;
    void p.finally(() => {
      if (this.active === p) this.active = null;
    });
    return p;
  }

  stop(reason?: string): void {
    const run = this.run;
    if (!run || run.signal.aborted) return;
    this.log('info', `Runner stopped${reason ? `: ${reason}` : ''}`);
    run.controller.abort();
    this.safe(() => this.presenter.cancelAll());
    this.safe(() => this.world.cancel());
    this.setStatus('stopped');
    this.wake();
  }

  armed(): readonly ArmedBeat[] {
    return this.armedViews;
  }

  currentHint(): HintSpec | null {
    const hint = this.run?.hint;
    if (!hint) return null;
    const state = this.store.state;
    const used = state.hintsUsed.includes(hint.key);
    // Bible §3.3: a Wayward Dante (trust ≤ 2) only ever gets the short line.
    const short = used || state.trust <= TRUST.wayward;
    return { text: short ? (hint.short ?? hint.text) : hint.text, repeat: used, beat: hint.beat };
  }

  askVirgil(): HintSpec | null {
    const spec = this.currentHint();
    const hint = this.run?.hint;
    if (spec && hint) this.store.markHintUsed(hint.key);
    return spec;
  }

  setAutoplay(opts: AutoplayOptions | null): void {
    this.autoplay = opts ? mergeAutoplay(opts) : null;
    if (this.autoplay) for (const call of this.pending) this.startSkipLoop(call);
    this.wake();
  }

  /**
   * Awaits a presenter call the way the runner does (autoplay skips it, a stop
   * settles it). The session uses it for the pages it shows itself.
   */
  present<T>(call: () => Promise<T> | T, opts: { readonly answer?: () => OptionLetter | null } = {}): Promise<T> {
    let p: Promise<T>;
    try {
      p = Promise.resolve(call());
    } catch (err) {
      return Promise.reject(err);
    }
    const signal = this.run?.signal ?? NEVER;
    const entry: PendingCall = { settled: false, looping: false, answer: opts.answer ?? null, signal };
    const settle = (): void => {
      entry.settled = true;
      this.pending.delete(entry);
    };
    p.then(settle, settle);
    this.pending.add(entry);
    this.startSkipLoop(entry);
    return this.guard(p, signal);
  }

  // =========================================================================
  // Canto lifecycle (§5.2)
  // =========================================================================

  private async execute(script: CantoScript, opts: RunCantoContext): Promise<CantoOutcome> {
    const controller = new AbortController();
    const chapter = opts.chapter === undefined ? chapterOfCanto(script.id) : opts.chapter;
    const order = opts.order ?? chapter?.cantos ?? [script.id];
    const run: RunCtx = {
      script,
      meta: cantoMeta(script, chapter?.id ?? null),
      controller,
      signal: controller.signal,
      chapter,
      order,
      previous: opts.previous === undefined ? previousInOrder(order, script.id) : opts.previous,
      sceneCtx: null,
      sceneEvents: new Set(),
      queue: [],
      music: null,
      ambience: null,
      hint: null,
      wordChanges: [],
      missed: [],
      chapterEnd: null,
      warned: new Set(),
    };
    this.run = run;
    this.canto = script;
    this.scene = null;
    this.beat = null;
    this.mode = null;
    this.cursor = null;
    this.armedViews = [];
    this.fallbackDue = null;
    this.wakeFlag = false;
    this.setStatus('running');

    const outcome = (status: CantoOutcome['status']): CantoOutcome => ({
      canto: script.id,
      status,
      missed: [...run.missed],
      chapterEnd: run.chapterEnd,
    });

    try {
      this.bus.emit('canto:start', { canto: script.id });
      this.checkStopAt(script.id);
      this.store.setPosition({ canto: script.id, scene: null, beat: null });
      await this.attempt('presenter.beginCanto', () => this.present(() => this.presenter.beginCanto(run.meta)));
      await this.attempt('world.loadCanto', () => this.guard(this.world.loadCanto(script, script.id)));

      const start = this.resolveStart(script, opts.at);
      let headFired = false;
      for (let si = start.sceneIndex; si < script.scenes.length; si++) {
        const res = await this.runScene(si, si === start.sceneIndex ? start.beat : null, headFired);
        headFired = res.nextHeadFired;
      }

      this.store.completeCanto(script.id);
      this.presenterHint(false);
      run.hint = null;
      await this.attempt('presenter.endCanto', () => this.present(() => this.presenter.endCanto(run.meta)));
      const done = outcome('completed');
      this.bus.emit('canto:end', { canto: script.id, outcome: done });
      this.setStatus('finished');
      return done;
    } catch (err) {
      if (!(err instanceof StopRun) && !controller.signal.aborted) {
        this.log('error', `Canto ${script.id} crashed: ${describeError(err)}`, err);
      }
      const stopped = outcome('stopped');
      this.bus.emit('canto:end', { canto: script.id, outcome: stopped });
      this.setStatus('stopped');
      return stopped;
    } finally {
      if (this.run === run) {
        this.run = null;
        this.beat = null;
        this.mode = null;
        this.cursor = null;
        this.armedViews = [];
        run.hint = null;
      }
    }
  }

  private resolveStart(script: CantoScript, at: string | undefined): { sceneIndex: number; beat: BeatId | null } {
    if (!at || at === script.id) return { sceneIndex: 0, beat: null };
    const si = script.scenes.findIndex((s) => s.id === at);
    if (si >= 0) return { sceneIndex: si, beat: null };
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i] as Scene;
      if (scene.beats.some((b) => b.id === at)) return { sceneIndex: i, beat: at };
    }
    this.log('warn', `Start point ${at} is not in ${script.id}; starting at the opening page.`);
    return { sceneIndex: 0, beat: null };
  }

  // =========================================================================
  // Scenes and beat scheduling (§5.3)
  // =========================================================================

  private async runScene(si: number, startBeat: BeatId | null, headFired: boolean): Promise<{ nextHeadFired: boolean }> {
    const run = this.mustRun();
    const scene = run.script.scenes[si] as Scene;
    const beats = scene.beats;
    const sc: SceneCtx = { scene, index: si, status: beats.map((): BeatState => 'pending'), gotoCount: 0 };
    run.sceneCtx = sc;
    run.sceneEvents = new Set();
    run.hint = null;
    this.scene = scene;
    this.checkAbort();

    // Scene start: the save point (continuing replays this scene from its start).
    this.store.markSeen(scene.id);
    this.store.setPosition({ canto: run.script.id, scene: scene.id, beat: null });
    this.store.save();
    this.bus.emit('scene:start', { canto: run.script.id, scene: scene.id });
    this.presenterHint(false);

    let forced: { index: number; inOrder: boolean } | null = null;
    if (headFired && beats.length > 0) forced = { index: 0, inOrder: true };
    if (startBeat) {
      const bi = beats.findIndex((b) => b.id === startBeat);
      if (bi >= 0) {
        for (let k = 0; k < bi; k++) sc.status[k] = 'missed';
        forced = { index: bi, inOrder: true };
      }
    }

    let nextHeadFired = false;
    for (;;) {
      this.checkAbort();
      let pick = forced;
      forced = null;
      if (!pick) {
        const c = sc.status.indexOf('pending');
        if (c < 0) break;
        const cursorBeat = beats[c] as Beat;
        this.cursor = cursorBeat.id;
        if (this.autoLike(cursorBeat, sc)) {
          pick = { index: c, inOrder: true };
        } else {
          const fired = await this.waitForArmed(sc, c);
          if (fired.nextScene) {
            nextHeadFired = true;
            break;
          }
          pick = { index: fired.index, inOrder: fired.index === c };
        }
      }

      const flow = await this.runBeatSafe(sc, pick.index);
      if (flow) {
        forced = this.applyGoto(sc, pick.index, flow.goto, pick.inOrder);
        if (forced) continue;
      }
      if (!pick.inOrder) {
        // An out-of-order beat runs with the auto beats directly after it.
        let reachedLast = pick.index === beats.length - 1;
        let k = pick.index + 1;
        while (k < beats.length && sc.status[k] === 'pending' && this.autoLike(beats[k] as Beat, sc)) {
          const f = await this.runBeatSafe(sc, k);
          if (k === beats.length - 1) reachedLast = true;
          if (f) {
            forced = this.applyGoto(sc, k, f.goto, false);
            break;
          }
          k++;
        }
        if (forced) continue;
        if (reachedLast) break;
      }
    }

    const missed: BeatId[] = [];
    sc.status.forEach((s, k) => {
      if (s !== 'ran') {
        sc.status[k] = 'missed';
        missed.push((beats[k] as Beat).id);
      }
    });
    run.missed.push(...missed);
    this.cursor = null;
    this.bus.emit('scene:end', { canto: run.script.id, scene: scene.id, missed });
    return { nextHeadFired };
  }

  /** `auto`, or `after:` whose beat has run or been missed. */
  private autoLike(beat: Beat, sc: SceneCtx): boolean {
    const t = beat.trigger;
    return t.kind === 'auto' || (t.kind === 'after' && this.afterSatisfied(t.beat, sc));
  }

  private afterSatisfied(beatId: BeatId, sc: SceneCtx): boolean {
    const run = this.mustRun();
    const k = sc.scene.beats.findIndex((b) => b.id === beatId);
    if (k >= 0) return sc.status[k] !== 'pending';
    const si = run.script.scenes.findIndex((s) => s.beats.some((b) => b.id === beatId));
    if (si < 0) this.warnOnce(`after:${beatId} names no beat of ${run.script.id}; treated as satisfied.`);
    else if (si > sc.index) this.warnOnce(`after:${beatId} names a beat of a later scene; treated as satisfied.`);
    return true;
  }

  /** A validated GOTO: beats between are missed (forward) or replayed (backward); the target runs next. */
  private applyGoto(sc: SceneCtx, from: number, target: BeatId, inOrder: boolean): { index: number; inOrder: boolean } | null {
    const t = sc.scene.beats.findIndex((b) => b.id === target);
    if (t < 0) return null;
    if (t > from) {
      for (let k = from + 1; k < t; k++) if (sc.status[k] === 'pending') sc.status[k] = 'missed';
    } else {
      for (let k = t; k < sc.status.length; k++) sc.status[k] = 'pending';
    }
    return { index: t, inOrder };
  }

  private async waitForArmed(sc: SceneCtx, c: number): Promise<{ nextScene: true } | { nextScene: false; index: number }> {
    const run = this.mustRun();
    const beats = sc.scene.beats;
    const entries: ArmedEntry[] = [];
    const add = (beat: Beat, index: number, cursor: boolean, nextScene: boolean, sceneId: string): void => {
      entries.push({
        beat,
        index,
        cursor,
        nextScene,
        view: { beat: beat.id, scene: sceneId, trigger: beat.trigger, cursor, nextScene },
      });
    };
    add(beats[c] as Beat, c, true, false, sc.scene.id);
    for (let k = c + 1; k < beats.length; k++) {
      const b = beats[k] as Beat;
      if (sc.status[k] === 'pending' && b.trigger.kind !== 'auto') add(b, k, false, false, sc.scene.id);
    }
    const nextScene = run.script.scenes[sc.index + 1];
    const head = nextScene?.beats[0];
    if (nextScene && head && isWorldTrigger(head.trigger)) add(head, 0, false, true, nextScene.id);

    const result = (e: ArmedEntry): { nextScene: true } | { nextScene: false; index: number } =>
      e.nextScene ? { nextScene: true } : { nextScene: false, index: e.index };

    this.fallbackDue = null;
    const immediate = this.checkArmed(entries, sc);
    if (immediate) return result(immediate);

    const views = entries.map((e) => e.view);
    this.armedViews = views;
    this.beat = null;
    this.mode = null;
    this.setStatus('waiting');
    this.safe(() => this.world.setPlayerControl(true));
    this.safe(() => this.world.setArmed(views));
    this.bus.emit('beat:armed', { armed: views });

    const waitCtl = new AbortController();
    const onRunAbort = (): void => waitCtl.abort();
    run.signal.addEventListener('abort', onRunAbort, { once: true });
    const cursor = entries[0] as ArmedEntry;

    if (this.cannotProduce(cursor.beat.trigger, sc)) this.startFallback(cursor, waitCtl.signal);
    let autoplayRunning = false;
    const maybeAutoplay = (): void => {
      if (autoplayRunning || !this.autoplay?.triggers) return;
      autoplayRunning = true;
      void this.autoplayTrigger(cursor, sc, waitCtl.signal).then((bailed) => {
        if (bailed) autoplayRunning = false;
      });
    };
    maybeAutoplay();

    try {
      for (;;) {
        await this.nextWake(run.signal);
        this.checkAbort();
        const hit = this.checkArmed(entries, sc);
        if (hit) return result(hit);
        maybeAutoplay();
      }
    } finally {
      waitCtl.abort();
      run.signal.removeEventListener('abort', onRunAbort);
      this.fallbackDue = null;
      this.armedViews = [];
      this.safe(() => this.world.setArmed([]));
      this.bus.emit('beat:armed', { armed: [] });
      if (!run.signal.aborted) this.setStatus('running');
    }
  }

  /** The earliest satisfied armed beat (file order), consuming the signal that satisfied it. */
  private checkArmed(entries: readonly ArmedEntry[], sc: SceneCtx): ArmedEntry | null {
    const run = this.mustRun();
    let hit: ArmedEntry | null = null;
    let consumed = -1;
    for (const e of entries) {
      const t = e.beat.trigger;
      let ok = false;
      let qi = -1;
      switch (t.kind) {
        case 'auto':
          ok = true;
          break;
        case 'after':
          ok = !e.nextScene && this.afterSatisfied(t.beat, sc);
          break;
        case 'event':
          ok = run.sceneEvents.has(t.id);
          break;
        case 'enter':
          qi = run.queue.findIndex((s) => signalMatches(s, t));
          ok = qi >= 0 || this.safeBool(() => this.world.isSatisfied(t));
          break;
        case 'talk':
          qi = run.queue.findIndex((s) => signalMatches(s, t));
          ok = qi >= 0;
          break;
      }
      // A fallback waits while the Book is open, so the story never moves on behind the pause menu.
      if (!ok && e.cursor && this.fallbackDue === e.beat.id && !this.bookOpen) ok = true;
      if (ok) {
        hit = e;
        consumed = qi;
        break;
      }
    }
    if (consumed >= 0) run.queue.splice(consumed, 1);
    // Keep only buffered signals another armed beat still answers to; drop the rest.
    run.queue = run.queue.filter((sig) => entries.some((e) => e !== hit && signalMatches(sig, e.beat.trigger)));
    return hit;
  }

  /** Can the current level never produce this trigger (so the runner must fire it itself)? */
  private cannotProduce(t: Trigger, sc: SceneCtx): boolean {
    if (t.kind === 'auto') return false;
    if (t.kind === 'after') return !this.afterSatisfied(t.beat, sc);
    return !this.safeBool(() => this.world.canSatisfy(t));
  }

  private startFallback(entry: ArmedEntry, signal: AbortSignal): void {
    const ms = this.autoplay
      ? Math.min(this.autoplay.triggerDelayMs, TIMINGS.triggerFallbackMs)
      : TIMINGS.triggerFallbackMs;
    void this.clock.wait(ms, signal).then(() => {
      if (signal.aborted) return;
      this.log(
        'warn',
        `No level produces ${describeTrigger(entry.beat.trigger)} for ${entry.beat.id}; the runner fires it.`,
      );
      this.fallbackDue = entry.beat.id;
      this.wake();
    });
  }

  /** Autoplay: satisfy the cursor trigger through the world, then force it if nothing happens. Resolves true if it bailed out. */
  private async autoplayTrigger(entry: ArmedEntry, sc: SceneCtx, signal: AbortSignal): Promise<boolean> {
    const ap = this.autoplay;
    if (!ap) return true;
    await this.clock.wait(ap.triggerDelayMs, signal);
    if (signal.aborted) return false;
    if (!this.autoplay?.triggers) return true;
    const t = entry.beat.trigger;
    if (this.cannotProduce(t, sc)) {
      this.fallbackDue = entry.beat.id;
      this.wake();
      return false;
    }
    this.safe(() => this.world.satisfy(t));
    this.wake();
    await this.clock.wait(TIMINGS.triggerFallbackMs, signal);
    if (signal.aborted) return false;
    this.log('warn', `Autoplay: ${describeTrigger(t)} did not happen; firing ${entry.beat.id}.`);
    this.fallbackDue = entry.beat.id;
    this.wake();
    return false;
  }

  // =========================================================================
  // Beats (§5.4)
  // =========================================================================

  private async runBeatSafe(sc: SceneCtx, index: number): Promise<Flow> {
    sc.status[index] = 'ran';
    const beat = sc.scene.beats[index] as Beat;
    try {
      return await this.runBeat(sc, beat);
    } catch (err) {
      if (err instanceof StopRun || this.run?.signal.aborted) throw new StopRun();
      this.log('error', `Beat ${beat.id} failed: ${describeError(err)}`, err);
      this.beat = null;
      return null;
    }
  }

  private async runBeat(sc: SceneCtx, beat: Beat): Promise<Flow> {
    const run = this.mustRun();
    const firstVisit = !this.store.state.seen.includes(beat.id);
    this.beat = beat;
    this.mode = beat.mode;
    this.setStatus('running');
    this.bus.emit('beat:start', { canto: run.script.id, scene: sc.scene.id, beat: beat.id, mode: beat.mode });
    this.checkStopAt(beat.id);
    this.store.markSeen(beat.id);
    this.store.setPosition({ beat: beat.id });
    // GDD 2.3: talking with someone fills Grace a little.
    if (beat.trigger.kind === 'talk') this.store.adjustGrace(VERSE_TUNING.graceForTalk);
    if (beat.music) run.music = beat.music;
    if (beat.ambience) run.ambience = beat.ambience;

    const info: BeatRunInfo = {
      canto: run.script,
      scene: sc.scene,
      beat,
      autoplay: this.autoplay !== null,
      signal: run.signal,
    };
    const { doIndex, hintIndex } = indexStatements(beat.lines);
    const bc: BeatCtx = { sc, beat, info, firstVisit, mode: beat.mode, doIndex, hintIndex, collect: null };

    await this.attempt('presenter.setMode', () => this.present(() => this.presenter.setMode(beat.mode, this.beatContext(bc))));
    this.safe(() => this.world.setPlayerControl(beat.mode === 'play'));
    await this.attempt('world.beginBeat', () => this.guard(this.world.beginBeat(info)));

    let flow: Flow = null;
    if (beat.mode === 'colophon') {
      await this.runColophon(bc);
    } else if (sc.scene.number === 0 && beat.mode === 'page') {
      flow = await this.runOpening(bc);
    } else {
      flow = await this.execList(beat.lines, bc);
    }

    await this.attempt('world.endBeat', () => this.guard(this.world.endBeat(info)));
    this.bus.emit('beat:end', { canto: run.script.id, scene: sc.scene.id, beat: beat.id });
    this.beat = null;
    return flow;
  }

  private beatContext(bc: BeatCtx): BeatContext {
    const run = this.mustRun();
    return {
      canto: run.meta,
      sceneId: bc.sc.scene.id,
      sceneTitle: bc.sc.scene.title,
      beatId: bc.beat.id,
      beatTitle: bc.beat.title,
      mode: bc.mode,
      place: bc.beat.place,
      music: run.music,
      ambience: run.ambience,
      firstVisit: bc.firstVisit,
    };
  }

  /** s0 (bible §1.3.1): the first QUOTE is the epigraph on the opening page. */
  private async runOpening(bc: BeatCtx): Promise<Flow> {
    const run = this.mustRun();
    const lines = bc.beat.lines;
    const qi = lines.findIndex((s) => s.type === 'quote');
    const showPage = async (quote: QuoteStmt | null): Promise<void> => {
      let epigraph: QuoteSpec | null = null;
      if (quote) {
        const words = this.takeableWordsAfter(lines, qi);
        epigraph = buildQuoteSpec(quote, { context: 'epigraph', mode: bc.mode, source: this.sourceFor(quote), words });
        this.noteQuote(quote, epigraph, bc);
        this.armCollect(bc, epigraph, lines[qi + 1]);
      }
      const page: OpeningPageSpec = {
        kind: 'opening',
        canto: run.meta,
        canticleLabel: canticleLabel(run.script),
        cantoLabel: cantoLabelOf(run.script),
        vignette: `vignette-${run.script.id}`,
        epigraph,
        firstReading: bc.firstVisit,
        awakening: this.awakening(run),
      };
      await this.present(() => this.presenter.openPage(page));
    };
    if (qi < 0) {
      await this.attempt('opening page', () => showPage(null));
      return this.execList(lines, bc);
    }
    const before = await this.execList(lines.slice(0, qi), bc);
    if (before) return before;
    await this.attempt('opening page', () => showPage(lines[qi] as QuoteStmt));
    return this.execList(lines.slice(qi + 1), bc);
  }

  /** Bible §1.3.9: after a canto that ends in a faint, the epigraph is a waking line. */
  private awakening(run: RunCtx): boolean {
    const prev = run.previous;
    if (!prev) return false;
    const script = this.story.script(prev);
    if (script) return script.front.mechanics.includes('faint');
    return KNOWN_FAINT_CANTOS.includes(prev);
  }

  // =========================================================================
  // Statements (§5.5)
  // =========================================================================

  private async execList(list: readonly Statement[], bc: BeatCtx): Promise<Flow> {
    for (let i = 0; i < list.length; i++) {
      this.checkAbort();
      const stmt = list[i] as Statement;
      if (bc.collect && bc.collect.stmt !== stmt) bc.collect = null;
      let flow: Flow = null;
      try {
        flow = await this.execStmt(stmt, list, i, bc);
      } catch (err) {
        if (err instanceof StopRun || this.run?.signal.aborted) throw new StopRun();
        this.log('error', `${bc.beat.id} line ${stmt.pos.line} (${stmt.type}) failed: ${describeError(err)}`, err);
        continue;
      }
      if (flow) return flow;
    }
    return null;
  }

  private async execStmt(stmt: Statement, list: readonly Statement[], i: number, bc: BeatCtx): Promise<Flow> {
    const run = this.mustRun();
    switch (stmt.type) {
      case 'directive':
        await this.execDirective(stmt, bc);
        return null;

      case 'narration':
        this.store.addLog({ kind: 'narration', canto: run.script.id, beat: bc.beat.id, text: stmt.text });
        await this.present(() => this.presenter.narration(stmt.text, { mode: bc.mode, blocking: bc.mode !== 'play' }));
        return null;

      case 'page':
        this.store.addLog({ kind: 'page', canto: run.script.id, beat: bc.beat.id, text: stmt.text });
        await this.present(() =>
          this.presenter.openPage({ kind: 'text', canto: run.meta, text: stmt.text, mode: bc.mode }),
        );
        return null;

      case 'say':
        await this.present(() =>
          this.presenter.say({
            speaker: stmt.speaker,
            name: speakerName(stmt.speaker),
            tag: stmt.tag,
            text: stmt.text,
            mode: bc.mode,
            fromChoice: false,
          }),
        );
        return null;

      case 'quote':
        await this.execQuote(stmt, list, i, bc);
        return null;

      case 'bark':
        this.safe(() => this.presenter.bark(stmt.speaker, speakerName(stmt.speaker), stmt.text));
        return null;

      case 'hint': {
        const index = bc.hintIndex.get(stmt) ?? 0;
        run.hint = { key: `${bc.beat.id}#${index}`, text: stmt.text, short: stmt.short, beat: bc.beat.id };
        this.presenterHint(true);
        return null;
      }

      case 'do':
        await this.execDo(stmt, bc);
        return null;

      case 'cam':
        await this.execCam(stmt, bc);
        return null;

      case 'sfx':
        this.safe(() => this.presenter.sfx(stmt.text));
        return null;

      case 'effects': {
        const collected = bc.collect && bc.collect.stmt === stmt ? bc.collect.words : undefined;
        bc.collect = null;
        await this.applyEffects(stmt.effects, bc, { collected });
        return null;
      }

      case 'if': {
        const ctx = this.conditions();
        for (const branch of stmt.branches) {
          if (evaluateCondition(branch.condition, ctx)) return this.execList(branch.body, bc);
        }
        return stmt.elseBody ? this.execList(stmt.elseBody, bc) : null;
      }

      case 'choice':
        return this.execChoice(stmt, bc);

      case 'goto':
        return this.execGoto(stmt, bc);

      case 'note':
      case 'unknown':
        return null;
    }
    return null;
  }

  private async execDirective(stmt: DirectiveStmt, bc: BeatCtx): Promise<void> {
    const run = this.mustRun();
    switch (stmt.key) {
      case 'music':
      case 'ambience':
        if (stmt.key === 'music') run.music = stmt.value;
        else run.ambience = stmt.value;
        await this.present(() => this.presenter.setMode(bc.mode, this.beatContext(bc)));
        return;
      case 'place': {
        const place = stmt.value.trim();
        if (!place) return;
        const inside = this.safeBool(() => this.world.isSatisfied({ kind: 'enter', place }));
        if (!inside && !this.safeBool(() => this.world.teleport(place))) {
          this.warnOnce(`@place: ${place} (${bc.beat.id}) is not a place of the current level.`);
        }
        return;
      }
      default:
        // `@mode`, `@trigger`, `@chapter_end` mid-beat are lint errors; ignored at runtime.
        this.warnOnce(`@${stmt.key} in the middle of ${bc.beat.id} is ignored.`);
    }
  }

  private async execQuote(stmt: QuoteStmt, list: readonly Statement[], i: number, bc: BeatCtx): Promise<void> {
    const words = this.takeableWordsAfter(list, i);
    const spec = buildQuoteSpec(stmt, {
      context: bc.mode === 'page' ? 'page' : 'bubble',
      mode: bc.mode,
      source: this.sourceFor(stmt),
      words,
    });
    this.noteQuote(stmt, spec, bc);
    await this.present(() => this.presenter.quote(spec));
    this.armCollect(bc, spec, list[i + 1]);
  }

  /** Words of the EFFECTS line right after statement `i` that the player does not hold yet (or holds sealed). */
  private takeableWordsAfter(list: readonly Statement[], i: number): WordName[] {
    const next = list[i + 1];
    if (!next || next.type !== 'effects') return [];
    const words = this.store.state.words;
    const out: WordName[] = [];
    for (const e of next.effects) {
      if (e.type !== 'word') continue;
      const name = getWord(e.word)?.name ?? e.word;
      if (words.shed.includes(name)) continue;
      if (words.owned.includes(name) && !words.sealed.includes(name)) continue;
      out.push(name);
    }
    return out;
  }

  private armCollect(bc: BeatCtx, spec: QuoteSpec, next: Statement | undefined): void {
    if (spec.collectible.length > 0 && next && next.type === 'effects') {
      bc.collect = { stmt: next, words: new Set(spec.collectible.map((c) => c.word)) };
    }
  }

  /** "As you lived it" log and the gold lines in the Book. */
  private noteQuote(stmt: QuoteStmt, spec: QuoteSpec, bc: BeatCtx): void {
    const run = this.mustRun();
    this.store.addLog({
      kind: 'quote',
      canto: run.script.id,
      beat: bc.beat.id,
      voice: stmt.voice,
      citation: spec.citationText,
      lines: [...spec.lines],
      lineNumbers: [...spec.lineNumbers],
    });
    this.markSpecSeen(spec);
  }

  private markSpecSeen(spec: QuoteSpec): void {
    if (!spec.citation) return;
    const lines = spec.lineNumbers.filter((n): n is number => n !== null);
    this.store.markLinesSeen(spec.citation.canticle, spec.citation.canto, lines);
  }

  private sourceFor(quote: QuoteStmt): SourceCanto | null {
    const c = quote.citation;
    if (!c) return null;
    try {
      return this.story.source(c.canticle, c.canto);
    } catch {
      return null;
    }
  }

  private async execDo(stmt: DoStmt, bc: BeatCtx): Promise<void> {
    const index = bc.doIndex.get(stmt) ?? 0;
    await this.attempt(`world.direct (${bc.beat.id} DO ${index})`, () => this.guard(this.world.direct(stmt, index, bc.info)));
    for (const tag of stmt.tags) {
      if (tag.kind === 'checkpoint') this.safe(() => this.world.checkpoint());
      else if (tag.kind === 'tutorial') this.safe(() => this.presenter.tutorial(tag.name));
      else if (tag.kind === 'event' && this.autoplay && autoplayEmits(this.autoplay, tag.id)) {
        this.bus.emit('world:signal', { kind: 'event', id: tag.id });
      }
    }
  }

  private async execCam(stmt: CamStmt, bc: BeatCtx): Promise<void> {
    const cmd: CamCommand = { verb: stmt.verb, text: stmt.text, mode: bc.mode, beat: bc.beat.id };
    await Promise.all([
      this.attempt(`presenter.camera ${stmt.verb}`, () => this.present(() => this.presenter.camera(cmd))),
      this.attempt(`world.camera ${stmt.verb}`, () => this.guard(this.world.camera(cmd))),
    ]);
  }

  private execGoto(stmt: GotoStmt, bc: BeatCtx): Flow {
    const sc = bc.sc;
    if (!sc.scene.beats.some((b) => b.id === stmt.target)) {
      this.log('error', `GOTO ${stmt.target} in ${bc.beat.id} is not a beat of scene ${sc.scene.id}; ignored.`);
      return null;
    }
    if (sc.gotoCount >= MAX_GOTOS_PER_SCENE) {
      this.log('error', `More than ${MAX_GOTOS_PER_SCENE} GOTOs in scene ${sc.scene.id}; GOTO ${stmt.target} ignored.`);
      return null;
    }
    sc.gotoCount += 1;
    return { goto: stmt.target };
  }

  // =========================================================================
  // Choices and cards (§5.6)
  // =========================================================================

  private async execChoice(stmt: ChoiceStmt, bc: BeatCtx): Promise<Flow> {
    const run = this.mustRun();
    if (stmt.options.length === 0) {
      this.log('warn', `CHOICE ${stmt.id} has no options; skipped.`);
      return null;
    }
    const ctx = this.conditions();
    let option: ChoiceOption;

    if (stmt.systemic) {
      // Evaluated once, now: the first option whose `when:` holds (`when: else` always holds).
      const found = stmt.options.find(
        (o) => o.when === 'else' || (o.when !== null && evaluateCondition(o.when, ctx)),
      );
      if (!found) this.log('warn', `Systemic choice ${stmt.id}: no option holds; taking the last one.`);
      option = found ?? (stmt.options[stmt.options.length - 1] as ChoiceOption);
    } else {
      let visible = stmt.options.filter((o) => o.requires === null || evaluateCondition(o.requires, ctx));
      if (visible.length < 2) {
        this.log('warn', `Choice ${stmt.id}: fewer than two options visible; showing all.`);
        visible = [...stmt.options];
      }
      const spec: ChoiceSpec = { id: stmt.id, title: stmt.title, weight: stmt.weight, prompt: stmt.prompt, mode: bc.mode };
      const views: ChoiceOptionView[] = visible.map((o) => ({ letter: o.letter, text: o.text, spoken: o.spoken }));
      const letter = await this.present(() => this.presenter.choose(spec, views), {
        answer: () => (this.autoplay ? autoplayLetter(this.autoplay, stmt, visible) : null),
      });
      option = visible.find((o) => o.letter === letter) ?? (visible[0] as ChoiceOption);
      if (option.spoken && option.speech) {
        const speech = option.speech;
        await this.present(() =>
          this.presenter.say({
            speaker: 'DANTE',
            name: speakerName('DANTE'),
            tag: null,
            text: speech,
            mode: bc.mode,
            fromChoice: true,
          }),
        );
      }
    }

    // Record (the Book's margin note), then the option's own lines.
    const heading = revealHeading(stmt.reveal, option.letter);
    const record: ChoiceRecord = {
      choice: stmt.id,
      canto: run.script.id,
      beat: bc.beat.id,
      title: stmt.title,
      weight: stmt.weight,
      systemic: stmt.systemic,
      letter: option.letter,
      optionText: option.text,
      canon: stmt.reveal ? (stmt.reveal.canon === 'all' || stmt.reveal.canon === 'none' ? stmt.reveal.canon : [...stmt.reveal.canon]) : null,
      heading,
      note: stmt.reveal?.note ?? null,
      order: this.store.state.stats.choicesMade + 1,
    };
    this.store.recordChoice(record);
    this.bus.emit('choice:made', { choice: stmt.id, letter: option.letter, systemic: stmt.systemic, heading });
    this.store.addLog({
      kind: 'choice',
      canto: run.script.id,
      beat: bc.beat.id,
      choice: stmt.id,
      title: stmt.title,
      letter: option.letter,
      chosenText: option.text,
      heading,
      note: record.note,
    });

    const flow = await this.execList(option.body, bc);
    if (stmt.reveal && heading) await this.handleReveal(stmt, option, heading, bc);
    return flow;
  }

  private async handleReveal(stmt: ChoiceStmt, option: ChoiceOption, heading: RevealHeading, bc: BeatCtx): Promise<void> {
    const run = this.mustRun();
    const reveal = stmt.reveal;
    if (!reveal) return;
    const setting = this.store.settings.revealTiming;
    if (setting === 'book_only') return;
    const source = reveal.quotes[0] ? this.sourceFor(reveal.quotes[0]) : null;
    const immediate = reveal.timing === 'immediate' && setting === 'after_choice';
    const card = buildRevealCard({
      choice: stmt,
      option,
      canto: run.script.id,
      heading,
      mode: bc.mode,
      source,
      deferred: !immediate,
    });
    if (immediate) {
      for (const q of card.quotes) this.markSpecSeen(q);
      await this.present(() => this.presenter.reveal(card));
    } else {
      this.store.pushPendingReveal({ canto: run.script.id, card });
    }
  }

  // =========================================================================
  // Effects and feedback (§5.7)
  // =========================================================================

  private async applyEffects(effects: readonly Effect[], bc: BeatCtx | null, opts: FeedbackOptions = {}): Promise<EffectResult[]> {
    const run = this.mustRun();
    const source: EffectSource = {
      canto: run.script.id,
      beat: bc?.beat.id ?? null,
      ...(opts.system ? { system: true } : {}),
    };
    const results: EffectResult[] = [];
    for (const effect of effects) {
      this.checkAbort();
      const trustBefore = this.store.state.trust;
      const res = this.store.apply(effect, source);
      results.push(res);
      if (!res.changed) continue;
      await this.attempt(`feedback ${effect.type}`, () => this.feedback(res, trustBefore, opts));
    }
    return results;
  }

  private async feedback(res: EffectResult, trustBefore: number, opts: FeedbackOptions): Promise<void> {
    const run = this.mustRun();
    const state = this.store.state;
    const e = res.effect;
    switch (e.type) {
      case 'heart':
        await this.present(() =>
          this.presenter.heartShift({
            side: e.side,
            amount: e.amount,
            sin: e.sin,
            pity: state.heart.pity,
            justice: state.heart.justice,
            visible: state.unlocks.includes('heart'),
          }),
        );
        return;
      case 'trust':
        this.safe(() => this.world.setVirgilTrust(state.trust, state.trust - trustBefore));
        return;
      case 'word':
      case 'seal':
      case 'shed': {
        const def = getWord(e.word);
        const word = def?.name ?? e.word;
        const change: WordChange = {
          word,
          def,
          change: e.type === 'seal' ? 'sealed' : e.type === 'shed' ? 'shed' : res.outcome === 'unsealed' ? 'unsealed' : 'gained',
          collected: e.type === 'word' && (opts.collected?.has(word) ?? false),
          silent: opts.silentWords ?? false,
        };
        run.wordChanges.push(change);
        await this.present(() => this.presenter.wordGained(change));
        // GDD 2.3: reading fills Grace. A word taken from its line gives a little.
        if (change.collected && (change.change === 'gained' || change.change === 'unsealed') && def?.role !== 'burden') {
          this.store.adjustGrace(VERSE_TUNING.graceForWord);
        }
        return;
      }
      case 'memory': {
        const gain: MemoryGain = { id: e.id, entry: this.story.memory(e.id) };
        await this.present(() => this.presenter.memoryGained(gain));
        return;
      }
      case 'codex': {
        const gain: CodexGain = { id: e.id, entry: this.story.codex(e.id), silent: !state.unlocks.includes('codex') };
        await this.present(() => this.presenter.codexGained(gain));
        return;
      }
      case 'unlock':
        await this.present(() => this.presenter.unlock(e.feature));
        return;
      case 'virtue':
      case 'flag':
      case 'resolve':
      case 'grace':
      case 'gracemax':
        // Virtues and flags have no feedback; resources reach the HUD through 'resources:changed'.
        return;
    }
  }

  // =========================================================================
  // Colophon and chapter end (§5.9)
  // =========================================================================

  private async runColophon(bc: BeatCtx): Promise<void> {
    const run = this.mustRun();
    const script = run.script;
    const lines = bc.beat.lines;
    let closing: QuoteSpec | null = null;
    const highlight: WordName[] = [];

    for (let i = 0; i < lines.length; i++) {
      this.checkAbort();
      const stmt = lines[i] as Statement;
      try {
        if (stmt.type === 'quote' && !closing) {
          closing = buildQuoteSpec(stmt, { context: 'colophon', mode: 'colophon', source: this.sourceFor(stmt) });
          this.noteQuote(stmt, closing, bc);
        } else if (stmt.type === 'effects') {
          // The colophon's words glow on the page / deferred cards; the take there is the flourish.
          for (const e of stmt.effects) if (e.type === 'word') highlight.push(getWord(e.word)?.name ?? e.word);
          await this.applyEffects(stmt.effects, bc, { silentWords: true });
        } else if (stmt.type === 'goto') {
          this.warnOnce(`GOTO in the colophon of ${script.id} is ignored.`);
        } else {
          await this.execStmt(stmt, lines, i, bc);
        }
      } catch (err) {
        if (err instanceof StopRun || run.signal.aborted) throw new StopRun();
        this.log('error', `Colophon ${bc.beat.id} line ${stmt.pos.line} failed: ${describeError(err)}`, err);
      }
    }

    // Deferred "What Dante did" cards open here; a highlighted word whose origin line is on a card glows there.
    const pending = this.store.takePendingReveals(script.id);
    const reveals: RevealCard[] =
      this.store.settings.revealTiming === 'book_only'
        ? []
        : pending.map((p) => {
            const quotes = p.card.quotes.map((q) => withCollectibles(q, highlight));
            const onCard = highlight.filter((w) => quotes.some((q) => q.collectible.some((c) => c.word === w)));
            return { ...p.card, quotes, deferred: true, highlightWords: onCard };
          });
    for (const card of reveals) for (const q of card.quotes) this.markSpecSeen(q);

    const state = this.store.state;
    const next = nextInOrder(run.order, script.id);
    const spec: ColophonSpec = {
      canto: run.meta,
      canticleLabel: canticleLabel(script),
      cantoLabel: cantoLabelOf(script),
      closing,
      choices: choiceRows(state, script.id),
      reveals,
      words: this.colophonWords(script.id),
      codex: state.codex
        .filter((id) => id.startsWith(`${script.id}.`))
        .map((id) => ({ id, entry: this.story.codex(id), silent: !state.unlocks.includes('codex') })),
      memories: state.memories
        .filter((id) => id.startsWith(`${script.id}.`))
        .map((id) => ({ id, entry: this.story.memory(id) })),
      heart: { pity: state.heart.pity, justice: state.heart.justice, visible: state.unlocks.includes('heart') },
      highlightWords: highlight,
      fullTextUnlocked: true,
      next: next ? { cantoId: next, label: cantoLabel(this.story.script(next)?.cantoNumber ?? cantoNumberOf(next)) } : null,
    };
    await this.present(() => this.presenter.colophon(spec));

    if (bc.beat.chapterEnd) {
      run.chapterEnd = bc.beat.chapterEnd;
      await this.runChapterEnd(bc.beat.chapterEnd, bc);
    }
  }

  /** Word changes of this canto: what happened in this run, plus words of this canto held now (resumed runs). */
  private colophonWords(canto: CantoId): WordChange[] {
    const run = this.mustRun();
    const words: WordChange[] = [...run.wordChanges];
    for (const name of this.store.state.words.owned) {
      const def = getWord(name);
      if (!def || def.canto !== canto) continue;
      if (words.some((c) => c.word === def.name && (c.change === 'gained' || c.change === 'unsealed'))) continue;
      words.push({ word: def.name, def, change: 'gained', collected: false, silent: true });
    }
    return words;
  }

  private async runChapterEnd(chapterId: string, bc: BeatCtx): Promise<void> {
    const run = this.mustRun();
    const flags = chapterEndFlags(chapterId, this.store.state);
    await this.applyEffects(
      flags.map((id): Effect => ({ type: 'flag', id })),
      bc,
      { system: true },
    );
    const state = this.store.state;
    const chapter = chapterById(chapterId);
    const order = run.order.length > 0 ? run.order : chapter.cantos;
    const summary: ChapterSummary = {
      chapter,
      flags,
      heart: { pity: state.heart.pity, justice: state.heart.justice },
      trust: state.trust,
      trustLabel: trustLabel(state.trust),
      virtues: { ...state.virtues },
      words: [...state.words.owned],
      memories: state.memories.map((id) => ({ id, entry: this.story.memory(id) })),
      verses: state.verses.map((v) => ({
        canto: v.canto,
        order: v.order,
        verse: { tercets: v.verse.tercets.map((t) => [t[0], t[1], t[2]] as const), coda: v.verse.coda },
      })),
      cantos: order
        .filter((id) => state.completedCantos.includes(id) || id === run.script.id)
        .map((id) => ({
          id,
          title: this.story.script(id)?.front.title ?? KNOWN_CANTO_TITLES[id] ?? id,
          choices: choiceRows(state, id),
        })),
    };
    await this.present(() => this.presenter.chapterEnd(summary));
    this.bus.emit('chapter:end', { chapter: chapterId });
  }

  // =========================================================================
  // Signals, waking, conditions
  // =========================================================================

  private onSignal(sig: WorldSignal): void {
    if (sig.kind === 'event') {
      this.store.recordEvent(sig.id);
      if (this.run) {
        this.run.sceneEvents.add(sig.id);
        this.wake();
      }
      return;
    }
    if (sig.kind === 'exit' || !this.run) return;
    this.run.queue.push(sig);
    this.wake();
  }

  private wake(): void {
    this.wakeFlag = true;
    const resolve = this.wakeResolver;
    this.wakeResolver = null;
    resolve?.();
  }

  private nextWake(signal: AbortSignal): Promise<void> {
    if (this.wakeFlag || signal.aborted) {
      this.wakeFlag = false;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const onAbort = (): void => {
        this.wakeResolver = null;
        resolve();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this.wakeResolver = (): void => {
        signal.removeEventListener('abort', onAbort);
        this.wakeFlag = false;
        resolve();
      };
    });
  }

  /** store.conditions() with the scene-scoped `event:` predicate (bible §2.9). */
  private conditions(): ConditionContext {
    const base = this.store.conditions();
    const run = this.run;
    if (!run) return base;
    return withEventScope(base, (id) => run.sceneEvents.has(id));
  }

  // =========================================================================
  // Autoplay, guards, logging
  // =========================================================================

  private checkStopAt(id: string): void {
    if (this.autoplay?.stopAt && this.autoplay.stopAt === id) {
      this.log('info', `Autoplay paused at ${id}.`);
      this.autoplay = null;
    }
  }

  private startSkipLoop(call: PendingCall): void {
    if (call.looping || call.settled || !this.autoplay || call.signal.aborted) return;
    call.looping = true;
    let refused = 0;
    const loop = async (): Promise<void> => {
      while (!call.settled && this.autoplay && !call.signal.aborted) {
        await this.clock.wait(this.autoplay.textDelayMs, call.signal);
        if (call.settled || !this.autoplay || call.signal.aborted) break;
        try {
          if (call.answer) {
            // The margin may not be open yet (a prompt still on screen): retry, and now and then skip the prompt.
            const letter = call.answer();
            if (!(letter && this.presenter.answer(letter)) && ++refused % 3 === 0) this.presenter.skip();
          } else {
            this.presenter.skip();
          }
        } catch (err) {
          this.log('warn', `Autoplay skip failed: ${describeError(err)}`);
        }
      }
      call.looping = false;
    };
    void loop();
  }

  /** Races a promise against the run's abort signal (a stopped run never hangs on a presenter or world call). */
  private guard<T>(p: Promise<T>, signal: AbortSignal = this.run?.signal ?? NEVER): Promise<T> {
    if (signal === NEVER) return p;
    if (signal.aborted) {
      p.catch(() => undefined);
      return Promise.reject(new StopRun());
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => reject(new StopRun());
      signal.addEventListener('abort', onAbort, { once: true });
      p.then(
        (v) => {
          signal.removeEventListener('abort', onAbort);
          if (signal.aborted) reject(new StopRun());
          else resolve(v);
        },
        (err: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(signal.aborted ? new StopRun() : err);
        },
      );
    });
  }

  /** Runs an async step; a failure is logged and play goes on (a stop still unwinds). */
  private async attempt(label: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      if (err instanceof StopRun || this.run?.signal.aborted) throw new StopRun();
      this.log('error', `${label} failed: ${describeError(err)}`, err);
    }
  }

  private safe(fn: () => unknown): void {
    try {
      fn();
    } catch (err) {
      this.log('error', `Call failed: ${describeError(err)}`, err);
    }
  }

  private safeBool(fn: () => boolean): boolean {
    try {
      return fn() === true;
    } catch (err) {
      this.log('error', `Call failed: ${describeError(err)}`, err);
      return false;
    }
  }

  private presenterHint(available: boolean): void {
    this.safe(() => this.presenter.hintAvailable(available));
  }

  private checkAbort(): void {
    if (!this.run || this.run.signal.aborted) throw new StopRun();
  }

  private mustRun(): RunCtx {
    if (!this.run) throw new StopRun();
    return this.run;
  }

  private setStatus(status: RunnerStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.bus.emit('runner:status', { status });
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    this.bus.emit('debug:log', data === undefined ? { level, message } : { level, message, data });
  }

  private warnOnce(message: string): void {
    const run = this.run;
    if (run) {
      if (run.warned.has(message)) return;
      run.warned.add(message);
    }
    this.log('warn', message);
  }
}

export const createStoryRunner: CreateStoryRunner = (deps) => new Runner(deps);
