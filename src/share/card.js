/* ============================================================
   分享卡片：canvas 直出 PNG
   ------------------------------------------------------------
   竞品对标：测测的传播靠「星盘截图当社交货币」，玉虚宫靠
   一键长图。我们此前只有文字复制，分享链是断的。
   这里不引第三方库，用原生 canvas 画卡片：
     · 主题跟随明暗模式（读 CSS 变量，不写死）
     · 输出后优先走 navigator.share，其次剪贴板，最后下载
   卡片内容一律来自真实推演结果，不放写死的吉祥话。
   ============================================================ */

import { showToast } from '../ui/toast.js';

const W = 750;          // 卡片宽度（2x 清晰度基准）
const PAD = 64;

/** 读取当前主题的配色（跟随明暗模式） */
function palette() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return dark ? {
    bg: '#191613', bgCard: '#221e1a', text: '#ece5d8', text2: '#a8a094',
    text3: '#7d766b', accent: '#e08a55', accentSoft: 'rgba(224,138,85,.14)',
    line: 'rgba(236,229,216,.12)', serif: '"Songti SC","Noto Serif SC",serif',
    sans: '"PingFang SC","Noto Sans SC",sans-serif'
  } : {
    bg: '#faf8f2', bgCard: '#ffffff', text: '#2a241c', text2: '#6f675c',
    text3: '#9a9184', accent: '#c96f3f', accentSoft: 'rgba(201,111,63,.10)',
    line: 'rgba(42,36,28,.10)', serif: '"Songti SC","Noto Serif SC",serif',
    sans: '"PingFang SC","Noto Sans SC",sans-serif'
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 自动换行（按字符宽度折行） */
function wrap(ctx, text, maxW) {
  const out = [];
  let cur = '';
  for (const ch of String(text || '')) {
    if (ch === '\n') { out.push(cur); cur = ''; continue; }
    if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; }
    else cur += ch;
  }
  out.push(cur);
  return out.filter(s => s.length);
}

/**
 * 渲染一张分享卡片。
 * @param opts.kicker   顶部小字（栏目名）
 * @param opts.title    大标题
 * @param opts.sub      标题下的说明行（如日期、干支）
 * @param opts.badge    右上角徽章文字（如 顺势 / 82分）可选
 * @param opts.rows     [{k,v}] 条目列表
 * @param opts.quote    底部引言/判语（衬线字体强调）可选
 * @param opts.foot     免责声明小字
 */
export function renderShareCard(opts) {
  const P = palette();
  const cv = document.createElement('canvas');
  cv.width = W * 2; // 2x 输出保证清晰
  const ctx = cv.getContext('2d');
  ctx.scale(2, 2);

  const contentW = W - PAD * 2;

  /* ---- 第一遍：计算高度 ---- */
  let h = PAD + 30 + 18;                    // 品牌行
  h += 26;                                   // kicker
  ctx.font = '700 44px ' + P.serif;
  h += wrap(ctx, opts.title || '', contentW).length * 56 + 8;
  if (opts.sub) h += 34;
  if (opts.badge) h += 0;                    // 徽章画在顶部右侧
  h += 26;                                   // 分隔
  for (const row of opts.rows || []) {
    ctx.font = '400 26px ' + P.sans;
    const lines = wrap(ctx, row.v || '', contentW - 2 - 150);
    h += Math.max(40, lines.length * 38) + 14;
  }
  if (opts.quote) {
    ctx.font = '600 30px ' + P.serif;
    h += wrap(ctx, opts.quote, contentW - 56).length * 46 + 56;
  }
  if (opts.foot) {
    ctx.font = '400 22px ' + P.sans;
    h += wrap(ctx, opts.foot, contentW).length * 32 + 30;
  }
  h += PAD * 0.6 + 52 + 30;                  // 品牌尾行

  cv.height = Math.ceil(h * 2);
  ctx.scale(1, 1);
  ctx.setTransform(2, 0, 0, 2, 0, 0);

  /* ---- 背景 ---- */
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, h);
  // 顶部一抹极淡的强调色光晕，保持纸感
  const grad = ctx.createRadialGradient(W * 0.82, -80, 10, W * 0.82, -80, 420);
  grad.addColorStop(0, P.accentSoft);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 320);

  let y = PAD;

  /* ---- 品牌行 ---- */
  ctx.fillStyle = P.accent;
  ctx.font = '500 26px ' + P.sans;
  ctx.textBaseline = 'top';
  ctx.fillText('✦ 问问大师', PAD, y);
  ctx.fillStyle = P.text3;
  ctx.font = '400 22px ' + P.sans;
  const brandTail = '东方人生决策系统';
  ctx.fillText(brandTail, W - PAD - ctx.measureText(brandTail).width, y + 2);
  y += 30 + 18;

  /* ---- kicker ---- */
  if (opts.kicker) {
    ctx.fillStyle = P.accent;
    ctx.font = '500 24px ' + P.sans;
    ctx.fillText(opts.kicker, PAD, y);
    y += 26;
  }

  /* ---- 标题 ---- */
  ctx.fillStyle = P.text;
  ctx.font = '700 44px ' + P.serif;
  for (const line of wrap(ctx, opts.title || '', contentW)) {
    ctx.fillText(line, PAD, y);
    y += 56;
  }
  y += 8;

  /* ---- 徽章（右上角） ---- */
  if (opts.badge) {
    ctx.font = '600 26px ' + P.sans;
    const bw = ctx.measureText(opts.badge).width + 40;
    const bx = W - PAD - bw, by = PAD + 46;
    rr(ctx, bx, by, bw, 52, 26);
    ctx.fillStyle = P.accentSoft;
    ctx.fill();
    ctx.strokeStyle = P.accent;
    ctx.lineWidth = 1.5;
    rr(ctx, bx, by, bw, 52, 26);
    ctx.stroke();
    ctx.fillStyle = P.accent;
    ctx.fillText(opts.badge, bx + 20, by + 12);
  }

  /* ---- 副标题 ---- */
  if (opts.sub) {
    ctx.fillStyle = P.text2;
    ctx.font = '400 26px ' + P.sans;
    ctx.fillText(opts.sub, PAD, y);
    y += 34;
  }

  y += 12;
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 26;

  /* ---- 条目 ---- */
  for (const row of opts.rows || []) {
    ctx.font = '500 25px ' + P.sans;
    ctx.fillStyle = P.text2;
    ctx.fillText(row.k, PAD, y + 4);
    ctx.font = '400 26px ' + P.sans;
    ctx.fillStyle = P.text;
    const lines = wrap(ctx, row.v || '', contentW - 150);
    let ry = y + 2;
    for (const line of lines) {
      ctx.fillText(line, PAD + 150, ry + 2);
      ry += 38;
    }
    y = Math.max(y + 40, ry) + 14;
  }

  /* ---- 引言 ---- */
  if (opts.quote) {
    y += 10;
    ctx.font = '600 30px ' + P.serif;
    const qlines = wrap(ctx, opts.quote, contentW - 56);
    const qh = qlines.length * 46 + 40;
    ctx.fillStyle = P.accentSoft;
    rr(ctx, PAD, y, contentW, qh, 16);
    ctx.fill();
    ctx.fillStyle = P.accent;
    ctx.font = '700 40px ' + P.serif;
    ctx.fillText('「', PAD + 20, y + 14);
    ctx.fillStyle = P.text;
    ctx.font = '600 30px ' + P.serif;
    let qy = y + 22;
    for (const line of qlines) {
      ctx.fillText(line, PAD + 56, qy);
      qy += 46;
    }
    y += qh + 20;
  }

  /* ---- 免责 ---- */
  if (opts.foot) {
    y += 6;
    ctx.fillStyle = P.text3;
    ctx.font = '400 22px ' + P.sans;
    for (const line of wrap(ctx, opts.foot, contentW)) {
      ctx.fillText(line, PAD, y);
      y += 32;
    }
    y += 14;
  }

  /* ---- 尾行 ---- */
  ctx.strokeStyle = P.line;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 24;
  ctx.fillStyle = P.text3;
  ctx.font = '400 22px ' + P.sans;
  ctx.fillText('仅供自我整理与行动参考，不构成投资、医疗、法律或职业决策依据', PAD, y);

  return cv;
}

/* ============================================================
   导出链路：share API → 剪贴板 → 下载
   ============================================================ */
export async function exportShareCard(canvas, filename) {
  let blob = null;
  try { blob = await new Promise(r => canvas.toBlob(r, 'image/png')); } catch (e) {}
  if (!blob) { showToast('生成图片失败，请重试'); return; }

  // 1) 系统分享（移动端微信/相册直达）
  try {
    const file = new File([blob], filename + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '问问大师' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // 用户取消，不算失败
  }

  // 2) 剪贴板图片
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('卡片已复制为图片，可直接粘贴发送');
      return;
    }
  } catch (e) {}

  // 3) 下载兜底
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('图片已下载');
}

/** 把 canvas 转成 dataURL，供旧版「文字分享」之外直接使用 */
export function cardDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}
