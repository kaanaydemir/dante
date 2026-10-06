/**
 * Runner / session test harness: real bus, store, library (story-core parser)
 * and session, with a recording presenter, a scriptable world, in-memory
 * storage and a virtual clock.
 */

import fixtureText from '../../fixtures/test-canto.md?raw';
import { createEventBus } from '../../../src/runtime/bus';
import type {
  EventBus,
  GameEventName,
  GameEvents,
  GameSession,
  GameStateStore,
  StorageLike,
  StoryLibrary,
  StoryRunner,
} from '../../../src/runtime/contracts';
import type { Runner } from '../../../src/runtime/runner';
import { createGameSession } from '../../../src/runtime/session';
import { createGameStateStore } from '../../../src/state/store';
import { toRoman } from '../../../src/story/cite';
import { buildStoryLibrary, RAW_SOURCES } from '../../../src/story/load';
import type { CantoScript } from '../../../src/story/types';
import { createVirtualClock, type VirtualClock } from './clock';
import { FakePresenter, FakeWorld, MemoryStorage, type FakePresenterOptions, type FakeWorldOptions } from './fakes';

export const FIXTURE_PATH = '/tests/fixtures/test-canto.md';
export { fixtureText };

export interface ScriptFront {
  readonly title?: string;
  readonly location?: string;
  readonly mechanics?: readonly string[];
}

/** A complete canto file (bible §2.3) around `body` (the scenes). */
export function scriptText(id: string, body: string, front: ScriptFront = {}): string {
  const n = Number(/\d+$/.exec(id)?.[0] ?? 1);
  const title = front.title ?? `Test ${id}`;
  return [
    '---',
    `id: ${id}`,
    'canticle: Inferno',
    `canto: ${n}`,
    `title: "${title}"`,
    'title_tr: "Deneme"',
    `location: "${front.location ?? 'The Test Place'}"`,
    'source: docs/source/inferno/canto-01.txt',
    'lines: "1–136"',
    'epigraph: "Inferno I, 1–3"',
    'closing: "Inferno I, 136"',
    'characters: [DANTE, VIRGIL]',
    `mechanics: [${(front.mechanics ?? ['move']).join(', ')}]`,
    'choices: []',
    'words: []',
    'memories: []',
    'codex: []',
    'flags_set: []',
    'flags_read: []',
    'unlocks: []',
    'playtime: "1–2"',
    'writer: "test"',
    'status: draft',
    'version: "0.1"',
    '---',
    '',
    `# Inferno ${toRoman(n)} — ${title}`,
    '',
    body.trim(),
    '',
  ].join('\n');
}

/** A beat with a script block. `lines` are the script lines (directives included). */
export function beat(id: string, title: string, lines: string): string {
  return [`### [${id}] ${title}`, '', '```script', lines.trim(), '```', ''].join('\n');
}

export function scene(id: string, title: string, ...beats: string[]): string {
  return [`## [${id}] ${title}`, '', ...beats].join('\n');
}

/** The opening page (s0) with the Inferno I epigraph. */
export function openingScene(canto: string): string {
  return scene(
    `${canto}.s0`,
    'Opening page',
    beat(
      `${canto}.s0.b1`,
      'Title and epigraph',
      `@mode: page
QUOTE POET (Inferno I, 1–3)
> Midway upon the journey of our life
> I found myself within a forest dark,
> For the straightforward pathway had been lost.`,
    ),
  );
}

/** A colophon scene with the closing line I 136. */
export function colophonScene(canto: string, n: number, extra = ''): string {
  return scene(
    `${canto}.s${n}`,
    'Colophon',
    beat(
      `${canto}.s${n}.b1`,
      'The end',
      `@mode: colophon
${extra}
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.`,
    ),
  );
}

export interface HarnessOptions {
  /** Script texts keyed by path. */
  readonly texts?: Readonly<Record<string, string>>;
  readonly includeFixture?: boolean;
  readonly presenter?: FakePresenterOptions;
  readonly world?: FakeWorldOptions;
  /** null: no storage at all. */
  readonly storage?: StorageLike | null;
}

export interface Harness {
  readonly bus: EventBus;
  readonly store: GameStateStore;
  readonly story: StoryLibrary;
  readonly session: GameSession;
  readonly runner: StoryRunner;
  /** The runner with its extended runCanto options (chapter, order, previous). */
  readonly impl: Runner;
  readonly presenter: FakePresenter;
  readonly world: FakeWorld;
  readonly clock: VirtualClock;
  readonly storage: StorageLike | null;
  readonly events: { readonly type: GameEventName; readonly payload: unknown }[];
  /** Payloads of one bus event type, in order. */
  emitted<K extends GameEventName>(type: K): GameEvents[K][];
  /** 'debug:log' messages of a level. */
  logs(level: 'info' | 'warn' | 'error'): string[];
  script(id: string): CantoScript;
}

export function createHarness(opts: HarnessOptions = {}): Harness {
  const bus = createEventBus();
  const events: { type: GameEventName; payload: unknown }[] = [];
  bus.onAny((type, payload) => events.push({ type, payload }));
  const storage = opts.storage === undefined ? new MemoryStorage() : opts.storage;
  const store = createGameStateStore({ bus, storage });
  const texts: Record<string, string> = { ...(opts.texts ?? {}) };
  if (opts.includeFixture) texts[FIXTURE_PATH] = fixtureText;
  const story = buildStoryLibrary(texts, RAW_SOURCES);
  const clock = createVirtualClock();
  const session = createGameSession({ bus, store, story, clock });
  const presenter = new FakePresenter(opts.presenter);
  const world = new FakeWorld(bus, opts.world);
  session.attach({ presenter, world });
  return {
    bus,
    store,
    story,
    session,
    runner: session.runner,
    impl: session.runner as Runner,
    presenter,
    world,
    clock,
    storage,
    events,
    emitted<K extends GameEventName>(type: K): GameEvents[K][] {
      return events.filter((e) => e.type === type).map((e) => e.payload as GameEvents[K]);
    },
    logs(level) {
      return events
        .filter((e) => e.type === 'debug:log' && (e.payload as GameEvents['debug:log']).level === level)
        .map((e) => (e.payload as GameEvents['debug:log']).message);
    },
    script(id: string): CantoScript {
      const loaded = story.canto(id);
      if (!loaded.script) {
        const diags = loaded.diagnostics.map((d) => `${d.code} ${d.message} @${d.pos?.line}`).join('\n');
        throw new Error(`script ${id} did not load (${loaded.status}):\n${diags}`);
      }
      return loaded.script;
    },
  };
}

/** Waits until `predicate` holds, letting timers and microtasks run (fails after `maxTicks` macrotasks). */
export async function until(predicate: () => boolean, maxTicks = 2000): Promise<void> {
  for (let i = 0; i < maxTicks; i++) {
    if (predicate()) return;
    await new Promise<void>((r) => setTimeout(r, 0));
  }
  throw new Error('until(): condition never became true');
}
