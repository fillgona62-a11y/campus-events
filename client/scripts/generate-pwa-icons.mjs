// client/scripts/generate-pwa-icons.mjs
// 生成 PWA 图标（纯 Node，无依赖）：192/512/maskable + 180 apple-touch-icon
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const BG = [25, 118, 210];   // #1976d2 主题色
const FG = [255, 255, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function draw(size) {
  const s = size;
  const data = Buffer.alloc(s * s * 3, 0);
  const px = (x, y, c) => { const i = (y * s + x) * 3; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; };
  const rect = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (x >= 0 && x < s && y >= 0 && y < s) px(x, y, c);
  };
  rect(0, 0, s, s, BG);                              // 蓝底
  const m = Math.round(s * 0.18);                    // 边距
  const t = Math.max(2, Math.round(s * 0.045));      // 笔画
  rect(m, m + t, s - 2 * m, t, FG);                  // 日历框上横
  rect(m, m + t, t, s - 2 * m - 2 * t, FG);          // 左竖
  rect(s - m - t, m + t, t, s - 2 * m - 2 * t, FG);  // 右竖
  rect(m, s - m - t, s - 2 * m, t, FG);              // 下横
  const cx0 = Math.round(s * 0.42), cy0 = Math.round(s * 0.58); // 对勾
  const arm = Math.round(s * 0.10);
  for (let i = 0; i < arm; i++) {
    rect(cx0 + i, cy0 + i, t, t, FG);
    rect(cx0 + i, cy0 + arm - i, t, t, FG);
  }
  return data;
}
function toPng(size) {
  const raw = draw(size);
  const stride = size * 3;
  const rows = [];
  for (let y = 0; y < size; y++) rows.push(Buffer.concat([Buffer.from([0]), raw.subarray(y * stride, (y + 1) * stride)]));
  const idat = deflateSync(Buffer.concat(rows));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'icon-192.png'), toPng(192));
writeFileSync(join(OUT_DIR, 'icon-512.png'), toPng(512));
writeFileSync(join(OUT_DIR, 'apple-touch-icon.png'), toPng(180));
console.log('[pwa] icons generated in', OUT_DIR);
