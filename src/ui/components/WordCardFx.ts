/**
 * Word cards (bible §1.3.5, §3.4.2): a gathered word becomes a small card —
 * name, rhyme family, category, its origin line with citation — and flies
 * into the Book. Sealed words get a wax seal, unsealed ones break it, a shed
 * burden falls away. Memories get a card of their own.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, TIMINGS } from '../../config';
import type { MemoryGain, WordChange } from '../../runtime/contracts';
import { iconTexture, panelTexture } from '../art/textures';
import { sfx, uiContext } from '../context';
import { CATEGORY_COPY, CHANGE_COPY } from '../models/copy';
import { addText, delay, destroy, measurer, tweenTo } from '../phaser/helpers';
import { wrapText } from '../text';
import { lineHeight, textStyle } from '../theme';

const CARD_W = 460;
const PAD = 30;

export interface CardRun {
  /** Resolves when the card has landed in the Book (or fallen away). */
  readonly done: Promise<void>;
  /** Hurry: skip the reading hold and fly now. */
  hurry(): void;
  /** Finish at once (autoplay / cancel). */
  finish(): void;
}

export class WordCardFx {
  private active: { root: Phaser.GameObjects.Container; finish: () => void } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Where cards fly to: the Book icon. */
    private readonly target: () => { x: number; y: number },
    private readonly onLand: () => void,
    private readonly depth: number = DEPTH.card + 20,
  ) {}

  get busy(): boolean {
    return this.active !== null;
  }

  present(change: WordChange, from: { x: number; y: number } | null): CardRun {
    this.finishActive();
    const theme = uiContext().theme();
    const c = theme.colors;
    const x = theme.extra;
    const def = change.def;
    const burden = def?.role === 'burden';
    const sealed = change.change === 'sealed';
    const shed = change.change === 'shed';
    const nameColor = burden ? x.burden : sealed ? x.dim : x.glow;
    const kicker = CHANGE_COPY[change.change];
    const family = def ? (def.role === 'closer' ? 'closes a verse' : def.role === 'burden' ? 'burden' : `rhymes in ${def.family ?? '—'}`) : '';
    const category = def ? `${def.category} · ${CATEGORY_COPY[def.category]}` : '';
    const originStyle = textStyle(theme, 'citation', { italic: true, color: c.verseText });
    const inner = CARD_W - PAD * 2;
    const originLines = def ? wrapText(def.origin.text, inner, measurer(originStyle)) : [];
    const descStyle = textStyle(theme, 'citation', { color: x.cardText });
    const descLines = def ? wrapText(def.description, inner, measurer(descStyle)) : [];
    const clh = lineHeight(theme.size('citation'));
    const h = PAD + clh + theme.size('title') * 0.8 + 16 + clh * 2 + 12 + originLines.length * clh + clh + 10 + descLines.length * clh + PAD;
    const panel = panelTexture(this.scene, 'card', CARD_W, h, theme);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 30;
    const root = this.scene.add.container(cx, cy).setDepth(this.depth);
    const bg = this.scene.add.image(0, 0, panel.key);
    root.add(bg);
    let y = -panel.h / 2 + PAD - 4;
    const left = -panel.w / 2 + PAD;
    root.add(addText(this.scene, left, y, kicker.toUpperCase(), textStyle(theme, 'citation', { color: x.verseSoft, letterSpacing: 2 })));
    y += clh;
    const nameText = addText(this.scene, 0, y, change.word, textStyle(theme, 'title', { px: Math.round(theme.size('title') * 0.8), color: nameColor, shadow: true }));
    nameText.setOrigin(0.5, 0);
    root.add(nameText);
    y += theme.size('title') * 0.8 + 16;
    if (family) root.add(addText(this.scene, 0, y, family, textStyle(theme, 'citation', { italic: true, color: x.verseSoft })).setOrigin(0.5, 0));
    y += clh;
    if (category) root.add(addText(this.scene, 0, y, category, textStyle(theme, 'citation', { color: c.goldBright })).setOrigin(0.5, 0));
    y += clh + 12;
    if (originLines.length > 0) {
      root.add(addText(this.scene, left, y, originLines.join('\n'), { ...originStyle, lineSpacing: clh - theme.size('citation') }));
      y += originLines.length * clh;
      root.add(addText(this.scene, panel.w / 2 - PAD, y, def?.origin.citation ?? '', textStyle(theme, 'citation', { italic: true, color: x.verseSoft })).setOrigin(1, 0));
      y += clh + 10;
    }
    if (descLines.length > 0) root.add(addText(this.scene, left, y, descLines.join('\n'), { ...descStyle, lineSpacing: clh - theme.size('citation') }));
    let seal: Phaser.GameObjects.Image | null = null;
    if (sealed || change.change === 'unsealed') {
      seal = this.scene.add.image(panel.w / 2 - PAD - 6, -panel.h / 2 + PAD + 22, iconTexture(this.scene, 'seal', x.seal, c.ink, 56));
      root.add(seal);
    }
    return this.run(root, {
      from,
      hold: Math.min(4200, 1700 + (def?.origin.text.length ?? 20) * 22),
      before: async () => {
        if (seal && sealed) {
          seal.setScale(2.4).setAlpha(0);
          await tweenTo(this.scene, { targets: seal, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeIn' });
          this.scene.cameras.main.shake(120, 0.002);
        } else if (seal) {
          await delay(this.scene, 300);
          await tweenTo(this.scene, { targets: seal, scale: 1.6, alpha: 0, angle: 25, duration: 420, ease: 'Quad.easeOut' });
        }
      },
      leave: shed ? 'fall' : 'fly',
      sound: shed ? null : 'word',
    });
  }

  presentMemory(gain: MemoryGain): CardRun {
    this.finishActive();
    const theme = uiContext().theme();
    const c = theme.colors;
    const x = theme.extra;
    const entry = gain.entry;
    const lines = entry?.quote?.lines.map((l) => (l.kind === 'verse' ? l.text : '…')) ?? [];
    const verseStyle = textStyle(theme, 'citation', { italic: true, color: c.verseText });
    const inner = CARD_W - PAD * 2;
    const wrapped = lines.flatMap((l) => wrapText(l, inner, measurer(verseStyle)));
    const clh = lineHeight(theme.size('citation'));
    const h = PAD + clh + theme.size('heading') + 18 + wrapped.length * clh + clh + 20 + PAD;
    const panel = panelTexture(this.scene, 'card', CARD_W, h, theme);
    const root = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30).setDepth(this.depth);
    root.add(this.scene.add.image(0, 0, panel.key));
    let y = -panel.h / 2 + PAD - 4;
    const left = -panel.w / 2 + PAD;
    root.add(addText(this.scene, left, y, 'REMEMBERED', textStyle(theme, 'citation', { color: x.verseSoft, letterSpacing: 2 })));
    root.add(this.scene.add.image(panel.w / 2 - PAD - 10, y + 10, iconTexture(this.scene, 'candle', c.goldBright, c.ink, 36)));
    y += clh;
    root.add(addText(this.scene, 0, y, entry?.name ?? gain.id, textStyle(theme, 'heading', { color: c.goldBright })).setOrigin(0.5, 0));
    y += theme.size('heading') + 18;
    if (wrapped.length > 0) {
      root.add(addText(this.scene, left, y, wrapped.join('\n'), { ...verseStyle, lineSpacing: clh - theme.size('citation') }));
      y += wrapped.length * clh;
      const cite = entry?.quote?.citation?.text ?? entry?.quote?.citationRaw ?? '';
      root.add(addText(this.scene, panel.w / 2 - PAD, y, cite, textStyle(theme, 'citation', { italic: true, color: x.verseSoft })).setOrigin(1, 0));
    }
    return this.run(root, { from: null, hold: 3200, leave: 'fly', sound: 'unlock' });
  }

  private run(
    root: Phaser.GameObjects.Container,
    o: { from: { x: number; y: number } | null; hold: number; before?: () => Promise<void>; leave: 'fly' | 'fall'; sound: 'word' | 'unlock' | null },
  ): CardRun {
    let finished = false;
    let hurry: (() => void) | null = null;
    let resolveDone: () => void = () => undefined;
    const done = new Promise<void>((r) => {
      resolveDone = r;
    });
    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (this.active?.root === root) this.active = null;
      destroy(root);
      if (o.leave === 'fly') this.onLand();
      resolveDone();
    };
    this.active = { root, finish };
    const cx = root.x;
    const cy = root.y;
    if (o.from) {
      root.setPosition(o.from.x, o.from.y).setScale(0.2).setAlpha(0.2);
    } else {
      root.setScale(0.85).setAlpha(0);
    }
    const play = async (): Promise<void> => {
      if (o.sound) sfx(o.sound);
      await tweenTo(this.scene, { targets: root, x: cx, y: cy, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
      if (finished) return;
      if (o.before) await o.before();
      if (finished) return;
      await new Promise<void>((resolve) => {
        hurry = resolve;
        void delay(this.scene, o.hold).then(resolve);
      });
      hurry = null;
      if (finished) return;
      if (o.leave === 'fall') {
        await tweenTo(this.scene, { targets: root, y: cy + 120, alpha: 0, angle: 8, duration: 900, ease: 'Quad.easeIn' });
      } else {
        const t = this.target();
        sfx('card');
        await tweenTo(this.scene, { targets: root, x: t.x, y: t.y, scale: 0.08, alpha: 0.6, duration: TIMINGS.wordFlyMs, ease: 'Cubic.easeIn' });
      }
      finish();
    };
    void play().catch(() => finish());
    return {
      done,
      hurry: () => hurry?.(),
      finish,
    };
  }

  private finishActive(): void {
    const a = this.active;
    this.active = null;
    a?.finish();
  }

  clear(): void {
    this.finishActive();
  }
}
