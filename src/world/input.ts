/**
 * The world's controls (GDD 2.2, config KEYS / PAD_BUTTONS): movement,
 * dash, verse, interact and the look-back hold, from the keyboard, a gamepad
 * (left stick or d-pad) and the mouse (left click casts the verse).
 *
 * The UI layer owns text advance, choices, Q and the Book; the world reads
 * these only while the player has control (docs/ENGINE.md §7.4).
 *
 * Owner: team D (world). Every device API is guarded: no keyboard, no gamepad
 * plugin or a disconnected pad simply reads as "nothing pressed".
 */

import * as Phaser from 'phaser';
import { KEYS, PAD_BUTTONS, PAD_DEADZONE, type InputAction } from '../config';

export interface WorldInputState {
  /** Movement vector (each axis -1..1; the length may be up to 1). */
  readonly moveX: number;
  readonly moveY: number;
  readonly dashPressed: boolean;
  readonly versePressed: boolean;
  readonly interactPressed: boolean;
  readonly lookBackHeld: boolean;
  /** Any movement or action input this frame (for "the player moved" checks). */
  readonly anyMove: boolean;
}

const IDLE: WorldInputState = {
  moveX: 0,
  moveY: 0,
  dashPressed: false,
  versePressed: false,
  interactPressed: false,
  lookBackHeld: false,
  anyMove: false,
};

type KeyAction = Extract<InputAction, 'up' | 'down' | 'left' | 'right' | 'dash' | 'verse' | 'interact' | 'lookBack'>;
const ACTIONS: readonly KeyAction[] = ['up', 'down', 'left', 'right', 'dash', 'verse', 'interact', 'lookBack'];

export class WorldInput {
  private readonly keys = new Map<KeyAction, Phaser.Input.Keyboard.Key[]>();
  private readonly padPrev = new Map<number, boolean>();
  private pointerClicked = false;
  private state: WorldInputState = IDLE;
  private readonly onPointer = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.leftButtonDown()) this.pointerClicked = true;
  };

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      for (const action of ACTIONS) {
        const list: Phaser.Input.Keyboard.Key[] = [];
        for (const name of KEYS[action]) {
          const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[name];
          if (code === undefined) continue;
          // No capture for keys the UI also uses (E, SPACE): the UI scene must still see them.
          list.push(kb.addKey(code, name !== 'E' && name !== 'SPACE' && name !== 'ENTER'));
        }
        this.keys.set(action, list);
      }
    }
    scene.input.on('pointerdown', this.onPointer);
  }

  get current(): WorldInputState {
    return this.state;
  }

  /** Read the devices once per frame. */
  update(): WorldInputState {
    const down = (a: KeyAction): boolean => (this.keys.get(a) ?? []).some((k) => k.isDown);
    const just = (a: KeyAction): boolean => (this.keys.get(a) ?? []).some((k) => Phaser.Input.Keyboard.JustDown(k));

    let mx = (down('right') ? 1 : 0) - (down('left') ? 1 : 0);
    let my = (down('down') ? 1 : 0) - (down('up') ? 1 : 0);
    let dash = just('dash');
    let verse = just('verse') || this.pointerClicked;
    let interact = just('interact');
    let lookBack = down('lookBack');
    this.pointerClicked = false;

    const pad = this.pad();
    if (pad) {
      const sx = pad.leftStick?.x ?? 0;
      const sy = pad.leftStick?.y ?? 0;
      if (Math.hypot(sx, sy) > PAD_DEADZONE) {
        mx = sx;
        my = sy;
      }
      const btn = (i: number): boolean => Boolean(pad.buttons[i]?.pressed);
      const padDown = (a: InputAction): boolean => (PAD_BUTTONS[a] ?? []).some((i) => btn(i));
      const padJust = (a: InputAction): boolean =>
        (PAD_BUTTONS[a] ?? []).some((i) => {
          const now = btn(i);
          const key = i + (a === 'dash' ? 100 : a === 'verse' ? 200 : 300);
          const before = this.padPrev.get(key) ?? false;
          this.padPrev.set(key, now);
          return now && !before;
        });
      if (padDown('left')) mx = -1;
      if (padDown('right')) mx = 1;
      if (padDown('up')) my = -1;
      if (padDown('down')) my = 1;
      dash = dash || padJust('dash');
      verse = verse || padJust('verse');
      interact = interact || padJust('interact');
      lookBack = lookBack || padDown('lookBack');
    }

    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.state = {
      moveX: mx,
      moveY: my,
      dashPressed: dash,
      versePressed: verse,
      interactPressed: interact,
      lookBackHeld: lookBack,
      anyMove: len > 0.01 || dash,
    };
    return this.state;
  }

  /** Forget held keys (after a pause or when control returns) so nothing "sticks". */
  reset(): void {
    try {
      this.scene.input.keyboard?.resetKeys();
    } catch {
      // ignore
    }
    this.padPrev.clear();
    this.pointerClicked = false;
    this.state = IDLE;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointer);
    const kb = this.scene.input.keyboard;
    if (kb) {
      for (const list of this.keys.values()) {
        for (const k of list) {
          try {
            kb.removeKey(k, true);
          } catch {
            // ignore
          }
        }
      }
    }
    this.keys.clear();
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    try {
      const gp = this.scene.input.gamepad;
      if (!gp || !gp.enabled || gp.total === 0) return null;
      return gp.pad1 ?? gp.getPad(0) ?? null;
    } catch {
      return null;
    }
  }
}
