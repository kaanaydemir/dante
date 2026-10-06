/**
 * Test doubles for the runner's ports: a recording presenter, a scriptable
 * world, and an in-memory storage.
 */

import type {
  ArmedBeat,
  BeatContext,
  BeatRunInfo,
  CamCommand,
  CantoMeta,
  ChapterSummary,
  ChoiceOptionView,
  ChoiceSpec,
  CodexGain,
  ColophonSpec,
  EventBus,
  HeartShift,
  HintSpec,
  MemoryGain,
  MissingCantoSpec,
  NarrationOptions,
  PageSpec,
  PlaceDef,
  QuoteSpec,
  RevealCard,
  SayLine,
  StorageLike,
  StoryPresenter,
  WordChange,
  WorldBridge,
} from '../../../src/runtime/contracts';
import type {
  BeatMode,
  CantoId,
  CantoScript,
  DoStmt,
  EventId,
  OptionLetter,
  PlaceId,
  SpeakerId,
  Trigger,
  TutorialName,
  UnlockFeature,
} from '../../../src/story/types';

export interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

// ---------------------------------------------------------------------------
// Presenter
// ---------------------------------------------------------------------------

export interface FakePresenterOptions {
  /**
   * `instant` (default): every awaited call resolves at once and choices follow `choose`.
   * `manual`: text, pages, cards and feedback wait for skip(); choices wait for answer().
   */
  readonly mode?: 'instant' | 'manual';
  /** Choice policy in instant mode (default: the first option). */
  readonly choose?: (spec: ChoiceSpec, options: readonly ChoiceOptionView[]) => OptionLetter;
}

export class FakePresenter implements StoryPresenter {
  readonly calls: Call[] = [];
  busy = false;
  skips = 0;
  private waiting: (() => void)[] = [];
  private choosing: { options: readonly ChoiceOptionView[]; resolve: (l: OptionLetter) => void } | null = null;

  constructor(private readonly opts: FakePresenterOptions = {}) {}

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  private block(): Promise<void> {
    if (this.opts.mode !== 'manual') return Promise.resolve();
    this.busy = true;
    return new Promise<void>((resolve) => {
      this.waiting.push(() => {
        this.busy = this.waiting.length > 0 || this.choosing !== null;
        resolve();
      });
    });
  }

  // lifecycle
  beginCanto(meta: CantoMeta): Promise<void> {
    this.record('beginCanto', meta);
    return Promise.resolve();
  }
  endCanto(meta: CantoMeta): Promise<void> {
    this.record('endCanto', meta);
    return Promise.resolve();
  }
  setMode(mode: BeatMode, ctx: BeatContext): Promise<void> {
    this.record('setMode', mode, ctx);
    return Promise.resolve();
  }

  // text
  openPage(page: PageSpec): Promise<void> {
    this.record('openPage', page);
    return this.block();
  }
  narration(text: string, opts: NarrationOptions): Promise<void> {
    this.record('narration', text, opts);
    return this.block();
  }
  say(line: SayLine): Promise<void> {
    this.record('say', line);
    return this.block();
  }
  quote(spec: QuoteSpec): Promise<void> {
    this.record('quote', spec);
    return this.block();
  }
  bark(speaker: SpeakerId, name: string, text: string): void {
    this.record('bark', speaker, name, text);
  }
  hintAvailable(available: boolean): void {
    this.record('hintAvailable', available);
  }
  hint(spec: HintSpec): Promise<void> {
    this.record('hint', spec);
    return Promise.resolve();
  }

  // choices and cards
  choose(choice: ChoiceSpec, options: readonly ChoiceOptionView[]): Promise<OptionLetter> {
    this.record('choose', choice, options);
    if (this.opts.mode === 'manual') {
      this.busy = true;
      return new Promise<OptionLetter>((resolve) => {
        this.choosing = { options, resolve };
      });
    }
    const letter = this.opts.choose ? this.opts.choose(choice, options) : (options[0]?.letter ?? 'a');
    return Promise.resolve(letter);
  }
  reveal(card: RevealCard): Promise<void> {
    this.record('reveal', card);
    return this.block();
  }

  // feedback
  wordGained(change: WordChange): Promise<void> {
    this.record('wordGained', change);
    return Promise.resolve();
  }
  codexGained(gain: CodexGain): Promise<void> {
    this.record('codexGained', gain);
    return Promise.resolve();
  }
  memoryGained(gain: MemoryGain): Promise<void> {
    this.record('memoryGained', gain);
    return Promise.resolve();
  }
  unlock(feature: UnlockFeature): Promise<void> {
    this.record('unlock', feature);
    return Promise.resolve();
  }
  heartShift(shift: HeartShift): Promise<void> {
    this.record('heartShift', shift);
    return Promise.resolve();
  }
  tutorial(name: TutorialName): void {
    this.record('tutorial', name);
  }
  toast(text: string): void {
    this.record('toast', text);
  }

  // stage
  camera(cam: CamCommand): Promise<void> {
    this.record('camera', cam);
    return Promise.resolve();
  }
  sfx(description: string): void {
    this.record('sfx', description);
  }

  // book pages
  colophon(spec: ColophonSpec): Promise<void> {
    this.record('colophon', spec);
    return this.block();
  }
  chapterEnd(summary: ChapterSummary): Promise<void> {
    this.record('chapterEnd', summary);
    return this.block();
  }
  missingCanto(spec: MissingCantoSpec): Promise<void> {
    this.record('missingCanto', spec);
    return this.block();
  }
  showTitle(): void {
    this.record('showTitle');
  }

  // control
  skip(): void {
    this.skips += 1;
    const next = this.waiting.shift();
    next?.();
  }
  answer(letter: OptionLetter): boolean {
    const c = this.choosing;
    if (!c || !c.options.some((o) => o.letter === letter)) return false;
    this.choosing = null;
    this.busy = this.waiting.length > 0;
    this.record('answered', letter);
    c.resolve(letter);
    return true;
  }
  cancelAll(): void {
    this.record('cancelAll');
    const waiting = this.waiting;
    this.waiting = [];
    for (const w of waiting) w();
    const c = this.choosing;
    this.choosing = null;
    if (c) c.resolve(c.options[0]?.letter ?? 'a');
    this.busy = false;
  }

  // ---- assertions helpers ----
  of(method: string): Call[] {
    return this.calls.filter((c) => c.method === method);
  }
  /** First argument of every call to `method`. */
  args<T>(method: string): T[] {
    return this.of(method).map((c) => c.args[0] as T);
  }
  /** Whether a choice margin is open (manual mode). */
  get choiceOpen(): boolean {
    return this.choosing !== null;
  }
  /** Displayed text in order: narration, say, page text and quote lines. */
  get texts(): string[] {
    const out: string[] = [];
    for (const c of this.calls) {
      if (c.method === 'narration') out.push(c.args[0] as string);
      else if (c.method === 'say') out.push((c.args[0] as SayLine).text);
      else if (c.method === 'quote') out.push(...(c.args[0] as QuoteSpec).lines);
      else if (c.method === 'openPage') {
        const p = c.args[0] as PageSpec;
        if (p.kind === 'text') out.push(p.text);
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export interface FakeWorldOptions {
  /** Places the level has (enter: triggers it can produce). */
  readonly places?: readonly PlaceId[];
  /** NPCs the player can talk to. */
  readonly npcs?: readonly SpeakerId[];
  /** Events the level emits. */
  readonly emits?: readonly EventId[];
  /** Called whenever the runner arms beats (the "player" can react). */
  readonly onArmed?: (armed: readonly ArmedBeat[], world: FakeWorld) => void;
  /** Called for every DO line. */
  readonly onDirect?: (stmt: DoStmt, index: number, info: BeatRunInfo, world: FakeWorld) => void | Promise<void>;
}

export class FakeWorld implements WorldBridge {
  readonly calls: Call[] = [];
  current: PlaceId | null = null;
  armedNow: readonly ArmedBeat[] = [];
  control = false;
  trust: number | null = null;
  private readonly placeSet: Set<string>;
  private readonly npcSet: Set<string>;
  private readonly emitSet: Set<string>;

  constructor(
    private readonly bus: EventBus,
    private readonly opts: FakeWorldOptions = {},
  ) {
    this.placeSet = new Set(opts.places ?? []);
    this.npcSet = new Set(opts.npcs ?? []);
    this.emitSet = new Set(opts.emits ?? []);
  }

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  loadCanto(script: CantoScript | null, cantoId: CantoId): Promise<void> {
    this.record('loadCanto', script?.id ?? null, cantoId);
    return Promise.resolve();
  }
  unloadCanto(): void {
    this.record('unloadCanto');
  }
  beginBeat(info: BeatRunInfo): Promise<void> {
    this.record('beginBeat', info.beat.id);
    if (info.beat.place && this.placeSet.has(info.beat.place)) this.current = info.beat.place;
    return Promise.resolve();
  }
  endBeat(info: BeatRunInfo): Promise<void> {
    this.record('endBeat', info.beat.id);
    return Promise.resolve();
  }
  async direct(stmt: DoStmt, index: number, info: BeatRunInfo): Promise<void> {
    this.record('direct', info.beat.id, index, stmt.text);
    await this.opts.onDirect?.(stmt, index, info, this);
  }
  camera(cam: CamCommand): Promise<void> {
    this.record('camera', cam.verb);
    return Promise.resolve();
  }
  setPlayerControl(enabled: boolean): void {
    this.control = enabled;
    this.record('setPlayerControl', enabled);
  }
  checkpoint(): void {
    this.record('checkpoint');
  }
  setVirgilTrust(trust: number, delta: number): void {
    this.trust = trust;
    this.record('setVirgilTrust', trust, delta);
  }
  setArmed(armed: readonly ArmedBeat[]): void {
    this.armedNow = armed;
    this.record('setArmed', armed.map((a) => a.beat));
    if (armed.length > 0) this.opts.onArmed?.(armed, this);
  }
  canSatisfy(trigger: Trigger): boolean {
    switch (trigger.kind) {
      case 'enter':
        return this.placeSet.has(trigger.place);
      case 'talk':
        return this.npcSet.has(trigger.speaker);
      case 'event':
        return this.emitSet.has(trigger.id);
      default:
        return false;
    }
  }
  isSatisfied(trigger: Trigger): boolean {
    return trigger.kind === 'enter' && this.current === trigger.place;
  }
  satisfy(trigger: Trigger): void {
    this.record('satisfy', trigger);
    if (trigger.kind === 'enter') this.enter(trigger.place);
    else if (trigger.kind === 'talk') this.talk(trigger.speaker);
    else if (trigger.kind === 'event') this.emit(trigger.id);
  }
  teleport(place: PlaceId): boolean {
    this.record('teleport', place);
    if (!this.placeSet.has(place)) return false;
    this.enter(place);
    return true;
  }
  places(): readonly PlaceDef[] {
    return [...this.placeSet].map((id, i) => ({ id, x: i * 100, y: 0, w: 100, h: 100 }));
  }
  cancel(): void {
    this.record('cancel');
  }
  debugInfo(): Record<string, unknown> {
    return { current: this.current };
  }

  // ---- the player ----
  enter(place: PlaceId): void {
    this.current = place;
    this.bus.emit('world:signal', { kind: 'enter', place });
  }
  talk(speaker: SpeakerId): void {
    this.bus.emit('world:signal', { kind: 'talk', speaker });
  }
  emit(id: EventId): void {
    this.bus.emit('world:signal', { kind: 'event', id });
  }

  of(method: string): Call[] {
    return this.calls.filter((c) => c.method === method);
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export class MemoryStorage implements StorageLike {
  readonly map = new Map<string, string>();
  failWrites = false;
  failReads = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('storage read failed');
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('quota exceeded');
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}
