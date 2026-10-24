/**
 * poster.js — 活动海报 / 分享卡片 / 二维码生成（纯前端 canvas）。
 *
 * 依赖：qrcode（把 URL 转成 dataURL）
 * 说明：海报在浏览器本地 canvas 绘制，不上传服务器、不新增后端接口。
 */
import QRCode from 'qrcode';

/** 活动详情页链接（供二维码与复制链接使用） */
export function eventUrl(id) {
  return `${window.location.origin}/events/${id}`;
}

/** 生成二维码 dataURL（可嵌入海报或直接下载） */
export function qrDataUrl(text, opts = {}) {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 256,
    color: { dark: '#111827', light: '#ffffff' },
    ...opts,
  });
}

/** 下载 dataURL 为文件 */
export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 加载图片（处理跨域，画布导出不污染）
 * @param {string} src
 * @returns {Promise<HTMLImageElement|null>} 失败返回 null
 */
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 截断多行文本，超出加省略号 */
function truncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/**
 * 生成活动分享海报（1080×1440，竖版）
 * @param {object} event 活动对象（含 title/location/start_time/signup_deadline/category_name/cover_url）
 * @param {string} qr   二维码 dataURL
 * @returns {Promise<string>} 海报 dataURL
 */
export async function generatePoster(event, qr) {
  const W = 1080;
  const H = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景：渐变
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1e3a8a');
  bg.addColorStop(1, '#3b82f6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 顶部装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(W - 60, 60, 180, 0, Math.PI * 2);
  ctx.fill();

  // 标题（最多两行）
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textBaseline = 'top';
  const title = truncate(event.title || '校园活动', 16);
  const lineW = 820;
  let y = 120;
  let line = '';
  for (const ch of title) {
    if (ctx.measureText(line + ch).width > lineW) {
      ctx.fillText(line, (W - lineW) / 2, y);
      line = ch;
      y += 96;
    } else {
      line += ch;
    }
  }
  if (line) ctx.fillText(line, (W - lineW) / 2, y);

  // 分类徽标
  if (event.category_name) {
    ctx.font = '34px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`# ${event.category_name}`, (W - lineW) / 2, y + 110);
  }

  // 封面图（居中展示，圆角）
  const cover = await loadImage(event.cover_url);
  const imgY = 520;
  const imgH = 440;
  ctx.save();
  ctx.beginPath();
  const r = 24;
  const ix = (W - lineW) / 2;
  ctx.moveTo(ix + r, imgY);
  ctx.arcTo(ix + lineW, imgY, ix + lineW, imgY + imgH, r);
  ctx.arcTo(ix + lineW, imgY + imgH, ix, imgY + imgH, r);
  ctx.arcTo(ix, imgY + imgH, ix, imgY, r);
  ctx.arcTo(ix, imgY, ix + lineW, imgY, r);
  ctx.closePath();
  ctx.clip();
  if (cover) {
    const scale = Math.max(lineW / cover.width, imgH / cover.height);
    const dw = cover.width * scale;
    const dh = cover.height * scale;
    ctx.drawImage(cover, ix + (lineW - dw) / 2, imgY + (imgH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(ix, imgY, lineW, imgH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((event.title || '活').slice(0, 1), W / 2, imgY + imgH / 2 - 60);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // 信息区（时间/地点）
  ctx.textBaseline = 'top';
  const infoX = (W - lineW) / 2;
  let iy = 1000;
  const info = [
    ['🕒', event.start_time ? formatShort(event.start_time) : '时间待定'],
    ['📍', truncate(event.location || '地点待定', 22)],
    ['⏳', event.signup_deadline ? `报名截止 ${formatShort(event.signup_deadline)}` : ''],
  ];
  ctx.font = '34px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#ffffff';
  for (const [icon, txt] of info) {
    if (!txt) continue;
    ctx.fillText(`${icon} ${txt}`, infoX, iy);
    iy += 64;
  }

  // 底部：二维码 + 提示
  const qrImg = await loadImage(qr);
  const qrSize = 180;
  const qrX = infoX;
  const qrY = 1240;
  if (qrImg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('扫码报名', qrX + qrSize + 30, qrY + 30);
  ctx.font = '28px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('校园活动报名系统', qrX + qrSize + 30, qrY + 84);

  return canvas.toDataURL('image/png');
}

/** 简短时间格式：MM月DD日 HH:mm */
function formatShort(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}
