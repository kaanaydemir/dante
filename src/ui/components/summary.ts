/**
 * Renders summary blocks (colophon "In this canto", chapter end, Your Comedy)
 * on a page of the open book, and measures them for pagination with the same
 * layout. Words, never numbers, for the heart and trust.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import type { QuoteSpec } from '../../runtime/contracts';
import { iconTexture } from '../art/textures';
import { uiContext } from '../context';
import type { SummaryBlock } from '../models/colophon';
import { scalePose } from '../models/hud';
import { addText, measurer } from '../phaser/helpers';
import { unquote, wrapText } from '../text';
import { lineHeight, textStyle, type TextStyleSpec } from '../theme';
import type { BookPageApi } from '../sceneApi';
import { PAGE, type PageSide } from './BookSpread';
import { renderVerseLines, measureVerseLines } from './verseLines';

interface Laid {
  readonly height: number;
  draw(parent: Phaser.GameObjects.Container, scene: Phaser.Scene, x: number, y: number): void;
}

function textBlock(text: string, style: TextStyleSpec, px: number, width: number, indent = 0, after = 6): Laid {
  const lines = wrapText(text, width - indent, measurer(style));
  const lh = lineHeight(px);
  return {
    height: lines.length * lh + after,
    draw: (parent, scene, x, y) => {
      parent.add(addText(scene, x + indent, y, lines.join('\n'), { ...style, lineSpacing: lh - px }));
    },
  };
}

function stack(parts: Laid[]): Laid {
  return {
    height: parts.reduce((a, p) => a + p.height, 0),
    draw: (parent, scene, x, y) => {
      let yy = y;
      for (const p of parts) {
        p.draw(parent, scene, x, yy);
        yy += p.height;
      }
    },
  };
}

function layoutBlock(b: SummaryBlock, width: number): Laid {
  const theme = uiContext().theme();
  const c = theme.colors;
  const x = theme.extra;
  const body = theme.size('body');
  const cite = theme.size('citation');
  switch (b.kind) {
    case 'heading':
      return textBlock(b.text, textStyle(theme, 'heading', { color: c.rubric }), theme.size('heading'), width, 0, 12);
    case 'subheading':
      return stack([{ height: 8, draw: () => undefined }, textBlock(b.text.toUpperCase(), textStyle(theme, 'citation', { color: c.rubric, letterSpacing: 2 }), cite, width, 0, 4)]);
    case 'gap':
      return { height: 14, draw: () => undefined };
    case 'line':
      return textBlock(b.text, textStyle(theme, 'body', { color: b.muted ? c.inkSoft : c.ink, italic: b.muted }), body, width, 0, 8);
    case 'choice': {
      const parts: Laid[] = [textBlock(b.title, textStyle(theme, 'citation', { italic: true, color: c.inkSoft }), cite, width, 0, 2)];
      parts.push(textBlock(`${b.systemic ? '' : 'You: '}${unquote(b.yours)}`, textStyle(theme, 'body', { color: c.ink }), body, width, 14, 2));
      if (b.heading && b.dante) {
        const as = b.heading === 'As Dante did';
        parts.push(textBlock(`${b.heading}: ${b.dante}`, textStyle(theme, 'citation', { color: as ? 0x6a5420 : c.rubric }), cite, width, 14, 10));
      } else {
        parts.push({ height: 8, draw: () => undefined });
      }
      return stack(parts);
    }
    case 'word': {
      const labels: Record<string, string> = { gained: '', unsealed: ' · unsealed', sealed: ' · sealed', shed: ' · set down' };
      const head = textBlock(`${b.word}${labels[b.change] ?? ''}`, textStyle(theme, 'body', { color: b.change === 'shed' ? c.inkSoft : c.rubric }), body, width, 0, 0);
      const origin = b.origin ? textBlock(`${b.origin}  (${b.citation})`, textStyle(theme, 'citation', { italic: true, color: c.inkSoft }), cite, width, 14, 8) : { height: 6, draw: () => undefined };
      return stack([head, origin]);
    }
    case 'scale': {
      const h = 76;
      return {
        height: h + 6,
        draw: (parent, scene, px, py) => drawScale(parent, scene, px + width / 2, py + 6, b.pity, b.justice),
      };
    }
    case 'stars': {
      const rows = b.levels.length;
      const rh = lineHeight(cite) + 6;
      return {
        height: rows * rh + 10,
        draw: (parent, scene, px, py) => {
          b.levels.forEach((l, i) => {
            const y = py + i * rh;
            const star = scene.add.image(px + 14, y + rh / 2 - 2, iconTexture(scene, 'star', 0xb8913f, c.ink, 22));
            star.setAlpha(0.18 + 0.82 * Math.min(1, l.level / 3));
            parent.add(star);
            parent.add(addText(scene, px + 36, y, l.name, textStyle(theme, 'citation', { color: c.ink })));
          });
        },
      };
    }
    case 'cento': {
      const style = textStyle(theme, 'citation', { italic: true, color: c.ink });
      const lines = b.lines.map((l) => `${l.text}`);
      const m = measureVerseLines(lines, { maxWidth: width - 20, style, px: cite, lineHeightPx: lineHeight(cite) + 2 });
      return {
        height: m.height + 6,
        draw: (parent, scene, px, py) => {
          const r = renderVerseLines(scene, parent, lines, { x: px + 10, y: py, maxWidth: width - 20, style, px: cite, lineHeightPx: lineHeight(cite) + 2 });
          void r;
        },
      };
    }
  }
  return { height: 0, draw: () => undefined };
}

function drawScale(parent: Phaser.GameObjects.Container, scene: Phaser.Scene, cx: number, top: number, pity: number, justice: number): void {
  const theme = uiContext().theme();
  const c = theme.colors;
  const g = scene.add.graphics();
  const arm = 44;
  const pose = scalePose(pity, justice, arm);
  const rad = (pose.beamDeg * Math.PI) / 180;
  const lx = cx - Math.cos(rad) * arm;
  const ly = top + 10 - Math.sin(rad) * arm;
  const rx = cx + Math.cos(rad) * arm;
  const ry = top + 10 + Math.sin(rad) * arm;
  g.lineStyle(2, c.inkSoft, 1);
  g.lineBetween(cx, top + 4, cx, top + 66);
  g.lineBetween(cx - 18, top + 68, cx + 18, top + 68);
  g.lineStyle(3, 0x8a6a2a, 1);
  g.lineBetween(lx, ly, rx, ry);
  const pan = (px: number, py: number, color: number, load: number): void => {
    g.lineStyle(1, c.inkSoft, 0.8);
    g.lineBetween(px, py, px - 12, py + 30);
    g.lineBetween(px, py, px + 12, py + 30);
    g.fillStyle(color, 1);
    g.fillEllipse(px, py + 32, 32, 10);
    if (load > 0) {
      g.fillStyle(color, 0.7);
      g.fillEllipse(px, py + 28, 18 * load + 6, 8 * load + 3);
    }
  };
  pan(lx, ly, c.pity, pose.pityLoad);
  pan(rx, ry, c.justice, pose.justiceLoad);
  parent.add(g);
  parent.add(scene.add.image(cx - arm - 34, top + 44, iconTexture(scene, 'tear', c.pity, c.ink, 22)));
  parent.add(scene.add.image(cx + arm + 34, top + 44, iconTexture(scene, 'pan', c.justice, c.ink, 22)));
}

/** Heights of blocks laid out at `width` (for pagination). */
export function summaryHeights(blocks: readonly SummaryBlock[], width: number): number[] {
  return blocks.map((b) => layoutBlock(b, width).height);
}

/**
 * Draw blocks on one page. With `closing`, the page shows the canto's last
 * line alone, centred (the colophon's left page).
 */
export function renderSummaryPage(bp: BookPageApi, side: PageSide, blocks: readonly SummaryBlock[], opts: { closing?: QuoteSpec | null }): void {
  const scene = bp as unknown as Phaser.Scene;
  const box = PAGE[side];
  const parent = side === 'left' ? bp.spread.left : bp.spread.right;
  const width = box.x1 - box.x0;
  const theme = uiContext().theme();
  if (opts.closing !== undefined) {
    const q = opts.closing;
    if (!q) return;
    // The last line stands alone: as large as fits on one line (never below 20 px).
    let px = Math.round(theme.size('verse') * 1.15);
    let style = textStyle(theme, 'verse', { px, color: theme.colors.ink, align: 'center' });
    const widest = (): number => Math.max(...q.lines.map((l) => measurer(style)(l)));
    while (px > 20 && widest() > width) {
      px -= 1;
      style = textStyle(theme, 'verse', { px, color: theme.colors.ink, align: 'center' });
    }
    const m = measureVerseLines(q.lines, { maxWidth: width, style, px });
    const top = Math.round((box.y0 + box.y1) / 2 - m.height / 2 - 20);
    const lx = Math.max(box.x0, Math.round((box.x0 + box.x1) / 2 - m.width / 2));
    renderVerseLines(scene, parent, q.lines, { x: lx, y: top, maxWidth: box.x1 - lx, style, px });
    parent.add(
      addText(scene, Math.min(box.x1, lx + m.width), top + m.height + 16, q.citationText, textStyle(theme, 'citation', { italic: true, color: theme.colors.inkSoft })).setOrigin(1, 0),
    );
    // A small tailpiece under it.
    const g = scene.add.graphics();
    const cx = (box.x0 + box.x1) / 2;
    const y = top + m.height + 70;
    g.lineStyle(1, theme.extra.inkFaint, 0.9);
    g.lineBetween(cx - 70, y, cx - 10, y);
    g.lineBetween(cx + 10, y, cx + 70, y);
    g.fillStyle(theme.colors.rubric, 0.9);
    g.fillCircle(cx, y, 3);
    parent.add(g);
    return;
  }
  let y = box.y0 + 4;
  for (const b of blocks) {
    const laid = layoutBlock(b, width);
    laid.draw(parent, scene, box.x0, y);
    y += laid.height;
  }
}
