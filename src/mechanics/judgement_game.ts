/**
 * `judgement_game` (bible §7.0 and §7.5, Canto V s2 "the court of Minos";
 * GDD 3.7): an optional game of watching. Souls confess one by one; before
 * Minos girds himself, the player guesses how many times his tail will wind
 * (the circle, 2–9) by choosing one of eight numbered stones laid out on the
 * floor (left / right to choose, E to judge). Minos then winds his tail and
 * the right stone lights. No score is ever shown; two right guesses or more
 * emit the event (`inf05.minos_two_right`, bible §4.9).
 *
 * Config:
 *   minos?: SpeakerId       default 'MINOS'
 *   at?: Point              centre of the row of stones (default: below Minos)
 *   answers?: number[]      the circle of each soul, in order (default: three picked from the bible's samples)
 *   event?: EventId         emitted after the last soul when two or more were right
 *   guessMs?: number        time to choose before Dante simply watches (default 45000)
 *   prompt?: string | null  a one-line heading toasted at the first soul (default the bible's question)
 *
 * Methods: `judge(index?)` runs one soul's judgement (resolves with the result);
 * `passed`, `rightCount`, `done`.
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import { tryServices } from '../app/services';
import { BaseMechanic, num, type Point, type Waiter } from './base';
import { JudgementGame as JudgementLogic, MAX_CIRCLE, MIN_CIRCLE, pickConfessions, type GuessResult } from './logic/judgement';
import { dustPuff } from './visuals';

export interface JudgementGameConfig {
  readonly minos?: SpeakerId;
  readonly at?: Point;
  readonly answers?: readonly number[];
  readonly event?: EventId;
  readonly guessMs?: number;
  readonly prompt?: string | null;
}

const PROMPT = 'How many times will he wind his tail?';

export class JudgementGameMechanic extends BaseMechanic {
  private readonly cfg: JudgementGameConfig;
  private readonly logic: JudgementLogic;
  private readonly stones: Phaser.GameObjects.Image[] = [];
  private readonly cursor: Phaser.GameObjects.Graphics;
  private selected = 5;
  private choosing: Waiter<'chosen'> | null = null;
  private moveCooldown = 0;
  private emitted = false;
  private prompted = false;
  private running = false;

  constructor(ctx: MechanicContext, cfg: JudgementGameConfig) {
    super('judgement_game', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.event);
    const answers = (cfg.answers ?? pickConfessions(Date.now() % 9973).map((c) => c.circle)).map((n) =>
      Math.max(MIN_CIRCLE, Math.min(MAX_CIRCLE, Math.round(n))),
    );
    this.logic = new JudgementLogic(answers.map((circle) => ({ text: '', circle })));
    const scene = this.scene;
    const at = this.center();
    for (let n = MIN_CIRCLE; n <= MAX_CIRCLE; n++) {
      const i = n - MIN_CIRCLE;
      const x = at.x + (i - 3.5) * 24;
      const y = at.y + Math.abs(i - 3.5) * 3;
      const key = `prop-num-${n}`;
      if (!scene.textures.exists(key)) continue;
      const img = this.own(scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 1).setDepth(DEPTH.groundDecor + 2).setAlpha(0.35));
      img.setData('n', n);
      this.stones.push(img);
    }
    this.cursor = this.own(scene.add.graphics().setDepth(DEPTH.groundDecor + 3));
  }

  private center(): Point {
    if (this.cfg.at) return this.cfg.at;
    const m = this.actorOf(this.cfg.minos ?? 'MINOS');
    if (m) return { x: m.x, y: m.y + 40 };
    return { x: this.player.x, y: this.player.y + 30 };
  }

  get passed(): boolean {
    return this.logic.passed;
  }

  get rightCount(): number {
    return this.logic.rightCount;
  }

  get done(): boolean {
    return this.logic.done;
  }

  get history(): readonly GuessResult[] {
    return this.logic.history;
  }

  /**
   * One soul: the player chooses a stone (or the time runs out and Dante only
   * watches), then Minos winds his tail and the right stone lights. Always resolves.
   */
  async judge(signal?: AbortSignal): Promise<GuessResult | null> {
    if (this.running || this.logic.done) return null;
    const soul = this.logic.current();
    if (!soul) return null;
    this.running = true;
    const w = this.w;
    const release = w?.captureInput('judgement_game') ?? null;
    try {
      this.showStones(true);
      if (!this.prompted && this.cfg.prompt !== null) {
        this.prompted = true;
        try {
          tryServices()?.presenter.toast(this.cfg.prompt ?? PROMPT);
        } catch {
          // optional
        }
      }
      const waiter = this.moment<'chosen'>(Math.max(3000, num(this.cfg.guessMs, 45_000)), signal);
      this.choosing = waiter;
      const how = await waiter.promise;
      this.choosing = null;
      if (how === 'aborted') return null;
      // Unanswered: Dante only watched; the guess cannot be right.
      const guess = how === 'chosen' ? this.selected : soul.circle === MIN_CIRCLE ? MAX_CIRCLE : MIN_CIRCLE;
      const result = this.logic.guess(guess);
      await this.windTail(soul.circle, how === 'chosen' ? this.selected : null, signal);
      if (this.logic.done) this.finish();
      return result;
    } finally {
      this.cursor.clear();
      release?.();
      this.running = false;
    }
  }

  /** Emit the event if the game was passed (also called by `judge` after the last soul). */
  finish(): void {
    if (this.emitted || !this.logic.passed) return;
    this.emitted = true;
    this.emitEvent(this.cfg.event);
  }

  private showStones(on: boolean): void {
    for (const s of this.stones) s.setAlpha(on ? 0.85 : 0.35).clearTint();
  }

  private async windTail(n: number, chosen: number | null, signal?: AbortSignal): Promise<void> {
    const m = this.actorOf(this.cfg.minos ?? 'MINOS');
    const w = this.w;
    for (let k = 1; k <= n; k++) {
      if (signal?.aborted || this.destroyed) return;
      if (m) {
        m.sprite.anims?.stop();
        if (m.sprite.texture.has(`coil-${k}`)) m.sprite.setFrame(`coil-${k}`);
      }
      w?.sfx('blip');
      await this.level.wait(240, signal);
    }
    const right = this.stones.find((s) => s.getData('n') === n);
    right?.setTint(0xf3d77a).setAlpha(1);
    if (chosen !== null && chosen !== n) this.stones.find((s) => s.getData('n') === chosen)?.setTint(0x8a3a30);
    if (right) dustPuff(this.scene, right.x, right.y, 0xf3d77a);
    w?.sfx('thunder');
    await this.level.wait(900, signal);
    if (m && m.sprite.texture.has('idle')) m.sprite.setFrame('idle');
    this.showStones(false);
  }

  protected override step(dt: number): void {
    const waiter = this.choosing;
    const w = this.w;
    if (!waiter || waiter.done || !w) return;
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);
    const input = w.input();
    if (this.moveCooldown <= 0 && Math.abs(input.moveX) > 0.5) {
      this.selected = Math.max(MIN_CIRCLE, Math.min(MAX_CIRCLE, this.selected + (input.moveX > 0 ? 1 : -1)));
      this.moveCooldown = 220;
      w.sfx('ui');
    } else if (Math.abs(input.moveX) <= 0.5) {
      this.moveCooldown = 0;
    }
    if (input.interactPressed) {
      waiter.finish('chosen');
      w.sfx('choice');
    }
    const stone = this.stones.find((s) => s.getData('n') === this.selected);
    this.cursor.clear();
    if (stone) {
      const pulse = 0.55 + 0.45 * Math.sin(this.now() / 160);
      this.cursor.lineStyle(1, 0xf3d77a, pulse);
      this.cursor.strokeRect(stone.x - 12, stone.y - 15, 24, 17);
    }
  }

  override debugInfo(): Record<string, unknown> {
    return {
      ...super.debugInfo(),
      soul: this.logic.history.length,
      of: this.logic.total,
      right: this.logic.rightCount,
      choosing: this.choosing !== null,
      selected: this.selected,
    };
  }
}

export function createJudgementGame(ctx: MechanicContext, cfg: JudgementGameConfig): JudgementGameMechanic {
  return new JudgementGameMechanic(ctx, cfg);
}
