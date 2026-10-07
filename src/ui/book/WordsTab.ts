/**
 * Words (bible §1.5, §3.4): the word cards (name, rhyme family, category,
 * origin line) and the tercet composer — A · B · A, a second tercet and a
 * coda once chains are open — validated by the verse module (evaluateVerse).
 * "Carry" equips the verse for J and writes it into "Your verses".
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import type { ComposedVerse, VerseEvaluation } from '../../runtime/contracts';
import { getWord } from '../../story/words';
import type { WordName } from '../../story/types';
import { VERSE_TUNING } from '../../verse/costs';
import { verseContextOf } from '../../verse/tercet';
import { iconTexture } from '../art/textures';
import { promptRow } from '../components/keycap';
import { sfx, uiContext } from '../context';
import type { UiAction } from '../inputMap';
import { ComposerModel, composerWords, headlineIssue, sameSlot, type ComposerWord, type SlotRef } from '../models/composer';
import { CATEGORY_COPY } from '../models/copy';
import { addText, measurer } from '../phaser/helpers';
import type { ActionMeta } from '../router';
import { lineHeight, textStyle } from '../theme';
import type { BookCtx, BookTabView } from './types';
import { para } from './widgets';

const COLS = 3;
const CHIP_H = 40;
const CHIP_GAP = 10;
const CHIP_ROW_GAP = 8;
const SLOT_W = 140;
const SLOT_H = 50;

interface Chip {
  readonly word: ComposerWord;
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly text: Phaser.GameObjects.Text;
}

interface SlotView {
  readonly ref: SlotRef;
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly text: Phaser.GameObjects.Text;
}

export class WordsTab implements BookTabView {
  readonly capturesHorizontal = true;
  private chips: Chip[] = [];
  private slots: SlotView[] = [];
  private index = 0;
  private focus: 'grid' | 'slots' = 'grid';
  private readonly composer: ComposerModel | null;
  private readonly detail: Phaser.GameObjects.Container;
  private readonly verdict: Phaser.GameObjects.Container;
  private flash = '';

  constructor(private readonly ctx: BookCtx) {
    const { scene, root, left, right } = ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    const state = ctx.store.state;
    root.add(addText(scene, left.x0, left.y0, 'Words', textStyle(theme, 'heading', { color: c.rubric })));
    const words = composerWords(state.words.owned, state.words.sealed);
    for (const shed of state.words.shed) if (!words.some((w) => w.name === shed)) words.push({ name: shed, use: 'burden' });
    // Grid: three chips a row, sized for the reader's text size.
    const gridTop = left.y0 + theme.size('heading') + 20;
    const chipW = Math.floor((left.x1 - left.x0 - CHIP_GAP * (COLS - 1)) / COLS);
    const chipH = Math.max(CHIP_H, lineHeight(theme.size('body'), 'ui') + 12);
    const nameStyle = textStyle(theme, 'body', {});
    const famStyle = textStyle(theme, 'citation', { italic: true, color: c.inkSoft });
    const nameW = measurer(nameStyle);
    const famW = measurer(famStyle);
    words.forEach((w, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = left.x0 + col * (chipW + CHIP_GAP);
      const y = gridTop + row * (chipH + CHIP_ROW_GAP);
      const isShed = state.words.shed.includes(w.name);
      const bg = scene.add.rectangle(x, y, chipW, chipH, theme.extra.pageShade, 0.9).setOrigin(0, 0);
      bg.setStrokeStyle(1, theme.extra.inkFaint, 0.8);
      const color = isShed ? c.inkSoft : w.use === 'burden' ? theme.extra.burden : w.use === 'sealed' ? theme.extra.dim : c.ink;
      const t = addText(scene, x + 12, y + chipH / 2, w.name, textStyle(theme, 'body', { color, italic: isShed })).setOrigin(0, 0.5);
      root.add([bg, t]);
      const def = getWord(w.name);
      // The rhyme family on the chip when it fits; the detail below always has it.
      const fam = isShed ? 'set down' : def?.family ?? (def?.role === 'closer' ? 'closer' : 'burden');
      const sealRoom = w.use === 'sealed' ? 30 : 0;
      if (nameW(w.name) + famW(fam) + 34 + sealRoom <= chipW) {
        root.add(addText(scene, x + chipW - 10, y + chipH / 2, fam, famStyle).setOrigin(1, 0.5));
      }
      if (w.use === 'sealed') root.add(scene.add.image(x + 24 + nameW(w.name) + 10, y + chipH / 2, iconTexture(scene, 'seal', theme.extra.seal, c.ink, 26)));
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.focus = 'grid';
        this.select(i);
        this.place();
      });
      this.chips.push({ word: w, bg, text: t });
    });
    const rows = Math.ceil(words.length / COLS);
    const detailTop = gridTop + rows * (chipH + CHIP_ROW_GAP) + 10;
    this.detail = scene.add.container(0, detailTop);
    root.add(this.detail);
    if (words.length === 0) para(scene, root, left.x0, gridTop, left.x1 - left.x0, 'No word has been gathered yet. Words glow in their lines; take them with E.', 'body', { italic: true, color: c.inkSoft });
    // Composer
    const unlocks = state.unlocks;
    const canCompose = unlocks.includes('compose') || unlocks.includes('verse');
    const chain = unlocks.includes('chain');
    this.composer = canCompose ? ComposerModel.from(state.equippedVerse as ComposedVerse | null, chain ? VERSE_TUNING.maxTercetsChapter1 : 1, chain) : null;
    this.verdict = scene.add.container(0, 0);
    if (this.composer) {
      root.add(addText(scene, right.x0, right.y0, 'Compose', textStyle(theme, 'heading', { color: c.rubric })));
      let y = right.y0 + theme.size('heading') + 12;
      y += para(scene, root, right.x0, y, right.x1 - right.x0, 'The first and the last word must rhyme. The middle one is the heart of the verse.', 'citation', { italic: true, color: c.inkSoft }).height + 14;
      const rowsOf: SlotRef[][] = [];
      for (const ref of this.composer.slots()) {
        if (ref.kind === 'coda') rowsOf.push([ref]);
        else (rowsOf[ref.tercet] ??= []).push(ref);
      }
      rowsOf.forEach((refs, r) => {
        const label = refs[0]?.kind === 'coda' ? 'coda' : ['I', 'II', 'III'][r] ?? '';
        root.add(addText(scene, right.x0, y + SLOT_H / 2, label, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(0, 0.5));
        refs.forEach((ref, k) => {
          const x = right.x0 + 48 + k * (SLOT_W + 22);
          const bg = scene.add.rectangle(x, y, SLOT_W, SLOT_H, 0xffffff, 0.35).setOrigin(0, 0);
          bg.setStrokeStyle(1.5, theme.extra.inkFaint, 0.9);
          const t = addText(scene, x + SLOT_W / 2, y + SLOT_H / 2, '', textStyle(theme, 'body', { color: c.ink })).setOrigin(0.5, 0.5);
          if (k > 0) root.add(addText(scene, x - 11, y + SLOT_H / 2, '·', textStyle(theme, 'body', { color: c.inkSoft })).setOrigin(0.5, 0.5));
          if (ref.kind === 'tercet') root.add(addText(scene, x + SLOT_W / 2, y + SLOT_H + 2, ref.slot === 1 ? 'B' : 'A', textStyle(theme, 'citation', { color: theme.extra.inkFaint })).setOrigin(0.5, 0));
          bg.setInteractive({ useHandCursor: true });
          bg.on('pointerdown', () => {
            this.focus = 'slots';
            if (this.composer) {
              if (sameSlot(this.composer.focus, ref) && this.composer.get(ref)) this.composer.clear(ref);
              this.composer.focus = ref;
            }
            this.render();
          });
          root.add([bg, t]);
          this.slots.push({ ref, bg, text: t });
        });
        y += SLOT_H + 30;
      });
      this.verdict.setY(y + 4);
      root.add(this.verdict);
    } else {
      root.add(this.verdict);
    }
    this.select(0);
    ctx.footer(this.composer ? 'Enter place · ◂ ▴ ▾ ▸ move · J carry' : '◂ ▴ ▾ ▸ choose', 'Backspace take back · Esc close');
  }

  private select(i: number): void {
    if (this.chips.length === 0) {
      this.render();
      return;
    }
    this.index = Math.max(0, Math.min(this.chips.length - 1, i));
    this.render();
  }

  private render(): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    this.chips.forEach((chip, k) => {
      const on = this.focus === 'grid' && k === this.index;
      chip.bg.setStrokeStyle(on ? 2.5 : 1, on ? c.rubric : theme.extra.inkFaint, 1);
      const fits = this.composer && chip.word.use === 'usable' ? this.composer.fits(chip.word.name) : false;
      chip.bg.setFillStyle(fits ? 0xf3e2b0 : theme.extra.pageShade, 0.9);
    });
    for (const s of this.slots) {
      const word = this.composer?.get(s.ref) ?? null;
      s.text.setText(word ?? '');
      const focused = this.composer ? sameSlot(this.composer.focus, s.ref) : false;
      s.bg.setStrokeStyle(focused ? 2.5 : 1.5, focused ? (this.focus === 'slots' ? c.rubric : theme.extra.rule) : theme.extra.inkFaint, 1);
    }
    this.drawDetail();
    this.drawVerdict();
  }

  private drawDetail(): void {
    const { scene, left } = this.ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.detail.removeAll(true);
    const chip = this.chips[this.index];
    if (!chip) return;
    const def = getWord(chip.word.name);
    if (!def) return;
    const w = left.x1 - left.x0;
    let y = 0;
    const fam = def.role === 'closer' ? 'closes a verse' : def.family ? `rhymes in ${def.family}` : '';
    const cat = def.category === 'Burden' ? 'A burden' : `${def.category}: ${CATEGORY_COPY[def.category]}${fam ? ` · ${fam}` : ''}`;
    y += para(scene, this.detail, left.x0, y, w, cat, 'citation', { color: c.rubric }).height + 4;
    y += para(scene, this.detail, left.x0, y, w, def.origin.text, 'citation', { italic: true, color: c.ink }).height;
    this.detail.add(addText(scene, left.x1, y, def.origin.citation, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
    y += theme.size('citation') + 8;
    const note = chip.word.use === 'sealed' ? `${def.description} Sealed: it cannot be placed.` : def.description;
    // The note only when the page has room for it (large text, many words).
    if (this.detail.y + y + lineHeight(theme.size('citation')) <= left.y1) {
      para(scene, this.detail, left.x0, y, w, note, 'citation', { color: c.inkSoft });
    }
  }

  private evaluation(): VerseEvaluation | null {
    if (!this.composer) return null;
    return this.composer.evaluate(verseContextOf(this.ctx.store.state));
  }

  private drawVerdict(): void {
    const { scene, right } = this.ctx;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.verdict.removeAll(true);
    const w = right.x1 - right.x0;
    let y = 0;
    if (!this.composer) {
      // No composing yet: the selected word, large.
      const chip = this.chips[this.index];
      const def = chip ? getWord(chip.word.name) : null;
      y = right.y0;
      if (def) {
        this.verdict.add(addText(scene, (right.x0 + right.x1) / 2, y + 40, def.name, textStyle(theme, 'title', { color: c.rubric })).setOrigin(0.5, 0));
        y += 40 + theme.size('title') + 20;
        y += para(scene, this.verdict, right.x0, y, w, def.origin.text, 'verse', { color: c.ink }).height + 6;
        this.verdict.add(addText(scene, right.x1, y, def.origin.citation, textStyle(theme, 'citation', { italic: true, color: c.inkSoft })).setOrigin(1, 0));
        y += 40;
      }
      para(scene, this.verdict, right.x0, y, w, 'Three words will make a verse. The journey will show how.', 'body', { italic: true, color: c.inkSoft });
      return;
    }
    const ev = this.evaluation();
    if (!ev) return;
    if (ev.valid) {
      const t = ev.tercets.map((x) => `${x.category}${x.strength > 1 ? ` ${'✦'.repeat(x.strength - 1)}` : ''}`).join(' → ');
      const coda = ev.coda ? `, closing in ${ev.coda.category}` : '';
      y += para(scene, this.verdict, right.x0, y, w, `A verse of ${t}${coda}.`, 'body', { color: c.rubric }).height + 2;
      y += para(scene, this.verdict, right.x0, y, w, `It costs ${ev.graceCost === 1 ? 'one drop' : `${ev.graceCost} drops`} of Grace.`, 'citation', { italic: true, color: c.inkSoft }).height + 10;
      // The verse read as Longfellow's lines, when the page has room for it (always in Cantos · Your verses).
      const lh = lineHeight(theme.size('citation'));
      const room = right.y1 - (this.verdict.y + y) - 110;
      if (ev.cento.length * lh * 1.2 <= room) {
        for (const line of ev.cento) {
          y += para(scene, this.verdict, right.x0 + 8, y, w - 8, line.text, 'citation', { italic: true, color: c.ink }).height;
        }
      }
      y += 12;
    } else {
      const msg = headlineIssue(ev, this.composer);
      const hint = msg ?? (this.composer.isEmpty() ? 'Choose a word on the left page.' : 'Go on: three words make a verse.');
      y += para(scene, this.verdict, right.x0, y, w, hint, 'body', { italic: true, color: msg ? c.rubric : c.inkSoft }).height + 10;
    }
    if (this.flash) {
      y += para(scene, this.verdict, right.x0, y, w, this.flash, 'citation', { italic: true, color: 0x6a5420 }).height + 6;
    }
    const carry = promptRow(scene, ['J'], 'Carry this verse', { onPaper: true, bookFace: true, italic: true });
    carry.node.setPosition(right.x0, Math.max(y + 18, 0));
    carry.node.setAlpha(ev.valid ? 1 : 0.35);
    this.verdict.add(carry.node);
    const zone = scene.add.zone(right.x0, carry.node.y - 18, carry.width, 36).setOrigin(0, 0).setInteractive({ useHandCursor: ev.valid });
    zone.on('pointerdown', () => this.carry());
    this.verdict.add(zone);
    const eq = this.ctx.store.state.equippedVerse;
    if (eq) {
      const words: WordName[] = eq.tercets.flatMap((t) => [t[0], t[1], t[2]]);
      if (eq.coda) words.push(eq.coda);
      para(scene, this.verdict, right.x0, carry.node.y + 30, w, `Dante carries: ${words.join(' · ')}`, 'citation', { italic: true, color: c.inkSoft });
    }
  }

  private place(): void {
    const chip = this.chips[this.index];
    if (!this.composer || !chip) return;
    if (chip.word.use !== 'usable') {
      sfx('hurt');
      this.flash = chip.word.use === 'sealed' ? 'That word is sealed.' : chip.word.use === 'burden' ? 'A burden cannot be placed in a verse.' : '';
      this.render();
      return;
    }
    this.flash = '';
    if (this.composer.place(chip.word.name)) sfx('ui');
    this.render();
  }

  private takeBack(): void {
    if (!this.composer) return;
    if (!this.composer.clear()) {
      // Nothing in the focused slot: take back the last filled one before it.
      const all = this.composer.slots();
      const i = all.findIndex((s) => sameSlot(s, this.composer!.focus));
      for (let k = i - 1; k >= 0; k--) {
        const s = all[k] as SlotRef;
        if (this.composer.get(s)) {
          this.composer.clear(s);
          this.composer.focus = s;
          break;
        }
      }
    }
    this.flash = '';
    sfx('ui');
    this.render();
  }

  private carry(): void {
    if (!this.composer) return;
    const ev = this.evaluation();
    if (!ev?.valid) {
      sfx('hurt');
      return;
    }
    const verse = this.composer.toVerse();
    const store = this.ctx.store;
    store.setEquippedVerse(verse);
    const canto = store.state.position.canto ?? 'inf01';
    const same = store.state.verses.some((v) => v.canto === canto && JSON.stringify(v.verse) === JSON.stringify(verse));
    if (!same) store.addVerse(canto, verse);
    sfx('verse');
    this.flash = 'Dante carries this verse now. J speaks it.';
    this.render();
  }

  onAction(action: UiAction, meta: ActionMeta): boolean {
    if (action === 'verse') {
      this.carry();
      return true;
    }
    if (action === 'back' && meta.code === 'Backspace') {
      this.takeBack();
      return true;
    }
    if (this.focus === 'grid') {
      const n = this.chips.length;
      const col = this.index % COLS;
      if (action === 'up') {
        if (this.index - COLS >= 0) this.select(this.index - COLS);
      } else if (action === 'down') {
        if (this.index + COLS < n) this.select(this.index + COLS);
        else if (Math.floor(this.index / COLS) < Math.floor((n - 1) / COLS)) this.select(n - 1);
      } else if (action === 'left') {
        if (col > 0) this.select(this.index - 1);
      } else if (action === 'right') {
        if (col < COLS - 1 && this.index + 1 < n) this.select(this.index + 1);
        else if (this.composer) {
          this.focus = 'slots';
          this.render();
        }
      } else if ((action === 'advance' || action === 'interact') && !meta.repeat) this.place();
      else return false;
      return true;
    }
    // Slots
    const comp = this.composer;
    if (!comp) {
      this.focus = 'grid';
      return false;
    }
    const all = comp.slots();
    const i = all.findIndex((s) => sameSlot(s, comp.focus));
    if (action === 'left') {
      const cur = comp.focus;
      if (cur.kind === 'coda' || cur.slot === 0) this.focus = 'grid';
      else comp.moveFocus(-1);
    } else if (action === 'right') {
      const cur = comp.focus;
      if (!(cur.kind === 'tercet' && cur.slot === 2)) comp.moveFocus(1);
    } else if (action === 'up') {
      if (i - 3 >= 0) comp.focus = all[Math.max(0, i - 3)] as SlotRef;
    } else if (action === 'down') {
      if (i + 3 < all.length) comp.focus = all[i + 3] as SlotRef;
      else if (i < all.length - 1) comp.focus = all[all.length - 1] as SlotRef;
    } else if ((action === 'advance' || action === 'interact') && !meta.repeat) {
      if (comp.get(comp.focus)) comp.clear();
      else this.focus = 'grid';
    } else {
      return false;
    }
    sfx('ui');
    this.render();
    return true;
  }

  destroy(): void {
    // the root container is emptied by the Book
  }
}

