/**
 * Headless stand-ins for the presenter and the world. The session uses them
 * until the Phaser layers attach (bootstrap does that before the first frame),
 * so a session can run a whole chapter without any UI: every text resolves at
 * once, choices take the first option, and every trigger falls back to the
 * runner (the world reports that it can satisfy nothing).
 *
 * Owner: team B (runtime). Pure.
 */

import type {
  ChoiceOptionView,
  ChoiceSpec,
  StoryPresenter,
  WorldBridge,
} from './contracts';
import type { OptionLetter } from '../story/types';

export function createHeadlessPresenter(): StoryPresenter {
  const done = (): Promise<void> => Promise.resolve();
  return {
    busy: false,
    beginCanto: done,
    endCanto: done,
    setMode: done,
    openPage: done,
    narration: done,
    say: done,
    quote: done,
    bark: () => undefined,
    hintAvailable: () => undefined,
    hint: done,
    choose: (_choice: ChoiceSpec, options: readonly ChoiceOptionView[]): Promise<OptionLetter> =>
      Promise.resolve(options[0]?.letter ?? 'a'),
    reveal: done,
    wordGained: done,
    codexGained: done,
    memoryGained: done,
    unlock: done,
    heartShift: done,
    tutorial: () => undefined,
    toast: () => undefined,
    camera: done,
    sfx: () => undefined,
    colophon: done,
    chapterEnd: done,
    missingCanto: done,
    showTitle: () => undefined,
    skip: () => undefined,
    answer: () => false,
    cancelAll: () => undefined,
  };
}

export function createHeadlessWorld(): WorldBridge {
  const done = (): Promise<void> => Promise.resolve();
  return {
    loadCanto: done,
    unloadCanto: () => undefined,
    beginBeat: done,
    endBeat: done,
    direct: done,
    camera: done,
    setPlayerControl: () => undefined,
    checkpoint: () => undefined,
    setVirgilTrust: () => undefined,
    setArmed: () => undefined,
    canSatisfy: () => false,
    isSatisfied: () => false,
    satisfy: () => undefined,
    teleport: () => false,
    places: () => [],
    cancel: () => undefined,
    debugInfo: () => ({ headless: true }),
  };
}
