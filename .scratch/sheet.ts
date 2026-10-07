// Renders art catalog bitmaps into PNG contact sheets (exploration only).
import { buildCatalog } from '/src/art/catalog';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function png(w: number, h: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(deflateSync(raw))), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
const scale = Number(process.argv[3] ?? 3);
const name = process.argv[4] ?? 'sheet';
const cat = buildCatalog(['inf01','inf02','inf03','inf04','inf05']);
const items = cat.bitmaps.filter((b) => !filter || filter.test(b.key));
// layout rows: each bitmap scaled, wrap at 1800px
const W = 1800;
let x = 4, y = 4, rowH = 0;
const pos: {b: typeof items[number]; x: number; y: number}[] = [];
for (const b of items) {
  const bw = b.width * scale, bh = b.height * scale;
  if (x + bw > W) { x = 4; y += rowH + 6; rowH = 0; }
  pos.push({ b, x, y });
  x += bw + 6; rowH = Math.max(rowH, bh);
}
const H = y + rowH + 4;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i*4] = 60; out[i*4+1] = 60; out[i*4+2] = 70; out[i*4+3] = 255; }
for (const { b, x: ox, y: oy } of pos) {
  for (let yy = 0; yy < b.height; yy++) for (let xx = 0; xx < b.width; xx++) {
    const si = (yy * b.width + xx) * 4;
    const a = b.data[si + 3]! / 255;
    if (a <= 0) continue;
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const di = ((oy + yy * scale + sy) * W + (ox + xx * scale + sx)) * 4;
      for (let c = 0; c < 3; c++) out[di + c] = Math.round(b.data[si + c]! * a + out[di + c]! * (1 - a));
    }
  }
}
writeFileSync(`/home/user/dante/.scratch/${name}.png`, png(W, H, out));
console.log(`${items.length} bitmaps -> ${W}x${H}`, items.map((b) => b.key).join(' ').slice(0, 600));
