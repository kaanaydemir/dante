/**
 * Interface copy (English): unlock toasts, tutorial prompts, word-card labels,
 * the chapter-end phrases for trust and virtues. Plain, quiet, in the book's
 * register; never numbers for the heart or for trust (bible §0.4 rule 8, §3.3).
 */

import type { TrustLabel } from '../../runtime/contracts';
import type { TutorialName, UnlockFeature, Virtue, WordCategory } from '../../story/types';
import { promptKey, type InputDevice } from '../inputMap';

export interface UnlockCopy {
  readonly title: string;
  readonly body: string;
}

export function unlockCopy(feature: UnlockFeature, device: InputDevice = 'keyboard'): UnlockCopy {
  const book = promptKey('book', device);
  switch (feature) {
    case 'book':
      return { title: 'The Book', body: `The whole canto is yours to read. ${book} opens the Book.` };
    case 'words':
      return { title: 'Words', body: `Words gathered from the poem are kept in the Book (${book}).` };
    case 'verse':
      return { title: 'Verse', body: `Your verse can be spoken aloud: ${promptKey('verse', device)}.` };
    case 'compose':
      return { title: 'Compose', body: 'Three words make a verse. Compose it in the Book, under Words.' };
    case 'heart':
      return { title: 'The Scale', body: 'A scale now hangs beside your resolve. It has no numbers.' };
    case 'codex':
      return { title: 'Souls · Places · Lore', body: 'Every page the journey gave you is open in the Book.' };
    case 'remembrance':
      return { title: 'Remembrance', body: 'Names the world remembers, and the ones you carry.' };
    case 'chain':
      return { title: 'Chains', body: 'A middle word can lend its sound to the next verse.' };
  }
  return { title: 'The Book', body: 'A new page.' };
}

/** `{tutorial:<name>}` prompts (non-blocking, short). */
export function tutorialCopy(name: TutorialName, device: InputDevice = 'keyboard'): { keys: string[]; text: string } {
  const pad = device === 'gamepad';
  switch (name) {
    case 'move':
      return { keys: pad ? ['L-Stick'] : ['W', 'A', 'S', 'D'], text: pad ? 'Walk' : 'Walk (or the arrow keys)' };
    case 'dash':
      return { keys: [promptKey('dash', device)], text: pad ? 'Dash' : 'Dash (Shift or Space)' };
    case 'talk':
      return { keys: [promptKey('interact', device)], text: 'Speak' };
    case 'follow':
      return { keys: [], text: 'Follow Virgil' };
    case 'read':
      return { keys: [promptKey('interact', device)], text: 'Take the glowing word' };
    case 'compose':
      return { keys: [promptKey('book', device)], text: 'Compose a verse in the Book, under Words' };
    case 'verse':
      return { keys: [promptKey('verse', device)], text: 'Speak your verse' };
    case 'chain':
      return { keys: [promptKey('book', device)], text: 'Chain two verses in the Book' };
    case 'shelter':
      return { keys: [promptKey('dash', device)], text: 'Shelter behind the rocks; dash when the wind falls' };
  }
  return { keys: [], text: '' };
}

/** What a word category does, for the word cards (bible §3.4.3). */
export const CATEGORY_COPY: Readonly<Record<WordCategory, string>> = {
  Force: 'Moves and stuns',
  Ward: 'Turns a blow aside',
  Mend: 'Restores resolve',
  Reveal: 'Shows the hidden way',
  Still: 'Stills danger and wind',
  Swift: 'Carries you onward',
  Burden: 'A weight you carry',
};

export const VIRTUE_NAMES: Readonly<Record<Virtue, string>> = {
  prudence: 'Prudence',
  justice: 'Justice',
  fortitude: 'Fortitude',
  temperance: 'Temperance',
};

/** Bible §3.3: trust is shown as Virgil's distance and posture, never as a number. */
export function trustPhrase(label: TrustLabel): string {
  switch (label) {
    case 'Faithful':
      return 'Virgil walked close beside him.';
    case 'Wayward':
      return 'Virgil walked a step ahead, and waited less.';
    default:
      return 'Virgil walked with him, a little ahead.';
  }
}

/** The heart at the chapter end in words (bible §3.1 thresholds; no numbers). */
export function heartPhrase(pity: number, justice: number): string {
  const balance = pity - justice;
  if (pity === 0 && justice === 0) return 'The scale hung empty.';
  if (balance >= 3) return 'The scale leaned toward pity.';
  if (balance <= -3) return 'The scale leaned toward justice.';
  if (pity > 0 && justice > 0) return 'The scale held weight on both sides.';
  return 'The scale moved, but only a little.';
}

/** Virtue brightness for the four stars (bible §3.6 tiers), 0 dark … 3 bright. */
export function starLevel(points: number): number {
  if (points >= 9) return 3;
  if (points >= 5) return 2;
  if (points >= 2) return 1;
  return points > 0 ? 0.5 : 0;
}

export const CHANGE_COPY = {
  gained: 'Word gathered',
  unsealed: 'The seal is broken',
  sealed: 'Sealed',
  shed: 'Set down',
} as const;
