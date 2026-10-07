/**
 * The StoryPresenter: book pages, narration strips, dialogue and verse
 * bubbles, the choice margin, "What Dante did" cards, feedback, the colophon
 * and the chapter end (bible §1.3–§1.6, ENGINE §5 and §7), implemented with
 * the UI / BookPage / BookMenu / Title scenes.
 *
 * Owner: team C (presentation). Contract: StoryPresenter (CreatePresenter).
 *
 * Design
 * - Every awaited call registers one interaction element (src/ui/pending.ts)
 *   synchronously; input, `skip()`, `answer()` and `cancelAll()` go to it.
 *   Drawing waits for the scenes (started on demand), so construction never
 *   touches a scene.
 * - A small stage machine decides where things are drawn: over the world (UI
 *   scene) or on the open book (BookPage scene): opening pages, reading pages
 *   of page-mode beats, the colophon, the chapter end, missing cantos.
 * - Input comes from one router (keyboard, pointer, pad); the presenter is its
 *   base handler, the Title and the Book push themselves on top.
 * - Nothing here throws into the runner: failures are logged on the bus and
 *   the element settles.
 */

import type * as Phaser from 'phaser';
import { TIMINGS } from '../config';
import { tryServices } from '../app/services';
import type {
  BeatContext,
  CamCommand,
  CantoMeta,
  ChapterSummary,
  ChoiceOptionView,
  ChoiceSpec,
  CodexGain,
  ColophonSpec,
  CreatePresenter,
  HeartShift,
  HintSpec,
  MemoryGain,
  MissingCantoSpec,
  NarrationOptions,
  OpeningPageSpec,
  PageSpec,
  PhaserDeps,
  QuoteSpec,
  RevealCard,
  SayLine,
  StoryPresenter,
  TextPageSpec,
  WordChange,
} from '../runtime/contracts';
import { SceneKeys } from '../scenes/keys';
import { getWord } from '../story/words';
import type { BeatMode, OptionLetter, SpeakerId, TutorialName, UnlockFeature, WordName } from '../story/types';
import { closeBook, forgetBook, isBookOpen, openBook } from './bookControl';
import { watchCanvasQuality } from './canvasQuality';
import { renderSummaryPage, summaryHeights } from './components/summary';
import { PAGE, type ComingCanto } from './components/BookSpread';
import { formatCitation, toRoman } from '../story/cite';
import { revealNodes } from './components/verseLines';
import { configureUiContext, sfx, uiContext } from './context';
import type { UiAction } from './inputMap';
import { ChoiceCursor } from './models/choice';
import { chapterBlocks, colophonBlocks, paginate, type SummaryBlock } from './models/colophon';
import { tutorialCopy, unlockCopy } from './models/copy';
import { delay, ensureScene, getScene, isAlive, now, stopScene } from './phaser/helpers';
import { Pending } from './pending';
import { InputRouter, setUiRouter, type ActionMeta, type InputHandler, type PointerMeta } from './router';
import type { BookPageApi, UiSceneApi } from './sceneApi';
import { readingMs, verseChunks } from './text';

type Stage = 'none' | 'curtain' | 'page' | 'holdover' | 'reading' | 'lingering';

/** How long the opening vignette / a closed reading spread waits for an unengrave before giving way. */
const LINGER_MS = 1500;

/** Curtain behind the reading spread of page-mode beats (the world dimmed, not gone). */
const READING_CURTAIN = 0.86;

/** `busy` stays true this long after a blocking element closes (the closing key belongs to the book). */
const BUSY_TAIL_MS = 220;

function describe(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

class Presenter implements StoryPresenter, InputHandler {
  private readonly game: Phaser.Game;
  private current: Pending<unknown> | null = null;
  private mode: BeatMode = 'play';
  private canto: CantoMeta | null = null;
  private stage: Stage = 'none';
  private stageToken = 0;
  private hintOn = false;
  private blockingEndedAt = -1e9;
  /** Screen positions of glowing words when they were taken (their cards grow from there). */
  private readonly anchors = new Map<WordName, { x: number; y: number }>();
  private readonly router: InputRouter;

  constructor(private readonly deps: PhaserDeps) {
    this.game = deps.game;
    configureUiContext({ settings: () => deps.store.settings, audio: deps.audio, bus: deps.bus });
    this.router = new InputRouter(deps.game);
    this.router.base(this);
    setUiRouter(this.router);
    watchCanvasQuality(deps.game);
    deps.bus.on('settings:changed', (p) => {
      try {
        deps.audio.setVolumes({ master: p.settings.masterVolume, music: p.settings.musicVolume, sfx: p.settings.sfxVolume });
      } catch {
        // audio is optional
      }
    });
  }

  // =========================================================================
  // Infrastructure
  // =========================================================================

  get busy(): boolean {
    if ((this.current?.blocking ?? false) || isBookOpen()) return true;
    // The key that closed a page or a balloon must not also reach the world in the same frame
    // (E would talk to whoever stands nearby again).
    return now() - this.blockingEndedAt < BUSY_TAIL_MS;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    try {
      this.deps.bus.emit('debug:log', data === undefined ? { level, message } : { level, message, data });
    } catch {
      // nothing else to do
    }
  }

  private begin<T>(kind: string, blocking: boolean, fallback: T): Pending<T> {
    const el = new Pending<T>(kind, blocking, fallback, (p) => {
      if (p.blocking) this.blockingEndedAt = now();
      if (this.current === (p as Pending<unknown>)) this.current = null;
    }, now);
    if (this.current && !this.current.done) {
      // The runner awaits one call at a time; a stale element is settled so nothing hangs.
      this.current.cancel();
    }
    this.current = el as Pending<unknown>;
    return el;
  }

  /** Run an async body for an element; failures are logged and the element settles. */
  private run<T>(el: Pending<T>, body: () => Promise<void>): Promise<T> {
    void body().catch((err: unknown) => {
      this.log('error', `presenter ${el.kind} failed: ${describe(err)}`, err);
      el.settle();
    });
    return el.promise;
  }

  private async ui(): Promise<UiSceneApi | null> {
    this.leaveTitle();
    return ensureScene<UiSceneApi>(this.game, SceneKeys.UI);
  }

  private async book(): Promise<BookPageApi | null> {
    this.leaveTitle();
    await ensureScene<UiSceneApi>(this.game, SceneKeys.UI);
    return ensureScene<BookPageApi>(this.game, SceneKeys.BookPage);
  }

  private leaveTitle(): void {
    if (isAlive(this.game, SceneKeys.Title)) stopScene(this.game, SceneKeys.Title);
  }

  private uiNow(): UiSceneApi | null {
    const s = getScene<UiSceneApi>(this.game, SceneKeys.UI);
    return s && s.uiReady && isAlive(this.game, SceneKeys.UI) ? s : null;
  }

  private bookNow(): BookPageApi | null {
    const s = getScene<BookPageApi>(this.game, SceneKeys.BookPage);
    return s && s.uiReady && isAlive(this.game, SceneKeys.BookPage) ? s : null;
  }

  /** Overlays go on the open book while a page is up, else over the world. */
  private async host(): Promise<UiSceneApi | BookPageApi | null> {
    if (this.stage === 'page' || this.stage === 'reading') {
      const bp = await this.book();
      if (bp) return bp;
    }
    return this.ui();
  }

  private hostNow(): UiSceneApi | BookPageApi | null {
    if (this.stage === 'page' || this.stage === 'reading') return this.bookNow() ?? this.uiNow();
    return this.uiNow();
  }

  private sceneOf(host: UiSceneApi | BookPageApi): Phaser.Scene {
    return host as unknown as Phaser.Scene;
  }

  // =========================================================================
  // Input
  // =========================================================================

  onAction(action: UiAction, meta: ActionMeta): boolean {
    if (action === 'book') {
      if (this.session().status === 'playing') this.toggleBook();
      return true;
    }
    if (action === 'askVirgil') {
      if (!meta.repeat) this.askVirgil();
      return true;
    }
    const cur = this.current;
    if (cur && !cur.done) return cur.onAction(action, meta, now());
    // Nothing awaited: Enter / click close an open margin note.
    if (action === 'advance' && meta.code === 'Enter') {
      const h = this.hostNow();
      if (h?.overlays.hint.open) {
        void h.overlays.hint.close();
        return true;
      }
    }
    return false;
  }

  onPointer(meta: PointerMeta): boolean {
    // The HUD's own controls (the Book icon, Ask Virgil) take their clicks themselves.
    if (this.stage === 'none' && this.uiNow()?.hud.hitTest(meta.x, meta.y)) return true;
    const cur = this.current;
    if (cur && !cur.done) return cur.onPointer(meta, now());
    return false;
  }

  private session(): { status: string } {
    return this.deps.session;
  }

  private toggleBook(): void {
    if (isBookOpen()) closeBook(this.game, this.deps.bus);
    else openBook(this.game, this.deps.bus, {});
  }

  /** E / Enter / Space / pad A–Y on a blocking element; only Enter on a non-blocking one (E belongs to the world then). */
  private isAdvance(action: UiAction, meta: ActionMeta, blocking: boolean): boolean {
    if (meta.repeat) return false;
    if (action !== 'advance') return false;
    if (blocking) return true;
    return meta.code === 'Enter' || meta.code === 'NumpadEnter';
  }

  /** Q: the gloss of the verse on screen, else Virgil's hint (GDD 2.5, ENGINE §5.10). */
  private askVirgil(): void {
    const gloss = this.current && !this.current.done ? this.current.gloss() : null;
    // A gloss belongs to the verse on screen; Virgil's hint needs a journey under way.
    if (!gloss && this.session().status !== 'playing') return;
    void (async () => {
      const host = await this.host();
      if (!host) return;
      const panel = host.overlays.hint;
      if (panel.open) {
        await panel.close();
        return;
      }
      if (gloss) {
        void panel.show('gloss', gloss, { side: this.noteSide(host) });
        return;
      }
      let spec: HintSpec | null = null;
      try {
        spec = this.deps.session.askVirgil();
      } catch (err) {
        this.log('warn', `askVirgil failed: ${describe(err)}`);
      }
      this.deps.bus.emit('ui:ask-virgil', { answered: spec !== null });
      if (spec) void this.hint(spec);
      else void panel.show('silent', '', { side: this.noteSide(host) });
    })().catch((err: unknown) => this.log('error', `Ask Virgil failed: ${describe(err)}`));
  }

  // =========================================================================
  // Stage: where the book is
  // =========================================================================

  /** Clear pages / curtain / vignette so the world shows (content is about to appear over it). */
  private async toWorld(fast = false): Promise<void> {
    const stage = this.stage;
    if (stage === 'none') return;
    this.stage = 'none';
    this.stageToken++;
    const bp = this.bookNow();
    if (!bp) return;
    const ms = fast ? 0 : 300;
    if (stage === 'holdover') {
      await bp.dropVignette(ms);
    } else if (stage === 'reading' || stage === 'lingering' || stage === 'page') {
      await Promise.all([bp.spread.close(!fast), bp.hideCurtain(ms)]);
    } else {
      await bp.hideCurtain(ms);
    }
  }

  /** After leaving page mode, a lingering book or vignette gives way by itself. */
  private armLinger(): void {
    const token = ++this.stageToken;
    const bp = this.bookNow();
    if (!bp) return;
    void delay(bp as unknown as Phaser.Scene, LINGER_MS).then(() => {
      if (token === this.stageToken && (this.stage === 'holdover' || this.stage === 'lingering' || this.stage === 'curtain')) {
        void this.toWorld();
      }
    });
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  beginCanto(meta: CantoMeta): Promise<void> {
    this.canto = meta;
    const el = this.begin<void>('beginCanto', false, undefined);
    return this.run(el, async () => {
      const ui = await this.ui();
      const bp = await this.book();
      if (ui) {
        ui.fx.reset();
        ui.overlays.clearAll();
        ui.setCanto(meta.location, `Canto ${meta.roman}`);
        ui.hud.setHint(false);
      }
      this.hintOn = false;
      if (bp && this.stage !== 'page') {
        bp.reset();
        bp.showCurtain(1);
        this.stage = 'curtain';
      }
      try {
        this.deps.audio.cue(null, null, meta.id);
      } catch {
        // optional
      }
      el.settle();
    });
  }

  endCanto(_meta: CantoMeta): Promise<void> {
    void _meta;
    return Promise.resolve();
  }

  setMode(mode: BeatMode, ctx: BeatContext): Promise<void> {
    this.mode = mode;
    try {
      this.deps.audio.cue(ctx.music, ctx.ambience, ctx.canto.id);
    } catch {
      // optional
    }
    const ui = this.uiNow();
    if (ui) {
      ui.hud.setMode(mode);
      ui.fx.setLetterbox(mode === 'cinematic');
    }
    if (mode !== 'page' && mode !== 'colophon') {
      if (this.stage === 'reading') this.stage = 'lingering';
      if (this.stage === 'holdover' || this.stage === 'lingering' || this.stage === 'curtain') this.armLinger();
    }
    return Promise.resolve();
  }

  showTitle(): void {
    this.cancelAll();
    forgetBook(this.game);
    try {
      tryServices()?.world.unloadCanto();
    } catch (err) {
      this.log('warn', `world.unloadCanto failed: ${describe(err)}`);
    }
    try {
      this.deps.audio.stopAll();
    } catch {
      // optional
    }
    this.stage = 'none';
    for (const key of [SceneKeys.BookMenu, SceneKeys.BookPage, SceneKeys.UI, SceneKeys.World]) stopScene(this.game, key);
    try {
      this.game.scene.start(SceneKeys.Title);
    } catch (err) {
      this.log('error', `Title could not start: ${describe(err)}`);
    }
  }

  // =========================================================================
  // Pages
  // =========================================================================

  openPage(page: PageSpec): Promise<void> {
    return page.kind === 'opening' ? this.openingPage(page) : this.textPage(page);
  }

  private openingPage(spec: OpeningPageSpec): Promise<void> {
    const el = this.begin<void>('opening', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      this.stage = 'page';
      this.stageToken++;
      bp.overlays.clearAll();
      bp.showCurtain(1);
      bp.spread.clear();
      await bp.spread.open(!el.done);
      if (el.done) return this.bailPage(bp);
      const layout = bp.spread.layoutOpening(spec);
      const scene = bp as unknown as Phaser.Scene;
      const lines = layout.epigraph;
      let revealed = 0;
      let linesDone = lines.length === 0;
      const taken = new Set<string>();
      const words = layout.words;
      const quote = spec.epigraph;
      const shownAt = now();
      const minMs = spec.firstReading ? TIMINGS.pageMinFirstReadingMs : 0;
      let turning = false;
      let prompted = false;
      const pendingWords = (): string[] =>
        (quote?.collectible ?? []).filter((c) => !c.auto && !taken.has(c.word) && words.some((w) => w.word === c.word)).map((c) => c.word);
      const maybePrompt = (): void => {
        if (prompted || turning || !linesDone || pendingWords().length > 0) return;
        const wait = Math.max(0, minMs - (now() - shownAt));
        prompted = true;
        bp.spread.showTurnPrompt('Turn ▸', wait);
      };
      const revealLine = (k: number): void => revealNodes(scene, lines[k] ?? [], 500);
      const revealAll = (): void => {
        for (let k = revealed; k < lines.length; k++) revealLine(k);
        revealed = lines.length;
        linesDone = true;
        this.autoTake(quote, words.map((w) => w.word), (w) => bp.spread.wordAnchor(w), (w) => bp.spread.dim(w), taken);
        maybePrompt();
      };
      if (uiContext().settings().verseDisplay === 'all_at_once' || lines.length === 0) {
        revealAll();
      } else {
        const step = (): void => {
          if (el.done || linesDone) return;
          revealLine(revealed);
          revealed += 1;
          sfx('verse');
          if (revealed >= lines.length) revealAll();
          else void delay(scene, TIMINGS.verseLineIntervalMs).then(step);
        };
        void delay(scene, 450).then(step);
      }
      const take = (word: string): void => {
        taken.add(word);
        const at = bp.spread.wordAnchor(word);
        if (at) this.anchors.set(word, at);
        bp.spread.dim(word);
        sfx('word');
        maybePrompt();
      };
      const turn = async (): Promise<void> => {
        if (turning) return;
        turning = true;
        bp.spread.hideTurnPrompt();
        sfx('page');
        bp.holdVignette(layout.vignette);
        await bp.spread.close(true);
        this.stage = 'holdover';
        el.settle();
      };
      const press = (): boolean => {
        if (turning) return true;
        if (!linesDone) {
          revealAll();
          return true;
        }
        const pending = pendingWords();
        if (pending.length > 0) {
          take(pending[0] as string);
          return true;
        }
        if (now() - shownAt < minMs) return true;
        void turn();
        return true;
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) || (a === 'interact' && pendingWords().length > 0 && !m.repeat) ? press() : false),
        onPointer: () => press(),
        gloss: () => quote?.gloss ?? null,
        skip: () => {
          for (const w of pendingWords()) take(w);
          linesDone = true;
          turning = true;
          bp.holdVignette(layout.vignette);
          void bp.spread.close(false);
          this.stage = 'holdover';
          el.settle();
        },
        cancel: () => this.bailPage(bp),
      };
    });
  }

  /** A page flow ended early: no book, curtain up (the next mode change lifts it). */
  private bailPage(bp: BookPageApi): void {
    void bp.spread.close(false);
    bp.holdVignette(null);
    bp.showCurtain(1);
    this.stage = 'curtain';
  }

  /** Burden words stick by themselves once their line is shown (bible §3.4.2 rule 5). */
  private autoTake(
    quote: QuoteSpec | null | undefined,
    shown: readonly string[],
    anchor: (w: string) => { x: number; y: number } | null,
    dim: (w: string) => void,
    taken: Set<string>,
  ): void {
    if (!quote) return;
    for (const c of quote.collectible) {
      if (!c.auto || taken.has(c.word) || !shown.includes(c.word)) continue;
      taken.add(c.word);
      const at = anchor(c.word);
      if (at) this.anchors.set(c.word, at);
      dim(c.word);
    }
  }

  private textPage(spec: TextPageSpec): Promise<void> {
    const el = this.begin<void>('page', true, undefined);
    return this.run(el, async () => {
      const inBook = spec.mode === 'page';
      if (!inBook) await this.toWorld();
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      const reading = inBook && (this.stage === 'reading' || this.stage === 'lingering') && bp.spread.isOpen;
      if (reading) {
        await bp.spread.turn();
      } else {
        // Over the world: the book on a dark table, the world dimmed behind it.
        if (!inBook) bp.showCurtain(0.82);
        bp.spread.clear();
        await bp.spread.open(true);
      }
      if (el.done) return;
      this.stage = inBook ? 'reading' : 'page';
      const meta = spec.canto;
      bp.spread.layoutTextPage(spec.text, meta.id, `CANTO ${meta.roman}`, meta.title);
      const shownAt = now();
      bp.spread.showTurnPrompt('Turn ▸', 600);
      let closing = false;
      const close = async (fast: boolean): Promise<void> => {
        if (closing) return;
        closing = true;
        bp.spread.hideTurnPrompt();
        if (inBook) {
          if (fast) bp.spread.clear();
          else await bp.spread.turn();
          this.stage = 'reading';
        } else {
          await Promise.all([bp.spread.close(!fast), bp.hideCurtain(fast ? 0 : 300)]);
          this.stage = 'none';
        }
        el.settle();
      };
      const press = (): boolean => {
        if (now() - shownAt < 500) return true;
        void close(false);
        return true;
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? press() : false),
        onPointer: () => press(),
        skip: () => void close(true),
        cancel: () => {
          bp.spread.clear();
          if (!inBook) void bp.spread.close(false);
        },
      };
    });
  }

  /** Open the reading spread for page-mode content (Canto II's told story). */
  private async ensureReading(bp: BookPageApi): Promise<void> {
    if ((this.stage === 'reading' || this.stage === 'lingering') && bp.spread.isOpen) {
      this.stage = 'reading';
      this.stageToken++;
      return;
    }
    if (this.stage === 'holdover') await bp.dropVignette(200);
    this.stage = 'reading';
    this.stageToken++;
    // The book is read on a dark table: the world stays faintly behind it.
    await bp.dimCurtain(READING_CURTAIN, 200);
    bp.spread.clear();
    await bp.spread.open(true);
  }

  private async pageSpace(bp: BookPageApi, needed: number): Promise<void> {
    if (bp.spread.spaceLeft() < needed && bp.spread.right.length > 0) await bp.spread.turn();
  }

  // =========================================================================
  // Text
  // =========================================================================

  narration(text: string, opts: NarrationOptions): Promise<void> {
    if (opts.mode === 'page') return this.pageProse(text);
    const el = this.begin<void>('narration', opts.blocking, undefined);
    return this.run(el, async () => {
      await this.toWorld();
      const ui = await this.ui();
      if (!ui || el.done) return el.settle();
      const strip = ui.overlays.strip;
      strip.show(text, opts.blocking);
      const close = (fast: boolean): void => {
        if (el.done) return;
        void strip.hide(fast);
        el.settle();
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, opts.blocking) ? (close(false), true) : false),
        onPointer: () => (close(false), true),
        skip: () => close(true),
        cancel: () => strip.clear(),
      };
      if (!opts.blocking) {
        const ms = readingMs(text);
        strip.runThread(ms);
        void delay(this.sceneOf(ui), ms).then(() => close(false));
      }
    });
  }

  private pageProse(text: string): Promise<void> {
    const el = this.begin<void>('page-prose', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      await this.ensureReading(bp);
      await this.pageSpace(bp, bp.spread.measureProse(text));
      if (el.done) return;
      if (this.canto) bp.spread.illustrate(this.canto.id, null);
      bp.spread.appendProse(text);
      bp.spread.showTurnPrompt('▸', 500);
      const shownAt = now();
      const done = (): boolean => {
        if (now() - shownAt < 350) return true;
        bp.spread.hideTurnPrompt();
        el.settle();
        return true;
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? done() : false),
        onPointer: () => done(),
        skip: () => {
          bp.spread.hideTurnPrompt();
          el.settle();
        },
      };
    });
  }

  say(line: SayLine): Promise<void> {
    if (line.mode === 'page' && (this.stage === 'reading' || this.stage === 'page')) return this.pageSpeech(line);
    const blocking = line.mode !== 'play';
    const el = this.begin<void>('say', blocking, undefined);
    return this.run(el, async () => {
      await this.toWorld();
      const ui = await this.ui();
      if (!ui || el.done) return el.settle();
      const bubble = ui.overlays.dialog;
      const scene = this.sceneOf(ui);
      let token = 0;
      const close = (fast: boolean): void => {
        if (el.done) return;
        void bubble.hide(fast);
        el.settle();
      };
      bubble.show(line, {
        blocking,
        onTyped: () => {
          if (blocking) return;
          const ms = readingMs(line.text);
          bubble.runThread(ms);
          const t = ++token;
          void delay(scene, ms).then(() => {
            if (t === token) close(false);
          });
        },
      });
      ui.overlays.tutorial.setBottom(bubble.topY);
      const press = (): boolean => {
        if (bubble.typing) bubble.finishTyping();
        else close(false);
        return true;
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, blocking) ? press() : false),
        onPointer: () => press(),
        skip: () => close(true),
        cancel: () => bubble.clear(),
      };
    });
  }

  private pageSpeech(line: SayLine): Promise<void> {
    const el = this.begin<void>('page-say', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      await this.ensureReading(bp);
      await this.pageSpace(bp, bp.spread.measureSpeech(line.text));
      if (el.done) return;
      bp.spread.appendSpeech(line.name, line.text);
      bp.spread.showTurnPrompt('▸', 400);
      const shownAt = now();
      const done = (): boolean => {
        if (now() - shownAt < 350) return true;
        bp.spread.hideTurnPrompt();
        el.settle();
        return true;
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? done() : false),
        onPointer: () => done(),
        skip: () => el.settle(),
      };
    });
  }

  quote(spec: QuoteSpec): Promise<void> {
    if (spec.context === 'page' || (spec.mode === 'page' && this.stage === 'reading')) return this.pageQuote(spec);
    const takeable = spec.collectible.some((c) => !c.auto);
    const blocking = spec.mode !== 'play' || takeable;
    const el = this.begin<void>('quote', blocking, undefined);
    return this.run(el, async () => {
      await this.toWorld();
      const ui = await this.ui();
      if (!ui || el.done) return el.settle();
      const bubble = ui.overlays.verse;
      const scene = this.sceneOf(ui);
      // A quote with a word to take stays in one bubble (the word must stay on screen until taken).
      const chunks = takeable ? [[0, spec.lines.length] as [number, number]] : verseChunks(spec.lineNumbers);
      if (chunks.length === 0) chunks.push([0, spec.lines.length]);
      let index = 0;
      let revealed = false;
      const taken = new Set<string>();
      const lineByLine = uiContext().settings().verseDisplay === 'line_by_line';
      let autoToken = 0;
      const pending = (): string[] => {
        const [s, e] = chunks[index] ?? [0, 0];
        return spec.collectible.filter((c) => !c.auto && !taken.has(c.word) && c.lineIndex >= s && c.lineIndex < e).map((c) => c.word);
      };
      const close = (fast: boolean): void => {
        if (el.done) return;
        void bubble.hide(fast);
        el.settle();
      };
      const showChunk = (): void => {
        revealed = false;
        const range = chunks[index] as [number, number];
        bubble.show(spec, range, {
          lineByLine,
          taken,
          blocking,
          onRevealed: () => {
            revealed = true;
            const shown = spec.collectible.filter((c) => c.lineIndex >= range[0] && c.lineIndex < range[1]).map((c) => c.word);
            this.autoTake(spec, shown, (w) => bubble.wordAnchor(w), (w) => bubble.markTaken(w), taken);
            if (!blocking) {
              // Play mode: the verse stays its reading time, then leaves by itself.
              const t = ++autoToken;
              const lines = range[1] - range[0];
              void delay(scene, readingMs(spec.lines.slice(range[0], range[1]).join(' '), { verseLines: lines })).then(() => {
                if (t === autoToken && !el.done) next();
              });
            }
          },
        });
      };
      const next = (): void => {
        if (index + 1 < chunks.length) {
          index += 1;
          showChunk();
        } else {
          close(false);
        }
      };
      const takeWord = (word: string): void => {
        taken.add(word);
        const at = bubble.wordAnchor(word);
        if (at) this.anchors.set(word, at);
        bubble.markTaken(word);
        sfx('word');
        // Bible §3.4.2 rule 5 / ENGINE §5.8: the quote resolves at the press; the runner applies word: now.
        if (pending().length === 0) close(false);
      };
      const press = (interact: boolean): boolean => {
        if (!revealed) {
          bubble.revealAll();
          return true;
        }
        const words = pending();
        if (words.length > 0) {
          takeWord(words[0] as string);
          return true;
        }
        if (interact) return false;
        next();
        return true;
      };
      showChunk();
      el.handlers = {
        onAction: (a, m) => {
          if (m.repeat) return false;
          if (a === 'interact' && pending().length > 0 && revealed) return press(true);
          return this.isAdvance(a, m, blocking) ? press(false) : false;
        },
        onPointer: () => press(false),
        gloss: () => spec.gloss,
        skip: () => {
          for (const c of spec.collectible) {
            if (taken.has(c.word)) continue;
            taken.add(c.word);
            const at = bubble.wordAnchor(c.word);
            if (at) this.anchors.set(c.word, at);
          }
          close(true);
        },
        cancel: () => bubble.clear(),
      };
    });
  }

  private pageQuote(spec: QuoteSpec): Promise<void> {
    const el = this.begin<void>('page-quote', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      await this.ensureReading(bp);
      await this.pageSpace(bp, bp.spread.measureVerse(spec));
      if (el.done) return;
      if (this.canto) bp.spread.illustrate(this.canto.id, spec.voice);
      const taken = new Set<string>();
      const { lines } = bp.spread.appendVerse(spec, taken);
      const scene = bp as unknown as Phaser.Scene;
      let revealed = 0;
      let done = lines.length === 0;
      const revealLine = (k: number): void => revealNodes(scene, lines[k] ?? [], 450);
      const pending = (): string[] => spec.collectible.filter((c) => !c.auto && !taken.has(c.word)).map((c) => c.word);
      const finishReveal = (): void => {
        for (let k = revealed; k < lines.length; k++) revealLine(k);
        revealed = lines.length;
        done = true;
        this.autoTake(spec, spec.collectible.map((c) => c.word), (w) => bp.spread.wordAnchor(w), (w) => bp.spread.dim(w), taken);
        bp.spread.showTurnPrompt(pending().length > 0 ? 'Take the word' : '▸', 200);
      };
      if (uiContext().settings().verseDisplay === 'all_at_once') finishReveal();
      else {
        const step = (): void => {
          if (el.done || done) return;
          revealLine(revealed);
          revealed += 1;
          sfx('verse');
          if (revealed >= lines.length) finishReveal();
          else void delay(scene, TIMINGS.verseLineIntervalMs).then(step);
        };
        step();
      }
      const finish = (): void => {
        bp.spread.hideTurnPrompt();
        el.settle();
      };
      const press = (interact: boolean): boolean => {
        if (!done) {
          finishReveal();
          return true;
        }
        const words = pending();
        if (words.length > 0) {
          const w = words[0] as string;
          taken.add(w);
          const at = bp.spread.wordAnchor(w);
          if (at) this.anchors.set(w, at);
          bp.spread.dim(w);
          sfx('word');
          if (pending().length === 0) finish();
          return true;
        }
        if (interact) return false;
        finish();
        return true;
      };
      el.handlers = {
        onAction: (a, m) => {
          if (m.repeat) return false;
          if (a === 'interact' && pending().length > 0 && done) return press(true);
          return this.isAdvance(a, m, true) ? press(false) : false;
        },
        onPointer: () => press(false),
        gloss: () => spec.gloss,
        skip: () => {
          for (const w of pending()) {
            taken.add(w);
            const at = bp.spread.wordAnchor(w);
            if (at) this.anchors.set(w, at);
          }
          finish();
        },
      };
    });
  }

  bark(speaker: SpeakerId, name: string, text: string): void {
    void (async () => {
      const host = await this.host();
      if (!host) return;
      host.overlays.barks.show(name, text, this.barkAnchor(speaker));
      try {
        this.deps.audio.blip(speaker);
      } catch {
        // optional
      }
    })().catch((err: unknown) => this.log('warn', `bark failed: ${describe(err)}`));
  }

  /**
   * Where the speaker stands on screen, if the world can tell: an optional
   * `anchorOf(speaker)` on the WorldBridge returning canvas coordinates.
   */
  private barkAnchor(speaker: SpeakerId): { x: number; y: number } | null {
    try {
      const world = tryServices()?.world as unknown as { anchorOf?: (s: SpeakerId) => { x: number; y: number } | null } | undefined;
      const at = world?.anchorOf?.(speaker) ?? null;
      return at && Number.isFinite(at.x) && Number.isFinite(at.y) ? at : null;
    } catch {
      return null;
    }
  }

  hintAvailable(available: boolean): void {
    this.hintOn = available;
    this.uiNow()?.hud.setHint(available);
  }

  hint(spec: HintSpec): Promise<void> {
    return (async () => {
      const host = await this.host();
      if (!host) return;
      await host.overlays.hint.show('hint', spec.text, { speaker: 'VIRGIL', side: this.noteSide(host) });
    })().catch((err: unknown) => this.log('warn', `hint failed: ${describe(err)}`));
  }

  /** The margin note goes left when the right side is taken (an open choice, a card). */
  private noteSide(host: UiSceneApi | BookPageApi): 'left' | 'right' {
    const o = host.overlays;
    return o.margin.visible || o.card.visible ? 'left' : 'right';
  }

  // =========================================================================
  // Choices and cards
  // =========================================================================

  choose(choice: ChoiceSpec, options: readonly ChoiceOptionView[]): Promise<OptionLetter> {
    const first = options[0]?.letter ?? 'a';
    if (options.length === 0) {
      // Nothing to choose from (a broken script): never wait on an empty margin.
      this.log('warn', `Choice ${choice.id} has no visible option.`);
      return Promise.resolve(first);
    }
    const el = this.begin<OptionLetter>('choice', true, first);
    const cursor = new ChoiceCursor(options);
    let host: UiSceneApi | BookPageApi | null = null;
    let picked = false;
    const pick = (index: number, animate: boolean): void => {
      if (picked || el.done) return;
      const opt = options[index];
      if (!opt) return;
      picked = true;
      sfx('choice');
      const margin = host?.overlays.margin;
      if (animate && margin?.visible) {
        void margin.confirm(index).then(() => el.settle(opt.letter));
      } else {
        margin?.clear();
        el.settle(opt.letter);
      }
    };
    el.handlers = {
      answer: (letter) => {
        const i = cursor.indexOfLetter(letter);
        if (i < 0) return false;
        pick(i, false);
        return true;
      },
      skip: () => undefined,
      cancel: () => host?.overlays.margin.clear(),
    };
    return this.run(el, async () => {
      if (choice.mode !== 'page') await this.toWorld();
      host = await this.host();
      if (!host || el.done) return;
      const margin = host.overlays.margin;
      margin.open(choice.prompt, options, {
        onPick: (i) => pick(i, true),
        onHover: (i) => {
          if (cursor.set(i)) margin.select(i);
        },
      });
      el.handlers.onAction = (a, m) => {
        if (picked) return true;
        if (a === 'up' || a === 'down') {
          margin.select(cursor.move(a === 'up' ? -1 : 1));
          sfx('ui');
          return true;
        }
        if (a === 'option1' || a === 'option2' || a === 'option3') {
          const i = cursor.indexForNumber(a === 'option1' ? 1 : a === 'option2' ? 2 : 3);
          if (i >= 0) {
            cursor.set(i);
            pick(i, true);
          }
          return true;
        }
        if ((a === 'advance' || a === 'interact') && !m.repeat) {
          pick(cursor.index, true);
          return true;
        }
        return false;
      };
      el.handlers.onPointer = () => false;
    });
  }

  reveal(card: RevealCard): Promise<void> {
    const el = this.begin<void>('reveal', true, undefined);
    return this.run(el, async () => {
      if (this.stage !== 'page' && this.stage !== 'reading') await this.toWorld();
      const host = await this.host();
      if (!host || el.done) return el.settle();
      await this.showCard(el, host, card, null);
    });
  }

  /** A card on a host; resolves the element when closed. Words on it are taken first (the flourish). */
  private async showCard(el: Pending<void>, host: UiSceneApi | BookPageApi, card: RevealCard, centerX: number | null): Promise<void> {
    const view = host.overlays.card;
    sfx('card');
    view.show(card, centerX !== null ? { centerX } : {});
    const shownAt = now();
    const take = (word: string, flourish: boolean): void => {
      const at = view.wordAnchor(word);
      view.markTaken(word);
      sfx('word');
      if (flourish) {
        const def = getWord(word);
        void host.overlays.words.present({ word, def, change: 'gained', collected: true, silent: false }, at).done;
      }
    };
    const close = (fast: boolean): void => {
      if (el.done) return;
      void view.hide(fast);
      el.settle();
    };
    const press = (): boolean => {
      if (now() - shownAt < 400) return true;
      const pending = view.pendingWords;
      if (pending.length > 0) {
        take(pending[0] as string, true);
        return true;
      }
      close(false);
      return true;
    };
    el.handlers = {
      onAction: (a, m) => ((a === 'advance' || a === 'interact') && !m.repeat ? press() : false),
      onPointer: () => press(),
      skip: () => {
        for (const w of view.pendingWords) take(w, false);
        close(true);
      },
      cancel: () => view.clear(),
    };
  }

  // =========================================================================
  // Feedback
  // =========================================================================

  wordGained(change: WordChange): Promise<void> {
    if (change.silent) {
      this.pulseBook();
      return Promise.resolve();
    }
    const el = this.begin<void>('word', true, undefined);
    return this.run(el, async () => {
      const host = await this.host();
      if (!host || el.done) return el.settle();
      const from = this.anchors.get(change.word) ?? null;
      this.anchors.delete(change.word);
      const run = host.overlays.words.present(change, from);
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? (run.hurry(), true) : false),
        onPointer: () => (run.hurry(), true),
        skip: () => run.finish(),
        cancel: () => run.finish(),
      };
      await run.done;
      el.settle();
    });
  }

  private pulseBook(): void {
    if (this.stage === 'page' || this.stage === 'reading') this.bookNow()?.pulseBook();
    else this.uiNow()?.hud.pulseBook();
  }

  codexGained(gain: CodexGain): Promise<void> {
    if (gain.silent) return Promise.resolve();
    void (async () => {
      const host = await this.host();
      host?.overlays.toasts.push('A PAGE FOR THE BOOK', gain.entry?.title ?? gain.id, 'page');
      sfx('card');
    })().catch((err: unknown) => this.log('warn', `codex toast failed: ${describe(err)}`));
    return Promise.resolve();
  }

  memoryGained(gain: MemoryGain): Promise<void> {
    const el = this.begin<void>('memory', true, undefined);
    return this.run(el, async () => {
      const host = await this.host();
      if (!host || el.done) return el.settle();
      const run = host.overlays.words.presentMemory(gain);
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? (run.hurry(), true) : false),
        onPointer: () => (run.hurry(), true),
        skip: () => run.finish(),
        cancel: () => run.finish(),
      };
      await run.done;
      el.settle();
    });
  }

  unlock(feature: UnlockFeature): Promise<void> {
    void (async () => {
      const host = await this.host();
      if (!host) return;
      const copy = unlockCopy(feature, uiContext().device());
      host.overlays.toasts.push(copy.title.toUpperCase(), copy.body, feature === 'heart' ? 'pan' : feature === 'remembrance' ? 'candle' : 'book');
      sfx('unlock');
      if (feature === 'heart') {
        const ui = this.uiNow();
        if (ui) {
          ui.hud.update(this.deps.store.state);
          ui.hud.tremble();
        }
      }
    })().catch((err: unknown) => this.log('warn', `unlock toast failed: ${describe(err)}`));
    return Promise.resolve();
  }

  heartShift(shift: HeartShift): Promise<void> {
    if (!shift.visible) return Promise.resolve();
    const ui = this.uiNow();
    if (ui) {
      ui.hud.update(this.deps.store.state);
      ui.hud.twitch();
    }
    return Promise.resolve();
  }

  tutorial(name: TutorialName): void {
    void (async () => {
      const ui = await this.ui();
      if (!ui) return;
      const copy = tutorialCopy(name, uiContext().device());
      ui.overlays.tutorial.show(copy.keys, copy.text);
    })().catch((err: unknown) => this.log('warn', `tutorial failed: ${describe(err)}`));
  }

  toast(text: string): void {
    void (async () => {
      const host = await this.host();
      host?.overlays.toasts.push('', text, 'quill');
    })().catch((err: unknown) => this.log('warn', `toast failed: ${describe(err)}`));
  }

  // =========================================================================
  // Stage verbs (presenter half of CAM)
  // =========================================================================

  camera(cam: CamCommand): Promise<void> {
    const verb = cam.verb;
    if (
      verb !== 'fade-in' &&
      verb !== 'fade-out' &&
      verb !== 'white-out' &&
      verb !== 'page-turn' &&
      verb !== 'engrave' &&
      verb !== 'unengrave'
    ) {
      return Promise.resolve();
    }
    const el = this.begin<void>(`cam:${verb}`, false, undefined);
    return this.run(el, async () => {
      const ui = await this.ui();
      if (!ui || el.done) return el.settle();
      const fx = ui.fx;
      el.handlers = {
        skip: () => {
          fx.complete();
          this.bookNow()?.finishTransitions();
          el.settle();
        },
        cancel: () => fx.complete(),
      };
      switch (verb) {
        case 'fade-out':
          await fx.fadeOut();
          break;
        case 'fade-in':
          await fx.fadeIn();
          break;
        case 'white-out': {
          const red = /kızıl|kizil|kırmızı|red/i.test(cam.text);
          sfx('faint');
          await fx.whiteOut(red);
          break;
        }
        case 'engrave':
          await fx.engrave();
          break;
        case 'unengrave': {
          const bp = this.bookNow();
          const stage = this.stage;
          this.stage = 'none';
          this.stageToken++;
          const lift = fx.unengrave();
          if (bp && stage === 'holdover') await bp.growVignette(TIMINGS.unengraveMs);
          else if (bp && (stage === 'lingering' || stage === 'reading')) await Promise.all([bp.spread.close(true), bp.hideCurtain(400)]);
          else if (bp && stage === 'curtain') await bp.hideCurtain(TIMINGS.unengraveMs / 2);
          await lift;
          break;
        }
        case 'page-turn':
          await this.pageTurn(cam);
          break;
      }
      el.settle();
    });
  }

  private async pageTurn(cam: CamCommand): Promise<void> {
    const bp = await this.book();
    if (!bp) return;
    if (this.stage === 'holdover' || this.stage === 'page') return; // the opening page already turned
    if (cam.mode === 'page') {
      if ((this.stage === 'reading' || this.stage === 'lingering') && bp.spread.isOpen) {
        if (bp.spread.right.length > 0 || bp.spread.left.length > 0) await bp.spread.turn();
        this.stage = 'reading';
        return;
      }
      await this.ensureReading(bp);
      return;
    }
    if (this.stage === 'lingering' || this.stage === 'reading') {
      // The book closes (Canto II: "Kitap kapanır").
      this.stage = 'none';
      this.stageToken++;
      if (bp.spread.right.length > 0) await bp.spread.turn();
      await Promise.all([bp.spread.close(true), bp.hideCurtain(400)]);
      return;
    }
    const ui = this.uiNow();
    if (ui) await ui.fx.pageSweep();
  }

  sfx(description: string): void {
    try {
      this.deps.audio.describe(description);
    } catch {
      // optional
    }
  }

  // =========================================================================
  // Colophon, chapter end, missing cantos
  // =========================================================================

  colophon(spec: ColophonSpec): Promise<void> {
    const el = this.begin<void>('colophon', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      this.stage = 'page';
      this.stageToken++;
      this.uiNow()?.overlays.clearAll();
      bp.overlays.clearAll();
      bp.holdVignette(null);
      bp.showCurtain(1);
      bp.spread.clear();
      await bp.spread.open(true);
      if (el.done) return this.bailPage(bp);
      const blocks = colophonBlocks(spec);
      const pages = this.summaryPages(blocks);
      // Left page: the canto's last line, alone (bible §1.3.8).
      bp.spread.folios(`${spec.canticleLabel} · ${spec.cantoLabel}`, '');
      renderSummaryPage(bp, 'left', [], { closing: spec.closing });
      let page = 0;
      renderSummaryPage(bp, 'right', this.pick(blocks, pages[0]), {});
      // Deferred "What Dante did" cards open here, one by one.
      const cards = [...spec.reveals];
      let cardIndex = 0;
      let cardEl: Pending<void> | null = null;
      let cardsStarted = false;
      // The last canto of a chapter: the book stays open for the chapter's own pages.
      const lastOfChapter = spec.next === null;
      const nextLabel = spec.next ? `Turn the page ▸ ${spec.next.label}` : 'Turn the page ▸';
      const shownAt = now();
      let busyTurn = false;
      const finish = async (fast: boolean): Promise<void> => {
        if (busyTurn) return;
        busyTurn = true;
        bp.spread.hideTurnPrompt();
        if (!fast) await bp.spread.turn();
        if (lastOfChapter) {
          bp.spread.clear();
          this.stage = 'page';
        } else {
          await bp.spread.close(!fast);
          this.stage = 'curtain';
        }
        el.settle();
      };
      const showPrompt = (): void => {
        const more = page + 1 < pages.length;
        bp.spread.showTurnPrompt(more ? '▸' : nextLabel, 300);
      };
      const openCard = (): void => {
        if (el.done || busyTurn) return;
        cardsStarted = true;
        const card = cards[cardIndex];
        if (!card) {
          showPrompt();
          return;
        }
        const sub = new Pending<void>('colophon-card', true, undefined, () => undefined, now);
        cardEl = sub;
        void this.showCard(sub, bp, card, 640);
        void sub.promise.then(() => {
          cardEl = null;
          cardIndex += 1;
          if (!el.done) openCard();
        });
      };
      const press = async (): Promise<void> => {
        if (busyTurn) return;
        // The deferred cards come first: a press before them opens them, never turns past them.
        if (!cardsStarted) {
          openCard();
          return;
        }
        if (cardEl || cardIndex < cards.length) return;
        if (now() - shownAt < 800) return;
        if (page + 1 < pages.length) {
          busyTurn = true;
          bp.spread.hideTurnPrompt();
          await bp.spread.turn();
          page += 1;
          // Continuation pages fill both sides.
          renderSummaryPage(bp, 'left', this.pick(blocks, pages[page]), {});
          if (page + 1 < pages.length) {
            page += 1;
            renderSummaryPage(bp, 'right', this.pick(blocks, pages[page]), {});
          }
          busyTurn = false;
          showPrompt();
          return;
        }
        await finish(false);
      };
      el.handlers = {
        onAction: (a, m) => {
          if (cardEl && !cardEl.done) return cardEl.onAction(a, m, now());
          if (this.isAdvance(a, m, true)) {
            void press();
            return true;
          }
          return false;
        },
        onPointer: (m) => {
          if (cardEl && !cardEl.done) return cardEl.onPointer(m, now());
          void press();
          return true;
        },
        skip: () => {
          if (cardEl && !cardEl.done) cardEl.skip();
          cardIndex = cards.length;
          void finish(true);
        },
        cancel: () => {
          cardEl?.cancel();
          this.bailPage(bp);
        },
      };
      await delay(bp as unknown as Phaser.Scene, 900);
      if (!el.done && !cardsStarted) openCard();
    });
  }

  /** The canto after the chapter's last one, as the book's next page (its opening lines, if the source has them). */
  private comingCanto(summary: ChapterSummary): ComingCanto | null {
    try {
      const last = summary.chapter.cantos[summary.chapter.cantos.length - 1];
      const n = Number(/\d+$/.exec(last ?? '')?.[0] ?? NaN);
      if (!last || !last.startsWith('inf') || !Number.isFinite(n) || n >= 34) return null;
      const source = this.deps.story.source('Inferno', n + 1);
      if (!source) return null;
      const lines = source.lines.slice(0, 3).filter((l) => l.trim().length > 0);
      return {
        canticleLabel: 'INFERNO',
        cantoLabel: `CANTO ${toRoman(n + 1)}`,
        lines,
        citation: formatCitation('Inferno', n + 1, 1, lines.length),
        message: 'This canto is still being written.',
      };
    } catch {
      return null;
    }
  }

  private summaryPages(blocks: readonly SummaryBlock[]): number[][] {
    const height = PAGE.right.y1 - PAGE.right.y0 - 10;
    const heights = summaryHeights(blocks, PAGE.right.x1 - PAGE.right.x0);
    return paginate(heights, height, blocks.map((b) => b.kind));
  }

  private pick(blocks: readonly SummaryBlock[], idx: readonly number[] | undefined): SummaryBlock[] {
    return (idx ?? []).map((i) => blocks[i]).filter((b): b is SummaryBlock => b !== undefined);
  }

  chapterEnd(summary: ChapterSummary): Promise<void> {
    const el = this.begin<void>('chapter', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      this.stage = 'page';
      bp.overlays.clearAll();
      bp.showCurtain(1);
      if (!bp.spread.isOpen) await bp.spread.open(true);
      else bp.spread.clear();
      if (el.done) return this.bailPage(bp);
      const { summary: left, comedy } = chapterBlocks(summary);
      // The summary and "Your Comedy" each start on a page of their own (left, then right).
      const pages: SummaryBlock[][] = [
        ...this.summaryPages(left).map((idx) => this.pick(left, idx)),
        ...this.summaryPages(comedy).map((idx) => this.pick(comedy, idx)),
      ];
      // Bible §7.5: at the very end "Turn the page" works, and the next page is the next canto.
      const coming = this.comingCanto(summary);
      let slot = 0;
      let comingShown = false;
      const lastSpread = (): boolean => slot + 2 >= pages.length;
      const render = (): void => {
        bp.spread.folios(summary.chapter.title.toUpperCase(), summary.chapter.subtitle.toUpperCase());
        renderSummaryPage(bp, 'left', pages[slot] ?? [], {});
        renderSummaryPage(bp, 'right', pages[slot + 1] ?? [], {});
        bp.spread.showTurnPrompt(!lastSpread() ? '▸' : coming ? 'Turn the page ▸' : 'Close the book ▸', 600);
      };
      render();
      const shownAt = now();
      let turning = false;
      const press = async (): Promise<void> => {
        if (turning || now() - shownAt < 800) return;
        turning = true;
        bp.spread.hideTurnPrompt();
        await bp.spread.turn();
        if (el.done) return;
        if (!lastSpread()) {
          slot += 2;
          render();
          turning = false;
          return;
        }
        if (coming && !comingShown) {
          comingShown = true;
          bp.spread.layoutComing(coming);
          bp.spread.showTurnPrompt('Close the book ▸', 900);
          turning = false;
          return;
        }
        await bp.spread.close(true);
        this.stage = 'curtain';
        el.settle();
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? (void press(), true) : false),
        onPointer: () => (void press(), true),
        skip: () => {
          void bp.spread.close(false);
          this.stage = 'curtain';
          el.settle();
        },
        cancel: () => this.bailPage(bp),
      };
    });
  }

  missingCanto(spec: MissingCantoSpec): Promise<void> {
    const el = this.begin<void>('missing', true, undefined);
    return this.run(el, async () => {
      const bp = await this.book();
      if (!bp || el.done) return el.settle();
      this.stage = 'page';
      bp.overlays.clearAll();
      bp.showCurtain(1);
      bp.spread.clear();
      await bp.spread.open(true);
      if (el.done) return this.bailPage(bp);
      bp.spread.layoutMissing(spec.cantoLabel, spec.title, spec.message);
      bp.spread.showTurnPrompt('Turn ▸', 700);
      const shownAt = now();
      let turning = false;
      const press = async (): Promise<void> => {
        if (turning || now() - shownAt < 600) return;
        turning = true;
        bp.spread.hideTurnPrompt();
        await bp.spread.turn();
        await bp.spread.close(true);
        this.stage = 'curtain';
        el.settle();
      };
      el.handlers = {
        onAction: (a, m) => (this.isAdvance(a, m, true) ? (void press(), true) : false),
        onPointer: () => (void press(), true),
        skip: () => {
          void bp.spread.close(false);
          this.stage = 'curtain';
          el.settle();
        },
        cancel: () => this.bailPage(bp),
      };
    });
  }

  // =========================================================================
  // Control
  // =========================================================================

  skip(): void {
    const cur = this.current;
    if (!cur || cur.done) return;
    try {
      cur.skip();
    } catch (err) {
      this.log('warn', `skip failed: ${describe(err)}`);
      cur.settle();
    }
  }

  answer(letter: OptionLetter): boolean {
    const cur = this.current;
    if (!cur || cur.done) return false;
    try {
      return cur.answer(letter);
    } catch (err) {
      this.log('warn', `answer failed: ${describe(err)}`);
      return false;
    }
  }

  cancelAll(): void {
    const cur = this.current;
    this.current = null;
    try {
      cur?.cancel();
    } catch {
      // settled below
    }
    cur?.settle();
    this.anchors.clear();
    try {
      this.uiNow()?.overlays.clearAll();
      const bp = this.bookNow();
      if (bp) bp.reset();
    } catch (err) {
      this.log('warn', `cancelAll cleanup failed: ${describe(err)}`);
    }
    this.stage = 'none';
    this.stageToken++;
    if (isBookOpen()) closeBook(this.game, this.deps.bus);
  }
}

export const createPresenter: CreatePresenter = (deps) => new Presenter(deps);
