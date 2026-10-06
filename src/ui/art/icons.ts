/**
 * Small painted icons for the HUD and the Book: Resolve's flame, Grace's drop,
 * pity's tear and justice's pan (shape as well as colour: bible §1.6), the
 * Book, a wax seal, a star and a quill. Canvas 2D, no Phaser.
 *
 * Owner: team C (presentation).
 */

import { mixColor, rgba } from '../theme';
import type { Ctx } from './paint';

export type IconName = 'flame' | 'drop' | 'tear' | 'pan' | 'book' | 'seal' | 'star' | 'quill' | 'candle' | 'page';

export const ICON_SIZE = 40;

function teardrop(ctx: Ctx, cx: number, top: number, bottom: number, half: number): void {
  const r = half;
  const cy = bottom - r;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + r * 0.25, top + (cy - top) * 0.45, cx + r, cy - r * 0.6, cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI, false);
  ctx.bezierCurveTo(cx - r, cy - r * 0.6, cx - r * 0.25, top + (cy - top) * 0.45, cx, top);
  ctx.closePath();
}

export function paintIcon(ctx: Ctx, name: IconName, size: number, color: number, ink: number): void {
  ctx.clearRect(0, 0, size, size);
  const s = size / 40;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (name) {
    case 'flame': {
      const g = ctx.createLinearGradient(0, 4, 0, 36);
      g.addColorStop(0, rgba(mixColor(color, 0xffe9a0, 0.6), 1));
      g.addColorStop(1, rgba(color, 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(20, 3);
      ctx.bezierCurveTo(27, 12, 33, 18, 31, 26);
      ctx.bezierCurveTo(30, 33, 25, 37, 20, 37);
      ctx.bezierCurveTo(14, 37, 9, 33, 9, 26);
      ctx.bezierCurveTo(9, 20, 14, 17, 15, 10);
      ctx.bezierCurveTo(17, 14, 18, 16, 19, 18);
      ctx.bezierCurveTo(21, 13, 21, 8, 20, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(0xfff1c0, 0.9);
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.bezierCurveTo(24, 25, 25, 28, 24, 31);
      ctx.bezierCurveTo(23, 34, 17, 34, 16, 31);
      ctx.bezierCurveTo(15, 27, 18, 25, 20, 20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(ink, 0.7);
      ctx.lineWidth = 1.2;
      break;
    }
    case 'drop': {
      teardrop(ctx, 20, 4, 36, 11);
      const g = ctx.createRadialGradient(16, 26, 2, 20, 26, 14);
      g.addColorStop(0, rgba(0xffffff, 1));
      g.addColorStop(1, rgba(color, 1));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(mixColor(color, ink, 0.5), 0.9);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      break;
    }
    case 'tear': {
      teardrop(ctx, 20, 6, 34, 9);
      ctx.fillStyle = rgba(color, 1);
      ctx.fill();
      ctx.fillStyle = rgba(0xffffff, 0.6);
      ctx.beginPath();
      ctx.arc(17, 26, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(mixColor(color, ink, 0.6), 1);
      ctx.lineWidth = 1.4;
      teardrop(ctx, 20, 6, 34, 9);
      ctx.stroke();
      break;
    }
    case 'pan': {
      ctx.strokeStyle = rgba(color, 1);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(20, 5);
      ctx.lineTo(9, 22);
      ctx.moveTo(20, 5);
      ctx.lineTo(31, 22);
      ctx.stroke();
      ctx.fillStyle = rgba(color, 1);
      ctx.beginPath();
      ctx.moveTo(6, 22);
      ctx.lineTo(34, 22);
      ctx.quadraticCurveTo(32, 33, 20, 33);
      ctx.quadraticCurveTo(8, 33, 6, 22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(mixColor(color, ink, 0.5), 1);
      ctx.stroke();
      break;
    }
    case 'book': {
      ctx.fillStyle = rgba(mixColor(color, 0x000000, 0.35), 1);
      ctx.fillRect(8, 6, 25, 29);
      ctx.fillStyle = rgba(color, 1);
      ctx.fillRect(10, 5, 23, 28);
      ctx.fillStyle = rgba(0xe9dfc6, 1);
      ctx.fillRect(11, 31, 22, 3);
      ctx.strokeStyle = rgba(0xe6c66e, 0.9);
      ctx.lineWidth = 1;
      ctx.strokeRect(13.5, 8.5, 17, 20);
      ctx.fillStyle = rgba(0xe6c66e, 0.9);
      ctx.fillRect(19, 13, 5, 1.5);
      ctx.fillRect(17, 17, 9, 1.5);
      break;
    }
    case 'seal': {
      ctx.fillStyle = rgba(color, 1);
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = i % 2 === 0 ? 15 : 13;
        ctx.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(mixColor(color, 0x000000, 0.45), 1);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(20, 20, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(mixColor(color, 0x000000, 0.4), 1);
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('D', 20, 21);
      break;
    }
    case 'star': {
      ctx.fillStyle = rgba(color, 1);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 16 : 5;
        ctx.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'quill': {
      ctx.strokeStyle = rgba(color, 1);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(8, 34);
      ctx.quadraticCurveTo(22, 20, 33, 5);
      ctx.stroke();
      ctx.fillStyle = rgba(color, 0.85);
      ctx.beginPath();
      ctx.moveTo(33, 5);
      ctx.quadraticCurveTo(24, 10, 16, 26);
      ctx.quadraticCurveTo(28, 20, 33, 5);
      ctx.fill();
      break;
    }
    case 'candle': {
      ctx.fillStyle = rgba(0xe9dfc6, 1);
      ctx.fillRect(15, 16, 10, 20);
      ctx.fillStyle = rgba(color, 1);
      teardrop(ctx, 20, 3, 15, 4);
      ctx.fill();
      break;
    }
    case 'page': {
      ctx.fillStyle = rgba(0xe9dfc6, 1);
      ctx.beginPath();
      ctx.moveTo(10, 4);
      ctx.lineTo(26, 4);
      ctx.lineTo(32, 10);
      ctx.lineTo(32, 36);
      ctx.lineTo(10, 36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(ink, 0.6);
      ctx.lineWidth = 1;
      for (let y = 14; y < 33; y += 4) {
        ctx.beginPath();
        ctx.moveTo(14, y);
        ctx.lineTo(28, y);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(color, 1);
      ctx.fillRect(13, 8, 6, 4);
      break;
    }
  }
  ctx.restore();
}
