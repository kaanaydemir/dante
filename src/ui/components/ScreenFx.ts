/**
 * Screen-level effects of the book layer (ENGINE §5.11, presenter half):
 * fade-in / fade-out, the white (or red) out of a faint, the engraving hatch
 * of engrave / unengrave, cinematic letterbox bars, a page-turn sweep over the
 * world, and the fear vignette.
 *
 * The fade sits under the HUD and text (text over black stays readable); the
 * white-out covers everything.
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, TIMINGS } from '../../config';
import { fadeBarTexture, hatchTexture, panelTexture, radialVignetteTexture } from '../art/textures';
import { uiContext } from '../context';
import { stopTweens, tweenTo } from '../phaser/helpers';

const BAR_H = 58;

export class ScreenFx {
  private readonly fade: Phaser.GameObjects.Rectangle;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly hatch: Phaser.GameObjects.Image;
  private readonly fear: Phaser.GameObjects.Image;
  private readonly barTop: Phaser.GameObjects.Container;
  private readonly barBottom: Phaser.GameObjects.Container;
  private letterbox = false;

  constructor(private readonly scene: Phaser.Scene) {
    const pal = { ink: 0x15130f, paper: 0xe6dcc3 };
    this.fade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0, 0).setDepth(DEPTH.hud - 40).setAlpha(0);
    this.hatch = scene.add.image(0, 0, hatchTexture(scene, pal.ink, pal.paper)).setOrigin(0, 0).setDepth(DEPTH.hud - 45).setAlpha(0);
    this.fear = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, radialVignetteTexture(scene)).setDepth(DEPTH.hud - 50).setAlpha(0);
    this.fear.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.flash = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 1).setOrigin(0, 0).setDepth(DEPTH.transition).setAlpha(0);
    const barTex = fadeBarTexture(scene, 0x000000, 18);
    const mkBar = (top: boolean): Phaser.GameObjects.Container => {
      const solid = scene.add.rectangle(0, 0, GAME_WIDTH, BAR_H, 0x000000, 1).setOrigin(0, top ? 0 : 1);
      const edge = scene.add.image(0, top ? BAR_H : -BAR_H, barTex).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, 18);
      if (!top) edge.setFlipY(true).setOrigin(0, 1);
      const cont = scene.add.container(0, top ? -BAR_H - 18 : GAME_HEIGHT + BAR_H + 18, [solid, edge]);
      cont.setDepth(DEPTH.hud - 30);
      return cont;
    };
    this.barTop = mkBar(true);
    this.barBottom = mkBar(false);
  }

  get faded(): boolean {
    return this.fade.alpha > 0.01;
  }

  async fadeOut(ms: number = TIMINGS.fadeMs): Promise<void> {
    stopTweens(this.scene, this.fade);
    await tweenTo(this.scene, { targets: this.fade, alpha: 1, duration: ms });
  }

  async fadeIn(ms: number = TIMINGS.fadeMs): Promise<void> {
    stopTweens(this.scene, this.fade);
    if (this.fade.alpha <= 0.01 && this.flash.alpha <= 0.01) return;
    const flash = this.flash.alpha > 0.01 ? tweenTo(this.scene, { targets: this.flash, alpha: 0, duration: ms }) : Promise.resolve();
    await Promise.all([tweenTo(this.scene, { targets: this.fade, alpha: 0, duration: ms }), flash]);
  }

  /** Faint: to white (or red) quickly, hold, then to black. Respects settings.flashes. */
  async whiteOut(red: boolean): Promise<void> {
    const flashes = uiContext().settings().flashes;
    const color = red ? 0xb3261e : 0xfff7e6;
    this.flash.setFillStyle(color, 1);
    stopTweens(this.scene, this.flash);
    if (flashes) {
      await tweenTo(this.scene, { targets: this.flash, alpha: 1, duration: Math.round(TIMINGS.whiteOutMs * 0.35), ease: 'Quad.easeIn' });
      await tweenTo(this.scene, { targets: this.flash, alpha: 1, duration: Math.round(TIMINGS.whiteOutMs * 0.3) });
    } else {
      // No flash: a slow, dim tint instead.
      await tweenTo(this.scene, { targets: this.flash, alpha: 0.45, duration: TIMINGS.whiteOutMs * 1.6, ease: 'Sine.easeInOut' });
    }
    this.fade.setAlpha(1);
    await tweenTo(this.scene, { targets: this.flash, alpha: 0, duration: Math.round(TIMINGS.whiteOutMs * 0.6) });
  }

  /** The scene turns into an engraving (overlay half; the world desaturates itself). */
  async engrave(ms: number = TIMINGS.engraveMs): Promise<void> {
    stopTweens(this.scene, this.hatch);
    await tweenTo(this.scene, { targets: this.hatch, alpha: 0.85, duration: ms });
  }

  async unengrave(ms: number = TIMINGS.unengraveMs): Promise<void> {
    stopTweens(this.scene, this.hatch);
    if (this.hatch.alpha <= 0.01) return;
    await tweenTo(this.scene, { targets: this.hatch, alpha: 0, duration: ms });
  }

  get engraved(): boolean {
    return this.hatch.alpha > 0.01;
  }

  /** A page sweeps across the world (CAM page-turn outside the book). */
  async pageSweep(ms: number = TIMINGS.pageTurnMs): Promise<void> {
    const theme = uiContext().theme();
    const panel = panelTexture(this.scene, 'plate', GAME_WIDTH / 2, GAME_HEIGHT, theme);
    const page = this.scene.add.image(GAME_WIDTH, 0, panel.key).setOrigin(0, 0).setDepth(DEPTH.transition - 5);
    page.setDisplaySize(GAME_WIDTH / 2, GAME_HEIGHT);
    const shadow = this.scene.add.rectangle(GAME_WIDTH, 0, 40, GAME_HEIGHT, 0x000000, 0.35).setOrigin(1, 0).setDepth(DEPTH.transition - 6);
    await tweenTo(this.scene, {
      targets: [page, shadow],
      x: -GAME_WIDTH / 2,
      duration: ms,
      ease: 'Cubic.easeInOut',
    });
    page.destroy();
    shadow.destroy();
  }

  setLetterbox(on: boolean): void {
    if (on === this.letterbox) return;
    this.letterbox = on;
    this.scene.tweens.add({ targets: this.barTop, y: on ? 0 : -BAR_H - 18, duration: 380, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: this.barBottom, y: on ? GAME_HEIGHT : GAME_HEIGHT + BAR_H + 18, duration: 380, ease: 'Cubic.easeOut' });
  }

  setFear(intensity: number): void {
    const target = Math.max(0, Math.min(1, intensity));
    stopTweens(this.scene, this.fear);
    this.scene.tweens.add({ targets: this.fear, alpha: target, duration: target > this.fear.alpha ? 300 : 900 });
  }

  /** Back to a clean screen (new canto, title). */
  reset(): void {
    for (const o of [this.fade, this.flash, this.hatch, this.fear]) {
      stopTweens(this.scene, o);
      o.setAlpha(0);
    }
    this.letterbox = false;
    this.barTop.y = -BAR_H - 18;
    this.barBottom.y = GAME_HEIGHT + BAR_H + 18;
  }

  /** Finish whatever is animating (autoplay / skip): fades jump to their end. */
  complete(): void {
    for (const o of [this.fade, this.flash, this.hatch]) {
      for (const t of this.scene.tweens.getTweensOf(o)) t.complete();
    }
  }
}
