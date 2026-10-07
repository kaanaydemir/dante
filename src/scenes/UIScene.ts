/**
 * The UI layer over the world (native 1280x720): HUD, narration strips,
 * dialogue and verse bubbles, the choice margin, cards, toasts, prompts and
 * screen effects. The presenter (src/ui/presenter.ts) drives it; the scene
 * itself only keeps the HUD in step with the state.
 *
 * Owner: team C (presentation). Keep the class name and scene key.
 */

import * as Phaser from 'phaser';
import { services } from '../app/services';
import type { Unsubscribe } from '../runtime/contracts';
import { BOOK_ICON, Hud } from '../ui/components/Hud';
import { OverlaySet } from '../ui/components/OverlaySet';
import { ScreenFx } from '../ui/components/ScreenFx';
import { fearIntensity } from '../ui/models/hud';
import { now } from '../ui/phaser/helpers';
import type { UiSceneApi } from '../ui/sceneApi';
import { SceneKeys } from './keys';

export class UIScene extends Phaser.Scene implements UiSceneApi {
  uiReady = false;
  hud!: Hud;
  fx!: ScreenFx;
  overlays!: OverlaySet;
  private dirty = true;
  private lastResolve = 10;
  private lastDrop = -1e9;
  private fear = 0;
  private cantoLabel = { location: '', label: '' };
  private offs: Unsubscribe[] = [];

  constructor() {
    super({ key: SceneKeys.UI });
  }

  create(): void {
    this.uiReady = false;
    const s = services();
    this.fx = new ScreenFx(this);
    this.hud = new Hud(this);
    this.overlays = new OverlaySet(this, {
      depthOffset: 0,
      bookTarget: () => ({ x: BOOK_ICON.x, y: BOOK_ICON.y }),
      onBookLand: () => this.hud.pulseBook(),
    });
    this.lastResolve = s.store.state.resolve;
    this.hud.update(s.store.state);
    this.offs = [
      s.bus.on('resources:changed', (r) => {
        if (r.resolve < this.lastResolve - 1e-6) this.lastDrop = now();
        this.lastResolve = r.resolve;
        this.dirty = true;
      }),
      s.bus.on('state:changed', () => {
        this.dirty = true;
      }),
      s.bus.on('state:restored', () => {
        this.dirty = true;
      }),
      s.bus.on('settings:changed', () => this.rebuildHud()),
      s.bus.on('player:faint', () => this.fx.setFear(1)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.offs) off();
      this.offs = [];
      this.uiReady = false;
    });
    this.uiReady = true;
  }

  setCanto(location: string, label: string): void {
    this.cantoLabel = { location, label };
    this.hud.setCanto(location, label);
  }

  private rebuildHud(): void {
    const mode = this.hud.currentMode;
    const hint = this.hud.hintShown;
    this.hud.destroy();
    this.hud = new Hud(this);
    this.hud.setCanto(this.cantoLabel.location, this.cantoLabel.label);
    if (mode) this.hud.setMode(mode);
    this.hud.setHint(hint);
    this.dirty = true;
  }

  override update(): void {
    if (this.dirty) {
      this.dirty = false;
      try {
        this.hud.update(services().store.state);
      } catch {
        // never throw from update
      }
    }
    const falling = now() - this.lastDrop < 1000;
    const f = fearIntensity(this.lastResolve, falling);
    if (Math.abs(f - this.fear) > 0.04) {
      this.fear = f;
      this.fx.setFear(f);
    }
  }
}
