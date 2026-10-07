/**
 * Full book pages over everything: the s0 opening page, PAGE lines, the
 * illustrated reading pages of page-mode beats, the colophon, the chapter
 * end, and "This canto is still being written". Also the dark curtain between
 * cantos and the vignette that grows into the world (bible §1.3.2).
 *
 * The presenter drives it (src/ui/presenter.ts). Owner: team C (presentation).
 * Keep the class name and scene key.
 */

import * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PAGE_BACKGROUND } from '../config';
import { iconTexture } from '../ui/art/textures';
import { BookSpread } from '../ui/components/BookSpread';
import { BOOK_ICON } from '../ui/components/Hud';
import { OverlaySet } from '../ui/components/OverlaySet';
import { uiContext } from '../ui/context';
import { destroy, stopTweens, tweenTo } from '../ui/phaser/helpers';
import type { BookPageApi } from '../ui/sceneApi';
import { SceneKeys } from './keys';

export class BookPageScene extends Phaser.Scene implements BookPageApi {
  uiReady = false;
  spread!: BookSpread;
  overlays!: OverlaySet;
  private curtain!: Phaser.GameObjects.Rectangle;
  private bookIcon!: Phaser.GameObjects.Image;
  private held: Phaser.GameObjects.Image | null = null;
  /** The alpha the curtain is fading to (or rests at); finishTransitions() puts it there. */
  private curtainGoal = 0;

  constructor() {
    super({ key: SceneKeys.BookPage });
  }

  create(): void {
    this.uiReady = false;
    const theme = uiContext().theme();
    const bgColor = Phaser.Display.Color.HexStringToColor(PAGE_BACKGROUND).color;
    this.curtain = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, bgColor, 1).setOrigin(0, 0).setDepth(DEPTH.page - 20).setAlpha(0);
    this.curtainGoal = 0;
    this.spread = new BookSpread(this);
    this.bookIcon = this.add.image(BOOK_ICON.x, BOOK_ICON.y, iconTexture(this, 'book', theme.colors.rubric, theme.colors.ink, 44)).setDepth(DEPTH.page + 60).setAlpha(0);
    this.overlays = new OverlaySet(this, {
      depthOffset: DEPTH.page,
      bookTarget: () => ({ x: BOOK_ICON.x, y: BOOK_ICON.y }),
      onBookLand: () => this.pulseBook(),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.uiReady = false;
      this.held = null;
    });
    this.uiReady = true;
  }

  get curtainUp(): boolean {
    return this.curtain.alpha > 0.5;
  }

  get holding(): boolean {
    return this.held !== null;
  }

  showCurtain(alpha = 1): void {
    stopTweens(this, this.curtain);
    this.curtainGoal = alpha;
    this.curtain.setAlpha(alpha);
  }

  async hideCurtain(ms: number): Promise<void> {
    stopTweens(this, this.curtain);
    this.curtainGoal = 0;
    if (this.curtain.alpha <= 0.01) return;
    await tweenTo(this, { targets: this.curtain, alpha: 0, duration: ms });
  }

  async dimCurtain(alpha: number, ms: number): Promise<void> {
    stopTweens(this, this.curtain);
    this.curtainGoal = alpha;
    if (Math.abs(this.curtain.alpha - alpha) < 0.01) return;
    if (ms <= 0) {
      this.curtain.setAlpha(alpha);
      return;
    }
    await tweenTo(this, { targets: this.curtain, alpha, duration: ms });
  }

  holdVignette(image: Phaser.GameObjects.Image | null): void {
    destroy(this.held);
    this.held = null;
    if (!image) return;
    // Re-create the vignette at its on-page position, free of the spread.
    const m = image.getWorldTransformMatrix();
    const copy = this.add.image(m.tx, m.ty, image.texture.key).setScale(m.scaleX, m.scaleY).setDepth(DEPTH.page + 30);
    this.held = copy;
    this.tweens.add({ targets: copy, x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, duration: 600, ease: 'Cubic.easeInOut' });
  }

  async growVignette(ms: number): Promise<void> {
    const img = this.held;
    if (!img) {
      await this.hideCurtain(Math.round(ms * 0.6));
      return;
    }
    const cover = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height) * 1.04;
    this.curtainGoal = 0;
    stopTweens(this, img);
    await tweenTo(this, { targets: img, x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, scale: cover, duration: Math.round(ms * 0.55), ease: 'Cubic.easeIn' });
    this.curtain.setAlpha(0);
    await tweenTo(this, { targets: img, alpha: 0, duration: Math.round(ms * 0.45), ease: 'Sine.easeOut' });
    destroy(img);
    if (this.held === img) this.held = null;
  }

  async dropVignette(ms: number): Promise<void> {
    const img = this.held;
    this.held = null;
    const fades: Promise<void>[] = [this.hideCurtain(ms)];
    if (img) fades.push(tweenTo(this, { targets: img, alpha: 0, duration: ms }));
    await Promise.all(fades);
    destroy(img);
  }

  pulseBook(): void {
    stopTweens(this, this.bookIcon);
    this.bookIcon.setAlpha(1).setScale(1);
    this.tweens.add({ targets: this.bookIcon, scale: 1.25, yoyo: true, duration: 180 });
    this.tweens.add({ targets: this.bookIcon, alpha: 0, delay: 900, duration: 400 });
  }

  finishTransitions(): void {
    const held = this.held;
    for (const o of [held, this.curtain]) {
      if (!o) continue;
      for (const t of this.tweens.getTweensOf(o)) {
        try {
          t.complete();
        } catch {
          // already done
        }
      }
    }
    // complete() stops a tween where it stands; the curtain goes where its fade was heading
    // (a skipped unengrave from the dark curtain must not leave the world hidden).
    this.curtain.setAlpha(this.curtainGoal);
  }

  reset(): void {
    this.overlays.clearAll();
    this.spread.close(false).catch(() => undefined);
    destroy(this.held);
    this.held = null;
    stopTweens(this, this.curtain);
    this.curtainGoal = 0;
    this.curtain.setAlpha(0);
    this.bookIcon.setAlpha(0);
  }
}
