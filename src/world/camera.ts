/**
 * The world camera (zoom 2: a 640 x 360 view of world pixels): smooth follow,
 * the world half of the CAM verbs (cut, pan, zoom-in / zoom-out, shake, hold,
 * follow, engrave / unengrave), fades for faints, and the Doré engraving
 * effect (desaturate + hatch, or colour seeping back in).
 *
 * Owner: team D (world).
 */

import * as Phaser from 'phaser';
import { DEPTH, TIMINGS, WORLD_ZOOM, type CantoPalette } from '../config';
import type { ActorHandle, CamCommand, WorldCameraApi } from '../runtime/contracts';
import { camIntent, zoomFor } from './camcues';

const FOLLOW_LERP = 0.1;

export interface CameraTargets {
  player(): ActorHandle | null;
  virgil(): ActorHandle | null;
  npc(speaker: string): ActorHandle | null;
  /** A point ahead of the player along the level's way (pans "toward what is coming"). */
  ahead(): { x: number; y: number } | null;
  screenShake(): boolean;
}

export class WorldCamera implements WorldCameraApi {
  readonly cam: Phaser.Cameras.Scene2D.Camera;
  private followTarget: ActorHandle | null = null;
  private baseZoom = WORLD_ZOOM;
  /** CAM verbs changed the view during the current beat (restored at its end). */
  private dirty = false;
  private engraveAmount = 0;
  private engraveTween: Phaser.Tweens.Tween | null = null;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private hatch: Phaser.GameObjects.TileSprite | null = null;
  private paper: Phaser.GameObjects.Rectangle | null = null;
  private readonly settle = new Set<() => void>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly targets: CameraTargets,
  ) {
    this.cam = scene.cameras.main;
    this.cam.setZoom(WORLD_ZOOM);
    this.cam.setRoundPixels(true);
  }

  /** Palette, bounds and the engraving overlays for a new level. */
  configure(palette: CantoPalette, width: number, height: number): void {
    this.cam.setBackgroundColor(palette.sky);
    this.cam.setBounds(0, 0, Math.max(width, this.viewW()), Math.max(height, this.viewH()));
    this.hatch?.destroy();
    this.paper?.destroy();
    this.hatch = this.scene.add
      .tileSprite(0, 0, this.viewW() + 32, this.viewH() + 32, 'fx-hatch')
      .setOrigin(0, 0)
      .setDepth(DEPTH.worldOverlay + 2)
      .setTint(palette.ink)
      .setAlpha(0);
    this.paper = this.scene.add
      .rectangle(0, 0, this.viewW() + 32, this.viewH() + 32, palette.paper, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH.worldOverlay + 1)
      .setAlpha(0);
    this.paper.setBlendMode(Phaser.BlendModes.MULTIPLY);
    if (!this.colorMatrix && this.isWebGL()) {
      try {
        const fx = (this.cam as unknown as { postFX?: Phaser.GameObjects.Components.FX }).postFX;
        this.colorMatrix = fx?.addColorMatrix() ?? null;
        if (this.colorMatrix) {
          this.colorMatrix.grayscale(1);
          this.colorMatrix.alpha = 0;
        }
      } catch {
        this.colorMatrix = null;
      }
    }
    this.applyEngrave(this.engraveAmount);
  }

  private isWebGL(): boolean {
    return this.scene.game.renderer.type === Phaser.WEBGL;
  }

  viewW(): number {
    return this.cam.width / this.cam.zoom;
  }

  viewH(): number {
    return this.cam.height / this.cam.zoom;
  }

  /** Keep overlays glued to the view. Called every frame. */
  update(): void {
    const v = this.cam.worldView;
    if (this.hatch) {
      this.hatch.setPosition(Math.floor(v.x) - 16, Math.floor(v.y) - 16);
      this.hatch.setSize(v.width + 32, v.height + 32);
      this.hatch.tilePositionX = Math.floor(v.x);
      this.hatch.tilePositionY = Math.floor(v.y);
    }
    if (this.paper) {
      this.paper.setPosition(Math.floor(v.x) - 16, Math.floor(v.y) - 16);
      this.paper.setSize(v.width + 32, v.height + 32);
    }
  }

  // -------------------------------------------------------------------------
  // WorldCameraApi
  // -------------------------------------------------------------------------

  follow(target: ActorHandle | null): void {
    this.followTarget = target;
    if (target) this.cam.startFollow(target.sprite, true, FOLLOW_LERP, FOLLOW_LERP, 0, 12);
    else this.cam.stopFollow();
  }

  panTo(x: number, y: number, ms = TIMINGS.camPanMs): Promise<void> {
    this.cam.stopFollow();
    return this.track((done) => {
      this.cam.pan(x, y, Math.max(1, ms), 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
        if (p >= 1) done();
      });
    }, ms + 400);
  }

  zoomTo(zoom: number, ms = TIMINGS.camZoomMs): Promise<void> {
    return this.track((done) => {
      this.cam.zoomTo(zoom, Math.max(1, ms), 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
        if (p >= 1) done();
      });
    }, ms + 400);
  }

  shake(ms = TIMINGS.camShakeMs, intensity = 0.006): Promise<void> {
    if (!this.targets.screenShake()) return Promise.resolve();
    return this.track((done) => {
      this.cam.shake(ms, intensity, true, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
        if (p >= 1) done();
      });
    }, ms + 400);
  }

  fade(to: 'black' | 'white' | 'red' | 'clear', ms = TIMINGS.fadeMs): Promise<void> {
    return this.track((done) => {
      if (to === 'clear') {
        this.cam.fadeIn(Math.max(1, ms), 0, 0, 0, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
          if (p >= 1) done();
        });
        return;
      }
      const [r, g, b] = to === 'white' ? [255, 255, 255] : to === 'red' ? [150, 20, 16] : [0, 0, 0];
      this.cam.fadeOut(Math.max(1, ms), r, g, b, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
        if (p >= 1) done();
      });
    }, ms + 400);
  }

  // -------------------------------------------------------------------------
  // CAM verbs (world half)
  // -------------------------------------------------------------------------

  async command(cmd: CamCommand, autoplay: boolean): Promise<void> {
    const intent = camIntent(cmd.verb, cmd.text);
    const quick = autoplay ? 0.15 : 1;
    switch (intent.kind) {
      case 'none':
        return;
      case 'snap': {
        const p = this.targets.player();
        if (p) this.cam.centerOn(p.x, p.y - 16);
        this.follow(p);
        return;
      }
      case 'pan': {
        this.dirty = true;
        const t = intent.target;
        let point: { x: number; y: number } | null = null;
        if (t.kind === 'player') {
          const p = this.targets.player();
          if (p) point = { x: p.x, y: p.y - 16 };
        } else if (t.kind === 'speaker') {
          const a = t.speaker === 'VIRGIL' ? this.targets.virgil() : this.targets.npc(t.speaker);
          if (a && a.sprite.visible) point = { x: a.x, y: a.y - 16 };
        }
        point ??= this.targets.ahead();
        if (!point) return;
        await this.panTo(point.x, point.y, TIMINGS.camPanMs * quick);
        if (t.kind === 'player') this.follow(this.targets.player());
        return;
      }
      case 'zoom': {
        this.dirty = true;
        await this.zoomTo(zoomFor(intent.direction, this.cam.zoom, this.baseZoom), TIMINGS.camZoomMs * quick);
        return;
      }
      case 'shake':
        await this.shake(TIMINGS.camShakeMs * (autoplay ? 0.3 : 1));
        return;
      case 'hold': {
        this.dirty = true;
        this.cam.stopFollow();
        await this.wait(TIMINGS.camHoldMs * quick);
        this.follow(this.targets.player());
        return;
      }
      case 'follow': {
        this.dirty = true;
        const t = intent.target;
        const a = t.kind === 'speaker' ? (t.speaker === 'VIRGIL' ? this.targets.virgil() : this.targets.npc(t.speaker)) : this.targets.player();
        this.follow(a && a.sprite.visible ? a : this.targets.player());
        return;
      }
      case 'engrave':
        await this.engrave(intent.on, (intent.on ? TIMINGS.engraveMs : TIMINGS.unengraveMs) * quick);
        return;
    }
  }

  /** End of a beat: give the view back to the player at the base zoom. */
  restore(): void {
    if (!this.dirty) return;
    this.dirty = false;
    if (Math.abs(this.cam.zoom - this.baseZoom) > 0.001) this.cam.zoomTo(this.baseZoom, 500, 'Sine.easeInOut', true);
    this.follow(this.targets.player());
  }

  get engraved(): boolean {
    return this.engraveAmount > 0.5;
  }

  /** Desaturate and hatch the scene (on), or let colour seep back (off). */
  engrave(on: boolean, ms: number): Promise<void> {
    const target = on ? 1 : 0;
    this.engraveTween?.stop();
    this.engraveTween = null;
    if (ms <= 1 || Math.abs(this.engraveAmount - target) < 0.001) {
      this.applyEngrave(target);
      return Promise.resolve();
    }
    return this.track((done) => {
      const proxy = { v: this.engraveAmount };
      this.engraveTween = this.scene.tweens.add({
        targets: proxy,
        v: target,
        duration: ms,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.applyEngrave(proxy.v),
        onComplete: () => {
          this.applyEngrave(target);
          done();
        },
        onStop: () => done(),
      });
    }, ms + 500);
  }

  /** Set the engraving instantly (a canto that opens with `unengrave` starts engraved). */
  setEngraved(on: boolean): void {
    this.engraveTween?.stop();
    this.engraveTween = null;
    this.applyEngrave(on ? 1 : 0);
  }

  private applyEngrave(v: number): void {
    this.engraveAmount = v;
    if (this.colorMatrix) this.colorMatrix.alpha = v;
    this.hatch?.setAlpha(v * 0.32);
    // Without WebGL there is no colour matrix: a paper wash stands in for the desaturation.
    this.paper?.setAlpha(v * (this.colorMatrix ? 0.55 : 0.75));
  }

  /** Abort every running camera promise (they resolve) and return to following the player. */
  cancel(): void {
    for (const s of [...this.settle]) s();
    this.settle.clear();
    try {
      this.cam.panEffect.reset();
      this.cam.zoomEffect.reset();
      this.cam.shakeEffect.reset();
    } catch {
      // ignore
    }
    this.engraveTween?.stop();
    this.engraveTween = null;
    this.dirty = true;
    this.restore();
  }

  /** Clear fades (after a respawn, or when a canto loads). */
  clearFade(): void {
    try {
      this.cam.resetFX();
    } catch {
      // ignore
    }
  }

  destroy(): void {
    this.cancel();
    this.hatch?.destroy();
    this.paper?.destroy();
    this.hatch = null;
    this.paper = null;
    if (this.colorMatrix) {
      try {
        (this.cam as unknown as { postFX?: Phaser.GameObjects.Components.FX }).postFX?.remove(this.colorMatrix);
      } catch {
        // ignore
      }
      this.colorMatrix = null;
    }
  }

  get following(): ActorHandle | null {
    return this.followTarget;
  }

  private wait(ms: number): Promise<void> {
    return this.track((done) => {
      this.scene.time.delayedCall(Math.max(0, ms), done);
    }, ms + 400);
  }

  /**
   * Runs an effect and resolves when it reports done, when cancelled, or after
   * a safety timeout (in real time, so a stopped scene never hangs the story).
   */
  private track(start: (done: () => void) => void, safetyMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let finished = false;
      const done = (): void => {
        if (finished) return;
        finished = true;
        this.settle.delete(done);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, Math.max(50, safetyMs) * 4);
      this.settle.add(done);
      try {
        start(done);
      } catch {
        done();
      }
    });
  }
}
