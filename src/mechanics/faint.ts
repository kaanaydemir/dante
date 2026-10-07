/**
 * `faint` (bible §7.0; the scripted faints that close Cantos III and V): not
 * a failure but the story's own ending of a canto (GDD 2.4).
 *
 * - `falter()` (V s7 "The Other One"): control returns for a breath; the
 *   first step the player tries turns into a stagger, his knees give way, and
 *   the configured event is emitted. If the player does nothing, it happens by
 *   itself after `timeoutMs`.
 * - `fall()`: Dante falls where he stands; the world fades to a colour (the
 *   presenter's CAM white-out does the screen; this is the body and the world).
 *
 * Config:
 *   falterEvent?: EventId    emitted when he falters
 *   timeoutMs?: number       he falters by himself after this long (default 6000)
 *   auto?: boolean           start waiting for the first step at once (default false)
 *
 * Owner: team D (mechanics).
 */

import type { MechanicContext } from '../runtime/contracts';
import type { EventId } from '../story/types';
import { BaseMechanic, num, type Waiter } from './base';
import { dustPuff } from './visuals';

export interface FaintConfig {
  readonly falterEvent?: EventId;
  readonly timeoutMs?: number;
  readonly auto?: boolean;
}

export class Faint extends BaseMechanic {
  private readonly cfg: FaintConfig;
  private waiter: Waiter<'stepped'> | null = null;
  private faltered = false;
  private fallen = false;

  constructor(ctx: MechanicContext, cfg: FaintConfig) {
    super('faint', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.falterEvent);
    if (cfg.auto) void this.falter();
  }

  get hasFaltered(): boolean {
    return this.faltered;
  }

  /** Wait for the first attempted step (or the timeout), then stagger and emit. Always resolves. */
  async falter(signal?: AbortSignal): Promise<void> {
    if (this.faltered) return;
    if (!this.waiter || this.waiter.done) this.waiter = this.moment<'stepped'>(Math.max(500, num(this.cfg.timeoutMs, 6000)), signal);
    const r = await this.waiter.promise;
    this.waiter = null;
    if (r === 'aborted' || this.faltered) return;
    this.faltered = true;
    const w = this.w;
    if (w && !this.destroyed) {
      const unlock = w.lock('falter');
      try {
        const p = this.player;
        // A stagger: half a step, then the knees give way.
        w.dante.knock(w.dante.heading.x * 40, w.dante.heading.y * 20, 160);
        await this.level.wait(260);
        w.dante.setPose('faint');
        dustPuff(this.scene, p.x, p.y);
        w.sfx('faint');
        await this.level.wait(500);
      } finally {
        unlock();
      }
    }
    this.emitEvent(this.cfg.falterEvent);
  }

  /** The scripted fall: Dante goes down and the world fades to `color`. Always resolves. */
  async fall(opts: { readonly color?: 'white' | 'red' | 'black'; readonly ms?: number; readonly signal?: AbortSignal } = {}): Promise<void> {
    if (this.fallen) return;
    this.fallen = true;
    const w = this.w;
    if (!w) return;
    await w.scriptedFaint({ ...opts });
  }

  protected override step(): void {
    const waiter = this.waiter;
    const w = this.w;
    if (!waiter || waiter.done || !w) return;
    const input = w.input();
    if (Math.hypot(input.moveX, input.moveY) > 0.2 || input.dashPressed || input.interactPressed) waiter.finish('stepped');
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), waiting: this.waiter !== null, faltered: this.faltered, fallen: this.fallen };
  }
}

export function createFaint(ctx: MechanicContext, cfg: FaintConfig): Faint {
  return new Faint(ctx, cfg);
}
