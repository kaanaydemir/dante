/**
 * Casting the equipped verse with J (GDD 2.2, bible §3.4.5): needs
 * `unlock:verse`, an equipped verse that `evaluateVerse` accepts, and the
 * Grace it costs. Each tercet (then the coda) plays the effect of its middle
 * word's category:
 *
 *   Force  pushes and stuns       Ward   a shield that turns blows aside
 *   Mend   restores Resolve       Reveal lights the dark for a while
 *   Still  stills hazards, calms the wind
 *   Swift  a long dash and a burst of speed
 *
 * Nothing is ever killed (bible §0.4 rule 5). Mechanics and levels hear every
 * step through `onVerse` and react (beasts stunned, a stone rolled away …).
 *
 * Owner: team D (world).
 */

import type * as Phaser from 'phaser';
import { DEPTH, RESOURCES, TIMINGS } from '../config';
import type { GameStateStore, StoryPresenter } from '../runtime/contracts';
import { castPlan, evaluateVerse, verseContextOf, type VerseCastStep } from '../verse/tercet';
import type { Player } from '../entities/player';
import { facingVector } from '../entities/actor';
import type { VerseCast } from './extras';

export type CastOutcome = 'cast' | 'locked' | 'none' | 'invalid' | 'grace' | 'cooldown';

export interface VerseCasterDeps {
  readonly scene: Phaser.Scene;
  readonly store: GameStateStore;
  readonly presenter: () => StoryPresenter | null;
  readonly sfx: (name: 'verse' | 'ui') => void;
  readonly flashes: () => boolean;
}

/** Durations of the effects (ms), scaled by power. Tunable. */
export const VERSE_EFFECT = {
  wardMs: 3200,
  mendUnits: 2,
  revealMs: 6000,
  stillMs: 4500,
  forceRadius: 56,
  stepGapMs: 260,
} as const;

export class VerseCaster {
  private cooldownMs = 0;
  private lastToast = -Infinity;
  private elapsed = 0;

  constructor(private readonly deps: VerseCasterDeps) {}

  update(dt: number): void {
    this.cooldownMs = Math.max(0, this.cooldownMs - dt);
    this.elapsed += dt;
  }

  /** Try to cast; `apply` runs each step (tercets, then the coda) in order. */
  cast(player: Player, apply: (cast: VerseCast) => void): CastOutcome {
    const { store } = this.deps;
    const state = store.state;
    if (this.cooldownMs > 0) return 'cooldown';
    if (!state.unlocks.includes('verse')) return 'locked';
    const verse = state.equippedVerse;
    if (!verse || verse.tercets.length === 0) {
      this.hint('Compose a verse in the Book (Tab), then cast it with J.');
      return 'none';
    }
    const evaluation = evaluateVerse(verse, verseContextOf(state));
    if (!evaluation.valid) {
      this.hint('That verse no longer holds. Compose it again in the Book.');
      return 'invalid';
    }
    if (state.grace + 1e-6 < evaluation.graceCost) {
      this.hint('Not enough grace. Listen and read to gather more.');
      this.fizzle(player);
      return 'grace';
    }
    store.adjustGrace(-evaluation.graceCost);
    this.cooldownMs = TIMINGS.verseCooldownMs;
    const steps = castPlan(evaluation);
    player.setPose('cast', 420);
    this.deps.sfx('verse');
    const dir = player.heading;
    steps.forEach((step, i) => {
      const run = (): void => {
        this.burst(player, step);
        apply(toCast(step, player, dir));
      };
      if (i === 0) run();
      else this.deps.scene.time.delayedCall(i * VERSE_EFFECT.stepGapMs, run);
    });
    return 'cast';
  }

  private hint(text: string): void {
    if (this.elapsed - this.lastToast < 4000) return;
    this.lastToast = this.elapsed;
    try {
      this.deps.presenter()?.toast(text);
    } catch {
      // ignore
    }
  }

  /** A few dim sparks: the verse failed for want of grace. */
  private fizzle(player: Player): void {
    const s = this.deps.scene;
    if (!s.textures.exists('fx-pixel')) return;
    for (let i = 0; i < 6; i++) {
      const p = s.add.image(player.x + (i - 3) * 3, player.y - 20, 'fx-pixel').setDepth(DEPTH.fx).setTint(0x8a7a5a).setAlpha(0.8);
      s.tweens.add({ targets: p, y: p.y + 10, alpha: 0, duration: 500, onComplete: () => p.destroy() });
    }
  }

  /** Golden letters and a ring of light rise from the open book. */
  private burst(player: Player, step: VerseCastStep): void {
    const s = this.deps.scene;
    const color = CATEGORY_COLOR[step.category] ?? 0xf3d77a;
    if (s.textures.exists('fx-ring')) {
      const ring = s.add.image(player.x, player.y - 14, 'fx-ring').setDepth(DEPTH.fx).setTint(color).setScale(0.15).setAlpha(0.9);
      s.tweens.add({
        targets: ring,
        scale: (VERSE_EFFECT.forceRadius * (0.8 + 0.2 * step.power)) / 32,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
    if (s.textures.exists('fx-letters')) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const l = s.add
          .image(player.x + Math.cos(a) * 6, player.y - 18 + Math.sin(a) * 4, 'fx-letters', String(i % 6))
          .setDepth(DEPTH.fx)
          .setTint(color);
        s.tweens.add({
          targets: l,
          x: player.x + Math.cos(a) * 26,
          y: player.y - 30 + Math.sin(a) * 12,
          alpha: 0,
          duration: 700,
          ease: 'Sine.easeOut',
          onComplete: () => l.destroy(),
        });
      }
    }
    if (this.deps.flashes() && step.kind === 'coda') {
      s.cameras.main.flash(180, 255, 240, 200, false);
    }
  }
}

const CATEGORY_COLOR: Readonly<Record<string, number>> = {
  Force: 0xf0a060,
  Ward: 0xe8f0ff,
  Mend: 0xa0e0a0,
  Reveal: 0xfff0b0,
  Still: 0xa0c8ff,
  Swift: 0xffd080,
};

function toCast(step: VerseCastStep, player: Player, dir: { x: number; y: number }): VerseCast {
  return {
    category: step.category,
    word: step.word,
    kind: step.kind,
    power: step.power,
    index: step.index,
    x: player.x,
    y: player.y,
    dir: Math.hypot(dir.x, dir.y) > 0 ? dir : facingVector(player.actor.facing),
  };
}

/** Resolve restored by a Mend verse of `power` (bar units). */
export function mendAmount(power: number): number {
  return Math.min(RESOURCES.resolveMax, VERSE_EFFECT.mendUnits * power);
}
