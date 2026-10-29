/* Character-led social posters. Only the two deliberately selected result
   facts are drawn; names, birth details and locations never enter the image. */

const WIDTH = 1080;
const SERIF = '"Songti SC", "Noto Serif SC", "STSong", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", sans-serif';

function hueFromHex(hex) {
  const match = /^#([a-f\d]{6})$/i.exec(hex || '');
  if (!match) return 35;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(match[1].slice(i, i + 2), 16) / 255);
  const high = Math.max(r, g, b), low = Math.min(r, g, b), delta = high - low;
  if (!delta) return 0;
  const value = high === r ? ((g - b) / delta) % 6 : high === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return Math.round((value * 60 + 360) % 360);
}

function loadImage(src, required) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const finish = ok => {
      if (settled) return;
      settled = true; clearTimeout(timer); img.onload = img.onerror = null;
      if (ok) resolve(img);
      else if (required) reject(new Error('人物图片暂时无法加载'));
      else resolve(null);
    };
    const timer = setTimeout(() => finish(false), required ? 10000 : 900);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = new URL(src, document.baseURI).href;
  });
}

function drawCover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function fitText(ctx, text, maxWidth) {
  const chars = Array.from(String(text || ''));
  while (chars.length && ctx.measureText(chars.join('')).width > maxWidth) chars.pop();
  return chars.length < Array.from(String(text || '')).length ? chars.join('') + '…' : chars.join('');
}

/** Extract a small, truthful summary from the same data as the visible report. */
export function posterFacts({ kind, system, ctx, western, documentRoot = document }) {
  const fact = (label, value) => ({ label, value: String(value || '').trim() });
  if (kind === 'today') {
    const values = selector => [...documentRoot.querySelectorAll(selector)].slice(0, 2).map(el => el.textContent.trim()).filter(Boolean).join(' · ');
    return [fact('宜', values('[data-card="todayAdv"] .adv-tag.yi')),
      fact('忌', values('[data-card="todayAdv"] .adv-tag.ji'))].filter(x => x.value);
  }
  if (kind === 'week') {
    const week = typeof window !== 'undefined' ? window._weekData : null;
    return [fact('相对顺利', week?.best?.label), fact('多留余量', week?.worst?.label)].filter(x => x.value);
  }
  if (kind === 'year') {
    return [fact('事业', Number.isFinite(ctx?.cs) ? `${ctx.cs}分` : ''),
      fact('财运', Number.isFinite(ctx?.ws) ? `${ctx.ws}分` : '')].filter(x => x.value);
  }
  if (system === 'western') {
    return [fact('太阳', western?.horo?.sunName), fact('月亮', western?.astro?.moon?.name)].filter(x => x.value);
  }
  return [fact('日主', ctx?.dg && ctx?.dw ? `${ctx.dg}${ctx.dw}` : ''),
    fact('用神', ctx?.wx?.ys)].filter(x => x.value);
}

/** Render a self-contained 1080px PNG canvas from the current character. */
export async function renderTraitPoster({ theme, ctx, western, system = 'eastern', kind = 'report',
  format = 'portrait', includeSummary = true, isDemo = false }) {
  if (!theme?.character?.assets?.portrait?.src) throw new Error('请先选择同行特质');
  const [portrait, backdrop] = await Promise.all([
    loadImage(theme.character.assets.portrait.src, true),
    loadImage(theme.backdrop.mobile, false),
  ]);
  const canvas = document.createElement('canvas');
  const height = format === 'square' ? WIDTH : 1350;
  canvas.width = WIDTH; canvas.height = height;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('当前浏览器无法生成图片');
  const hue = hueFromHex(theme.trait.color);

  const base = g.createLinearGradient(0, 0, WIDTH, height);
  base.addColorStop(0, `hsl(${hue}, 32%, 18%)`);
  base.addColorStop(.55, `hsl(${hue}, 30%, 11%)`);
  base.addColorStop(1, '#0c0b12');
  g.fillStyle = base; g.fillRect(0, 0, WIDTH, height);
  if (backdrop) {
    g.globalAlpha = .42; drawCover(g, backdrop, 0, 0, WIDTH, height); g.globalAlpha = 1;
  }
  const veil = g.createLinearGradient(0, 0, WIDTH, 0);
  veil.addColorStop(0, 'rgba(7,8,15,.68)'); veil.addColorStop(.5, 'rgba(7,8,15,.12)'); veil.addColorStop(1, 'rgba(7,8,15,.28)');
  g.fillStyle = veil; g.fillRect(0, 0, WIDTH, height);

  // A delicate orbit sits behind the figure, not in a frame around it.
  g.save(); g.strokeStyle = `hsla(${hue}, 60%, 82%, .23)`; g.lineWidth = 1.5;
  g.beginPath(); g.arc(WIDTH * .66, height * .38, WIDTH * .34, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(WIDTH * .66, height * .38, WIDTH * .38, .18, Math.PI * 1.32); g.stroke();
  g.restore();

  // Keep a large, near-view character; the lower part fades into the details.
  const pw = 1010, ph = pw * portrait.naturalHeight / portrait.naturalWidth;
  const px = 55, py = format === 'square' ? 95 : 128;
  g.drawImage(portrait, px, py, pw, ph);
  const shade = g.createLinearGradient(0, height * .55, 0, height);
  shade.addColorStop(0, 'rgba(8,8,14,0)'); shade.addColorStop(.54, 'rgba(8,8,14,.72)'); shade.addColorStop(1, 'rgba(8,8,14,.96)');
  g.fillStyle = shade; g.fillRect(0, height * .55, WIDTH, height * .45);

  g.textBaseline = 'top';
  g.fillStyle = 'rgba(255,248,236,.82)';
  g.font = `600 28px ${SANS}`;
  g.fillText('问问大师', 70, 61);
  g.fillStyle = `hsla(${hue}, 65%, 85%, .88)`;
  g.font = `500 20px ${SANS}`;
  g.fillText('A MOMENT WITH YOU', 70, 105);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(255,248,236,.65)';
  g.font = `500 20px ${SANS}`;
  g.fillText(isDemo ? '示例 · 同行特质' : '同行特质', WIDTH - 70, 70);
  g.textAlign = 'left';

  g.fillStyle = 'rgba(255,250,242,.8)';
  g.font = `500 24px ${SANS}`;
  g.fillText('我的特质', 76, 177);
  g.fillStyle = '#fffaf1';
  g.font = `700 100px ${SERIF}`;
  g.fillText(theme.trait.label, 70, 220);
  g.fillStyle = theme.trait.color;
  g.fillRect(76, 352, 68, 3);

  const facts = includeSummary ? posterFacts({ kind, system, ctx, western }) : [];
  const sectionTitle = kind === 'today' ? '今日建议' : kind === 'week' ? '本周节奏' : kind === 'year' ? '当年趋势' : system === 'western' ? '星象一瞥' : '命盘一瞥';
  const bottom = height - 230;
  if (facts.length) {
    g.fillStyle = 'rgba(255,248,236,.66)'; g.font = `500 24px ${SANS}`; g.fillText(sectionTitle, 76, bottom);
    g.strokeStyle = 'rgba(255,248,236,.24)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(76, bottom + 42); g.lineTo(WIDTH - 76, bottom + 42); g.stroke();
    facts.slice(0, 2).forEach((entry, index) => {
      const x = 76 + index * 465;
      g.fillStyle = 'rgba(255,248,236,.62)'; g.font = `500 22px ${SANS}`; g.fillText(entry.label, x, bottom + 63);
      g.fillStyle = '#fffaf4'; g.font = `600 ${entry.value.length > 8 ? 30 : 39}px ${SANS}`;
      g.fillText(fitText(g, entry.value, 415), x, bottom + 99);
    });
  } else {
    g.fillStyle = 'rgba(255,248,236,.88)';
    g.font = `500 31px ${SERIF}`;
    g.fillText(fitText(g, theme.reportLead || '和自己，好好相遇。', WIDTH - 152), 76, bottom + 77);
  }
  g.fillStyle = 'rgba(255,248,236,.46)'; g.font = `400 19px ${SANS}`;
  g.fillText('仅供自我探索与生活参考', 76, height - 65);
  g.textAlign = 'right'; g.fillText('问问大师  ·  WENWEN', WIDTH - 76, height - 65); g.textAlign = 'left';
  return { canvas, facts };
}
