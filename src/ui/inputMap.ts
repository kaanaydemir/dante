/**
 * Pure input mapping for the book layer: keyboard codes and gamepad buttons
 * to the actions of config KEYS / PAD_BUTTONS, plus a few book-only actions.
 *
 * Owner: team C (presentation). No Phaser, no DOM.
 */

import { KEYS, PAD, PAD_BUTTONS, PAD_DEADZONE, type InputAction } from '../config';

/** Everything the UI reacts to. Config actions plus book navigation. */
export type UiAction = InputAction | 'tabPrev' | 'tabNext' | 'pageUp' | 'pageDown' | 'home' | 'end';

/** Phaser key names used in config KEYS -> KeyboardEvent.code values. */
const KEY_NAME_TO_CODES: Readonly<Record<string, readonly string[]>> = {
  UP: ['ArrowUp'],
  DOWN: ['ArrowDown'],
  LEFT: ['ArrowLeft'],
  RIGHT: ['ArrowRight'],
  SPACE: ['Space'],
  ENTER: ['Enter', 'NumpadEnter'],
  TAB: ['Tab'],
  ESC: ['Escape'],
  BACKSPACE: ['Backspace'],
  SHIFT: ['ShiftLeft', 'ShiftRight'],
  ONE: ['Digit1', 'Numpad1'],
  TWO: ['Digit2', 'Numpad2'],
  THREE: ['Digit3', 'Numpad3'],
};

/** `E` -> `KeyE`, `UP` -> `ArrowUp`, … */
export function codesForKeyName(name: string): readonly string[] {
  const known = KEY_NAME_TO_CODES[name];
  if (known) return known;
  if (/^[A-Z]$/.test(name)) return [`Key${name}`];
  if (/^[0-9]$/.test(name)) return [`Digit${name}`];
  return [name];
}

/** Extra keys only the book layer uses. */
const BOOK_KEYS: Readonly<Record<string, readonly UiAction[]>> = {
  PageUp: ['pageUp'],
  PageDown: ['pageDown'],
  Home: ['home'],
  End: ['end'],
  BracketLeft: ['tabPrev'],
  BracketRight: ['tabNext'],
};

let codeTable: Map<string, UiAction[]> | null = null;

function table(): Map<string, UiAction[]> {
  if (codeTable) return codeTable;
  const t = new Map<string, UiAction[]>();
  for (const [action, names] of Object.entries(KEYS) as [InputAction, readonly string[]][]) {
    for (const name of names) {
      for (const code of codesForKeyName(name)) {
        const list = t.get(code) ?? [];
        if (!list.includes(action)) list.push(action);
        t.set(code, list);
      }
    }
  }
  for (const [code, actions] of Object.entries(BOOK_KEYS)) {
    const list = t.get(code) ?? [];
    for (const a of actions) if (!list.includes(a)) list.push(a);
    t.set(code, list);
  }
  codeTable = t;
  return t;
}

/** Actions bound to a KeyboardEvent.code (several are possible: E is interact and advance). */
export function actionsForCode(code: string): readonly UiAction[] {
  return table().get(code) ?? [];
}

/** Keys the browser must not handle itself while the game has focus (Tab moves focus, Space scrolls…). */
export function shouldPreventDefault(code: string): boolean {
  return (
    code === 'Tab' ||
    code === 'Space' ||
    code === 'Backspace' ||
    code === 'ArrowUp' ||
    code === 'ArrowDown' ||
    code === 'ArrowLeft' ||
    code === 'ArrowRight' ||
    code === 'PageUp' ||
    code === 'PageDown' ||
    code === 'Home' ||
    code === 'End' ||
    code === 'Enter'
  );
}

/** Book-only pad bindings: shoulders switch tabs while the Book is open. */
const PAD_BOOK: Readonly<Record<number, readonly UiAction[]>> = {
  [PAD.LB]: ['tabPrev'],
  [PAD.RB]: ['tabNext'],
  [PAD.LT]: ['pageUp'],
  [PAD.RT]: ['pageDown'],
};

/** Actions of a standard-mapping gamepad button. `book` adds the Book-only shoulder bindings. */
export function actionsForPadButton(index: number, opts: { book?: boolean } = {}): readonly UiAction[] {
  const out: UiAction[] = [];
  for (const [action, buttons] of Object.entries(PAD_BUTTONS) as [InputAction, readonly number[] | undefined][]) {
    if (buttons?.includes(index)) out.push(action);
  }
  if (opts.book) for (const a of PAD_BOOK[index] ?? []) if (!out.includes(a)) out.push(a);
  return out;
}

/** Left stick -> one of the four directions, or null inside the dead zone (dominant axis wins). */
export function stickDirection(x: number, y: number, deadzone: number = Math.max(PAD_DEADZONE, 0.5)): 'up' | 'down' | 'left' | 'right' | null {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax < deadzone && ay < deadzone) return null;
  if (ay >= ax) return y < 0 ? 'up' : 'down';
  return x < 0 ? 'left' : 'right';
}

/** Key labels for prompts, by device. */
export type InputDevice = 'keyboard' | 'gamepad';

const PROMPT_LABELS: Readonly<Record<'advance' | 'interact' | 'askVirgil' | 'book' | 'back' | 'verse' | 'dash' | 'lookBack' | 'confirm', Readonly<Record<InputDevice, string>>>> = {
  advance: { keyboard: 'E', gamepad: 'A' },
  confirm: { keyboard: 'Enter', gamepad: 'A' },
  interact: { keyboard: 'E', gamepad: 'Y' },
  askVirgil: { keyboard: 'Q', gamepad: 'LB' },
  book: { keyboard: 'Tab', gamepad: 'Start' },
  back: { keyboard: 'Esc', gamepad: 'B' },
  verse: { keyboard: 'J', gamepad: 'X' },
  dash: { keyboard: 'Shift', gamepad: 'A' },
  lookBack: { keyboard: 'R', gamepad: 'RB' },
};

export function promptKey(action: keyof typeof PROMPT_LABELS, device: InputDevice): string {
  return PROMPT_LABELS[action][device];
}

/**
 * Key-repeat for held directions in menus: first repeat after `delay`, then every `interval`.
 * Returns how many repeats have fired after holding for `heldMs`.
 */
export function repeatCount(heldMs: number, delay = 380, interval = 110): number {
  if (heldMs < delay) return 0;
  return 1 + Math.floor((heldMs - delay) / interval);
}
