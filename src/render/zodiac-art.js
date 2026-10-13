/* ============================================================
   十二星座 · 真实星图配图
   ------------------------------------------------------------
   星表:各星座主要恒星的赤经(小时)/赤纬(度)/视星等,
   连线为通用星座画法。提供 SVG 与 Canvas 两种绘制出口:
   · zodiacArtSVG(signId, opts)  → SVG 字符串(卡片内嵌)
   · drawZodiacArt(ctx, ...)     → 2D 上下文直绘(3D 环带贴图)
   ============================================================ */

export const ZODIAC_STARS = {
  ari: { stars: [[1.9, 19.3, 4.6], [1.95, 20.8, 2.6], [2.12, 23.5, 2.0], [2.83, 27.3, 3.9]], lines: [[0, 1], [1, 2], [1, 3]] },
  tau: { stars: [[3.79, 24.1, 1.6], [4.05, 17.5, 3.4], [4.33, 15.6, 3.0], [4.48, 19.2, 3.4], [4.6, 16.5, 0.9], [4.95, 11.3, 2.9], [5.44, 28.6, 1.7]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 0]] },
  gem: { stars: [[7.35, 31.9, 1.6], [7.75, 28.0, 1.1], [6.73, 25.5, 3.1], [6.38, 22.5, 2.9], [7.3, 25.1, 3.0], [6.7, 16.4, 1.9], [6.72, 12.9, 3.9]], lines: [[0, 4], [4, 3], [3, 6], [1, 5], [5, 6], [0, 1], [4, 2]] },
  cnc: { stars: [[8.67, 11.9, 4.3], [8.28, 9.2, 3.5], [8.72, 18.2, 4.7], [8.72, 21.5, 4.7], [8.67, 19.6, 3.7]], lines: [[0, 1], [2, 3], [2, 4]] },
  leo: { stars: [[10.14, 12.0, 1.4], [10.72, 16.8, 2.6], [11.82, 14.6, 2.1], [11.24, 20.5, 2.6], [10.33, 19.8, 2.0], [9.76, 16.9, 3.0], [9.87, 23.4, 3.9], [10.28, 9.6, 3.4]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [7, 4], [2, 7]] },
  vir: { stars: [[13.42, -11.2, 1.0], [12.7, -1.4, 2.7], [13.04, -0.6, 3.6], [13.57, -1.5, 3.6], [12.93, 3.4, 3.6], [13.03, 10.9, 2.8], [14.0, 10.3, 3.6]], lines: [[0, 1], [1, 3], [3, 4], [4, 5], [1, 2], [2, 5], [5, 6], [3, 6]] },
  lib: { stars: [[14.85, -16.0, 2.8], [15.28, -9.4, 2.6], [15.59, -14.8, 3.9], [14.97, -25.3, 3.3]], lines: [[0, 2], [0, 3], [2, 1], [0, 1]] },
  sco: { stars: [[16.49, -26.4, 1.0], [16.09, -19.8, 2.6], [15.98, -22.6, 2.9], [15.8, -26.1, 2.9], [16.35, -28.2, 2.9], [16.6, -28.1, 3.6], [17.54, -37.2, 1.6], [17.51, -37.3, 2.7], [16.9, -34.3, 3.6], [17.2, -32.3, 3.3], [17.71, -43.0, 3.9], [17.68, -31.6, 3.9]], lines: [[3, 2], [2, 1], [1, 0], [0, 4], [4, 5], [5, 8], [8, 9], [9, 6], [9, 7], [8, 10], [5, 11]] },
  sgr: { stars: [[18.1, -30.4, 3.0], [18.35, -29.8, 2.7], [18.4, -34.4, 1.85], [18.47, -25.4, 2.8], [18.9, -26.3, 2.1], [19.04, -29.9, 2.6], [18.76, -27.0, 3.2], [19.1, -27.7, 3.3]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 5], [6, 0]] },
  cap: { stars: [[20.3, -12.5, 3.6], [20.3, -18.6, 3.7], [21.05, -16.7, 2.9], [21.67, -16.7, 3.7], [20.78, -26.9, 4.1], [21.1, -17.2, 4.1], [20.72, -18.2, 4.3]], lines: [[0, 1], [1, 6], [6, 4], [4, 2], [2, 3], [3, 5], [5, 1]] },
  aqu: { stars: [[22.1, -0.3, 3.0], [21.53, -5.6, 2.9], [22.09, -1.4, 3.8], [22.48, 0.0, 3.6], [22.32, -7.6, 4.0], [22.88, -15.8, 3.8], [20.79, -15.5, 3.6]], lines: [[0, 1], [0, 2], [2, 3], [2, 4], [4, 5], [1, 6]] },
  pis: { stars: [[23.0, 6.8, 4.0], [23.28, 3.5, 3.7], [23.99, 7.6, 4.7], [23.7, 1.8, 4.3], [23.64, 5.6, 4.1], [23.47, 6.4, 4.3], [2.03, 2.8, 3.8], [1.68, 16.1, 4.3], [1.87, 20.1, 4.4], [1.19, 8.1, 4.3]], lines: [[0, 1], [1, 3], [3, 5], [5, 4], [4, 2], [2, 0], [3, 7], [7, 6], [6, 8], [8, 9]] },
};

/* 星等 → 显示半径(星等越小越亮越大) */
function starR(mag) { return Math.max(1.1, 4.3 - mag * 0.72); }

/* 投影:星座内赤经范围左右翻转(天文图习惯东在左),适配画布 */
/* 全名 id(horoscope.js SIGNS 约定)→ 本表缩写键 的别名映射。
   调用方两套约定并存('aries' vs 'ari'),统一在此兼容,查不到再返回 null。 */
const SIGN_ALIAS = {
  aries: 'ari', taurus: 'tau', gemini: 'gem', cancer: 'cnc', leo: 'leo', virgo: 'vir',
  libra: 'lib', scorpio: 'sco', sagittarius: 'sgr', capricorn: 'cap', aquarius: 'aqu', pisces: 'pis',
};

function project(signId, size) {
  const d = ZODIAC_STARS[signId] || ZODIAC_STARS[SIGN_ALIAS[signId]];
  if (!d) return null;
  const ras = d.stars.map(s => s[0]), decs = d.stars.map(s => s[1]);
  const raMin = Math.min(...ras) - 0.35, raMax = Math.max(...ras) + 0.35;
  const decMin = Math.min(...decs) - 5, decMax = Math.max(...decs) + 5;
  const pad = size * 0.14, inner = size - pad * 2;
  const pts = d.stars.map(([ra, dec]) => {
    const x = pad + ((raMax - ra) / (raMax - raMin)) * inner;
    const y = pad + ((decMax - dec) / (decMax - decMin)) * inner;
    return [x, y];
  });
  return { d, pts };
}

/* —— SVG 出口 —— */
export function zodiacArtSVG(signId, opts = {}) {
  const proj = project(signId, opts.size || 120);
  if (!proj) return '';
  const { d, pts } = proj;
  const star = opts.starColor || opts.star || '#ffffff';
  const line = opts.lineColor || opts.line || 'rgba(230,195,126,0.8)';
  const bg = opts.bg || 'none';
  const lines = d.lines.filter(([a, b]) => pts[a] && pts[b]).map(([a, b]) => {
    const A = pts[a], B = pts[b];
    return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${line}" stroke-width="1.1" stroke-linecap="round"/>`;
  }).join('');
  const stars = pts.map((p, i) => {
    const r = starR(d.stars[i][2]);
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${star}"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(r * 2.1).toFixed(1)}" fill="${star}" opacity="0.16"/>`;
  }).join('');
  const size = opts.size || 120;
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    (bg !== 'none' ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '') +
    lines + stars + `</svg>`;
}

/* —— Canvas 出口(3D 环带贴图用) —— */
export function drawZodiacArt(g, signId, cx, cy, size, starColor = '#ffffff', lineColor = 'rgba(230,195,126,0.85)') {
  const proj = project(signId, size);
  if (!proj) return;
  const { d, pts } = proj;
  g.save();
  g.strokeStyle = lineColor;
  g.lineWidth = Math.max(1.2, size * 0.012);
  g.lineCap = 'round';
  for (const [a, b] of d.lines) {
    if (!pts[a] || !pts[b]) continue;
    g.beginPath();
    g.moveTo(cx - size / 2 + pts[a][0], cy - size / 2 + pts[a][1]);
    g.lineTo(cx - size / 2 + pts[b][0], cy - size / 2 + pts[b][1]);
    g.stroke();
  }
  pts.forEach((p, i) => {
    const r = starR(d.stars[i][2]) * (size / 120);
    const x = cx - size / 2 + p[0], y = cy - size / 2 + p[1];
    g.fillStyle = starColor;
    g.globalAlpha = 0.22;
    g.beginPath(); g.arc(x, y, r * 2.1, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  });
  g.restore();
}
