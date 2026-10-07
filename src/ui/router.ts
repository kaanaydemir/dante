/**
 * One input router for the book layer: keyboard (DOM), pointer (canvas),
 * mouse wheel and gamepads (polled each frame). Raw input becomes UiActions
 * and goes to the top handler of a stack: the presenter at the bottom, the
 * Title or the Book on top while they are open. The world (team D) reads its
 * own keys through Phaser and respects `presenter.busy`.
 *
 * Owner: team C (presentation).
 */

import * as Phaser from 'phaser';
import { PAD } from '../config';
import { uiContext } from './context';
import { actionsForCode, actionsForPadButton, repeatCount, shouldPreventDefault, stickDirection, type InputDevice, type UiAction } from './inputMap';
import { now } from './phaser/helpers';

export interface ActionMeta {
  readonly device: InputDevice;
  /** KeyboardEvent.code for keys, `pad:<index>` for buttons. */
  readonly code: string;
  readonly repeat: boolean;
  readonly time: number;
  readonly shift: boolean;
}

export interface PointerMeta {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly time: number;
}

export interface InputHandler {
  /** Handle one action; return true when consumed (the next action of the same key is then skipped). */
  onAction(action: UiAction, meta: ActionMeta): boolean;
  onPointer?(meta: PointerMeta): boolean;
  onWheel?(deltaY: number): boolean;
  /** True while this handler wants the Book's shoulder bindings (tab switching) on the pad. */
  readonly padBook?: boolean;
}

interface PadState {
  buttons: boolean[];
  stick: string | null;
  heldSince: Map<string, number>;
  fired: Map<string, number>;
}

export class InputRouter {
  private stack: InputHandler[] = [];
  private pads = new Map<number, PadState>();
  private disposed = false;
  private readonly onKey = (e: KeyboardEvent): void => this.key(e);
  private readonly onPointerDown = (e: PointerEvent): void => this.pointer(e);
  private readonly onWheelEvt = (e: WheelEvent): void => this.wheel(e);
  private readonly onStep = (): void => this.pollPads();

  constructor(private readonly game: Phaser.Game) {
    try {
      window.addEventListener('keydown', this.onKey);
    } catch {
      // no window (tests)
    }
    const attach = (): void => {
      try {
        this.game.canvas?.addEventListener('pointerdown', this.onPointerDown);
        this.game.canvas?.addEventListener('wheel', this.onWheelEvt, { passive: true });
      } catch {
        // no canvas yet
      }
    };
    if (this.game.canvas) attach();
    else this.game.events.once(Phaser.Core.Events.READY, attach);
    this.game.events.on(Phaser.Core.Events.POST_STEP, this.onStep);
  }

  /** Put a handler on top; returns its remover. */
  push(handler: InputHandler): () => void {
    this.stack = this.stack.filter((h) => h !== handler);
    this.stack.push(handler);
    return () => {
      this.stack = this.stack.filter((h) => h !== handler);
    };
  }

  /** Put a handler at the bottom (the presenter). */
  base(handler: InputHandler): void {
    this.stack = [handler, ...this.stack.filter((h) => h !== handler)];
  }

  get top(): InputHandler | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  private dispatch(actions: readonly UiAction[], meta: ActionMeta): boolean {
    const h = this.top;
    if (!h) return false;
    for (const a of actions) {
      try {
        if (h.onAction(a, meta)) return true;
      } catch (err) {
        this.report(err);
        return true;
      }
    }
    return false;
  }

  /**
   * A UI action from a clickable control (the HUD's Book icon, "Ask Virgil"),
   * delivered exactly like a key press to the top handler.
   */
  inject(action: UiAction): boolean {
    this.gesture();
    return this.dispatch([action], { device: uiContext().device(), code: 'Pointer', repeat: false, time: now(), shift: false });
  }

  /** The first user gesture unlocks WebAudio (browsers require one). */
  private gesture(): void {
    try {
      uiContext().audio()?.unlock();
    } catch {
      // audio is optional
    }
  }

  private key(e: KeyboardEvent): void {
    if (this.disposed || e.ctrlKey || e.metaKey || e.altKey) return;
    this.gesture();
    const actions = actionsForCode(e.code);
    if (shouldPreventDefault(e.code)) {
      try {
        e.preventDefault();
      } catch {
        // ignore
      }
    }
    if (actions.length === 0) return;
    uiContext().setDevice('keyboard');
    this.dispatch(actions, { device: 'keyboard', code: e.code, repeat: e.repeat, time: now(), shift: e.shiftKey });
  }

  private pointer(e: PointerEvent): void {
    if (this.disposed) return;
    this.gesture();
    uiContext().setDevice('keyboard');
    const h = this.top;
    if (!h?.onPointer) return;
    let x = 0;
    let y = 0;
    try {
      x = this.game.scale.transformX(e.pageX);
      y = this.game.scale.transformY(e.pageY);
    } catch {
      // keep 0,0
    }
    try {
      h.onPointer({ x, y, button: e.button, time: now() });
    } catch (err) {
      this.report(err);
    }
  }

  private wheel(e: WheelEvent): void {
    const h = this.top;
    if (!h?.onWheel) return;
    try {
      h.onWheel(e.deltaY);
    } catch (err) {
      this.report(err);
    }
  }

  private pollPads(): void {
    if (this.disposed) return;
    let list: (Gamepad | null)[] = [];
    try {
      const nav = navigator as Navigator & { getGamepads?: () => (Gamepad | null)[] };
      list = nav.getGamepads ? Array.from(nav.getGamepads()) : [];
    } catch {
      return;
    }
    const t = now();
    for (const pad of list) {
      if (!pad || !pad.connected) continue;
      let st = this.pads.get(pad.index);
      if (!st) {
        st = { buttons: [], stick: null, heldSince: new Map(), fired: new Map() };
        this.pads.set(pad.index, st);
      }
      const book = this.top?.padBook ?? false;
      pad.buttons.forEach((b, i) => {
        const pressed = !!b && (b.pressed || b.value > 0.5);
        const was = st!.buttons[i] ?? false;
        st!.buttons[i] = pressed;
        const key = `b${i}`;
        const isDir = i === PAD.DPAD_UP || i === PAD.DPAD_DOWN || i === PAD.DPAD_LEFT || i === PAD.DPAD_RIGHT;
        if (pressed && !was) {
          st!.heldSince.set(key, t);
          st!.fired.set(key, 0);
          uiContext().setDevice('gamepad');
          this.dispatch(actionsForPadButton(i, { book }), { device: 'gamepad', code: `pad:${i}`, repeat: false, time: t, shift: false });
        } else if (pressed && was && isDir) {
          const n = repeatCount(t - (st!.heldSince.get(key) ?? t));
          if (n > (st!.fired.get(key) ?? 0)) {
            st!.fired.set(key, n);
            this.dispatch(actionsForPadButton(i, { book }), { device: 'gamepad', code: `pad:${i}`, repeat: true, time: t, shift: false });
          }
        }
      });
      const dir = stickDirection(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      if (dir !== st.stick) {
        st.stick = dir;
        st.heldSince.set('stick', t);
        st.fired.set('stick', 0);
        if (dir) {
          uiContext().setDevice('gamepad');
          this.dispatch([dir], { device: 'gamepad', code: 'pad:stick', repeat: false, time: t, shift: false });
        }
      } else if (dir) {
        const n = repeatCount(t - (st.heldSince.get('stick') ?? t));
        if (n > (st.fired.get('stick') ?? 0)) {
          st.fired.set('stick', n);
          this.dispatch([dir], { device: 'gamepad', code: 'pad:stick', repeat: true, time: t, shift: false });
        }
      }
    }
  }

  private report(err: unknown): void {
    try {
      uiContext()
        .bus()
        ?.emit('debug:log', { level: 'error', message: `UI input handler failed: ${err instanceof Error ? err.message : String(err)}` });
    } catch {
      // nothing else to do
    }
  }

  dispose(): void {
    this.disposed = true;
    try {
      window.removeEventListener('keydown', this.onKey);
      this.game.canvas?.removeEventListener('pointerdown', this.onPointerDown);
      this.game.canvas?.removeEventListener('wheel', this.onWheelEvt);
      this.game.events.off(Phaser.Core.Events.POST_STEP, this.onStep);
    } catch {
      // ignore
    }
  }
}

let routerRef: InputRouter | null = null;

export function setUiRouter(r: InputRouter): void {
  routerRef = r;
}

/** The router (null before the presenter exists). */
export function uiRouter(): InputRouter | null {
  return routerRef;
}
