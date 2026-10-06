/**
 * The Book: the pause menu and reading mode (bible §1.5) with the tabs
 * Cantos, Verses, Words, Souls · Places · Lore, Remembrance, Map, Settings,
 * as ribbons over an open book. Opening it pauses the World and UI scenes
 * (src/ui/bookControl.ts); closing resumes them.
 *
 * Owner: team C (presentation). Keep the class name and scene key.
 */

import * as Phaser from 'phaser';
import { services } from '../app/services';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { BookTab } from '../runtime/contracts';
import { panelTexture } from '../ui/art/textures';
import { CantosTab, VersesTab } from '../ui/book/CantosTab';
import { CodexTab, MapTab, RemembranceTab } from '../ui/book/CodexTab';
import { SettingsTab } from '../ui/book/SettingsTab';
import type { BookCtx, BookTabView } from '../ui/book/types';
import { WordsTab } from '../ui/book/WordsTab';
import { closeBook } from '../ui/bookControl';
import { PAGE } from '../ui/components/BookSpread';
import { sfx, uiContext } from '../ui/context';
import type { UiAction } from '../ui/inputMap';
import { initialTab, visibleTabs, type TabDef } from '../ui/models/book';
import { addText } from '../ui/phaser/helpers';
import { uiRouter, type ActionMeta, type InputHandler } from '../ui/router';
import type { BookMenuOpenData } from '../ui/sceneApi';
import { cssColor, textStyle } from '../ui/theme';
import { SceneKeys } from './keys';

/** The last tab the reader looked at (kept across openings). */
let lastTab: BookTab | null = null;

export class BookMenuScene extends Phaser.Scene implements InputHandler {
  uiReady = false;
  readonly padBook = true;
  private tabs: TabDef[] = [];
  private tab: BookTab = 'settings';
  private view: BookTabView | null = null;
  private content!: Phaser.GameObjects.Container;
  private ribbons!: Phaser.GameObjects.Container;
  private foot!: Phaser.GameObjects.Container;
  private fromTitle = false;
  private popRouter: (() => void) | null = null;
  private settingsRow = 0;

  constructor() {
    super({ key: SceneKeys.BookMenu });
  }

  create(data: BookMenuOpenData): void {
    this.uiReady = false;
    this.fromTitle = data?.fromTitle ?? false;
    const s = services();
    const theme = uiContext().theme();
    // Dim what is behind, then the open book.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, theme.colors.shadeAlpha + 0.15).setOrigin(0, 0).setDepth(DEPTH.book - 10);
    const panel = panelTexture(this, 'spread', 1240, 690, theme);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 6, panel.key).setDepth(DEPTH.book);
    this.content = this.add.container(0, 0).setDepth(DEPTH.book + 10);
    this.ribbons = this.add.container(0, 0).setDepth(DEPTH.book + 20);
    this.foot = this.add.container(0, 0).setDepth(DEPTH.book + 20);
    const unlocks = s.store.state.unlocks;
    this.tabs = this.fromTitle ? visibleTabs([]) : visibleTabs(unlocks);
    const wanted = data?.tab ?? this.preferredTab();
    this.tab = this.fromTitle ? 'settings' : initialTab(unlocks, wanted);
    this.drawRibbons();
    this.openTab(this.tab);
    this.popRouter = uiRouter()?.push(this) ?? null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.popRouter?.();
      this.popRouter = null;
      this.view?.destroy();
      this.view = null;
      this.uiReady = false;
    });
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 180 });
    this.uiReady = true;
  }

  /** Composing just opened and nothing is carried yet: the Words page; else the last page read. */
  private preferredTab(): BookTab | null {
    const st = services().store.state;
    if ((st.unlocks.includes('compose') || st.unlocks.includes('verse')) && !st.equippedVerse) return 'words';
    return lastTab;
  }

  private ctx(): BookCtx {
    const s = services();
    return {
      scene: this,
      root: this.content,
      store: s.store,
      story: s.story,
      bus: s.bus,
      session: s.session,
      left: { x0: PAGE.left.x0, x1: PAGE.left.x1, y0: PAGE.left.y0 + 26, y1: PAGE.left.y1 - 4 },
      right: { x0: PAGE.right.x0, x1: PAGE.right.x1, y0: PAGE.right.y0 + 26, y1: PAGE.right.y1 - 4 },
      inGame: !this.fromTitle,
      rerender: () => this.rerender(),
      close: () => this.close(),
      footer: (l, r) => this.footer(l, r ?? ''),
    };
  }

  private drawRibbons(): void {
    this.ribbons.removeAll(true);
    const theme = uiContext().theme();
    const c = theme.colors;
    const style = textStyle(theme, 'ui', { color: c.paper });
    const widths = this.tabs.map((t) => this.add.text(0, 0, t.label, style as Phaser.Types.GameObjects.Text.TextStyle));
    const pads = 26;
    const total = widths.reduce((a, t) => a + t.width + pads, 0) + (this.tabs.length - 1) * 6;
    let x = GAME_WIDTH / 2 - total / 2;
    this.tabs.forEach((tab, i) => {
      const t = widths[i] as Phaser.GameObjects.Text;
      const w = t.width + pads;
      const on = tab.id === this.tab;
      const h = on ? 50 : 40;
      const g = this.add.graphics();
      g.fillStyle(on ? c.rubric : theme.extra.leatherDark, on ? 1 : 0.92);
      g.fillRect(x, 0, w, h);
      // swallowtail
      g.fillTriangle(x, h, x + w / 2, h - 8, x + w, h);
      g.fillStyle(0x000000, 0);
      g.lineStyle(1, c.gold, on ? 0.9 : 0.4);
      g.strokeRect(x + 0.5, -1, w - 1, h - 6);
      t.setPosition(x + w / 2, h / 2 - 6).setOrigin(0.5, 0.5);
      t.setColor(cssColor(on ? c.paper : c.paperShade));
      const zone = this.add.zone(x, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.switchTo(tab.id));
      this.ribbons.add([g, t, zone]);
      x += w + 6;
    });
    // Close mark (top right of the book)
    const close = addText(this, GAME_WIDTH - 40, 22, '✕', textStyle(theme, 'ui', { color: c.paperShade }));
    close.setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.close());
    this.ribbons.add(close);
  }

  private footer(left: string, right: string): void {
    this.foot.removeAll(true);
    const theme = uiContext().theme();
    const style = textStyle(theme, 'citation', { italic: true, color: theme.extra.inkFaint });
    if (left) this.foot.add(addText(this, PAGE.left.x0, PAGE.left.y1 + 12, left, style));
    if (right) this.foot.add(addText(this, PAGE.right.x1, PAGE.right.y1 + 12, right, style).setOrigin(1, 0));
  }

  private openTab(id: BookTab): void {
    if (this.view && this.tab === 'settings') this.settingsRow = (this.view as SettingsTab).selectedIndex ?? 0;
    this.view?.destroy();
    this.view = null;
    this.content.removeAll(true);
    this.tab = id;
    if (!this.fromTitle) lastTab = id;
    const ctx = this.ctx();
    try {
      switch (id) {
        case 'cantos':
          this.view = new CantosTab(ctx);
          break;
        case 'verses':
          this.view = new VersesTab(ctx);
          break;
        case 'words':
          this.view = new WordsTab(ctx);
          break;
        case 'codex':
          this.view = new CodexTab(ctx);
          break;
        case 'remembrance':
          this.view = new RemembranceTab(ctx);
          break;
        case 'map':
          this.view = new MapTab(ctx);
          break;
        case 'settings':
          this.view = new SettingsTab(ctx, this.settingsRow);
          break;
      }
    } catch (err) {
      services().bus.emit('debug:log', { level: 'error', message: `Book tab ${id} failed: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  private switchTo(id: BookTab): void {
    if (id === this.tab || !this.tabs.some((t) => t.id === id)) return;
    sfx('page');
    this.openTab(id);
    this.drawRibbons();
  }

  private cycle(dir: 1 | -1): void {
    const i = this.tabs.findIndex((t) => t.id === this.tab);
    const next = this.tabs[(i + dir + this.tabs.length) % this.tabs.length];
    if (next) this.switchTo(next.id);
  }

  private rerender(): void {
    // Size or contrast changed: rebuild everything with the new theme.
    this.drawRibbons();
    this.openTab(this.tab);
  }

  private close(): void {
    closeBook(this.game, services().bus);
  }

  onAction(action: UiAction, meta: ActionMeta): boolean {
    if (action === 'book' || (action === 'back' && meta.code !== 'Backspace')) {
      if (!meta.repeat) this.close();
      return true;
    }
    if (action === 'tabPrev' || action === 'tabNext') {
      this.cycle(action === 'tabPrev' ? -1 : 1);
      return true;
    }
    const view = this.view;
    if (view && view.onAction(action, meta)) return true;
    if ((action === 'left' || action === 'right') && !(view?.capturesHorizontal ?? false)) {
      this.cycle(action === 'left' ? -1 : 1);
      return true;
    }
    if (action === 'back' && meta.code === 'Backspace') {
      this.close();
      return true;
    }
    return true;
  }

  onPointer(): boolean {
    return false;
  }

  onWheel(dy: number): boolean {
    this.view?.onWheel?.(dy);
    return true;
  }
}
