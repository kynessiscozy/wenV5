/* ============================================================
   long-report.js · 全景长报告生成与多渠道分享系统
   ------------------------------------------------------------
   支持「东方命理」与「西方星相」全景长图 Canvas 2x 超高清直出：
     1. 东方命理长报告：
        - 四柱干支八字全景大盘（十神、藏干、纳音、十二长生）
        - 五行能量占比与喜用忌神平衡
        - 核心入命神煞吉凶吉星
        - 心智全息性格五维画像
        - 大运、流年、流月与今日时空走势
        - 紫微、奇门、梅花三大流派精要与行动锦囊
     2. 西方星相长报告：
        - 太阳·月亮·上升三核黄金大卡
        - 十大星曜全景落座与十二宫位领域投射
        - 四象三态能量配比与六维人格潜能评估
        - 神圣几何相位网络（合相/三分相/六分相/四分相/对分相）
        - 毕达哥拉斯生命灵数主命数、九宫图阵激活优势连线
        - 9年生命周期流年密码与行动建议
     3. 多渠道导出：
        - 移动端原生系统分享 (navigator.share)
        - 剪贴板超清图片复制 (ClipboardItem)
        - 高清 PNG 图片直接下载
        - 浏览器免配置打印 / 导出 PDF
   ============================================================ */

import { showToast } from '../ui/toast.js';
import { getCtx } from '../state/context.js';
import { calcWesternChart, calcNumerology } from '../engines/western.js';
import { GW, ZW, WC } from '../engines/shared.js';
import { drawZodiacArt } from '../render/zodiac-art.js';
import { SIGNS, getSunSignByDate, getHoroscopeForecast } from '../tools2/horoscope.js';

const W = 840;      // 基准逻辑宽度（2x 输出为 1680px 高清画布）
const PAD = 48;     // 页面两侧安全内边距

/** 读取当前主题配色 */
function getThemePalette() {
  const dark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  if (dark) {
    return {
      isDark: true,
      bg: '#141210',
      bgCard: '#1d1916',
      bgCardAlt: '#25201c',
      text: '#f2ede4',
      text2: '#aba194',
      text3: '#7d7468',
      accent: '#d97757',
      accentSoft: 'rgba(217, 119, 87, 0.16)',
      accentBorder: 'rgba(217, 119, 87, 0.38)',
      gold: '#d4af37',
      goldSoft: 'rgba(212, 175, 55, 0.14)',
      line: 'rgba(242, 237, 228, 0.10)',
      lineLight: 'rgba(242, 237, 228, 0.05)',
      serif: '"Noto Serif SC", "Songti SC", "STSong", serif',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans SC", sans-serif'
    };
  }
  return {
    isDark: false,
    bg: '#faf9f5',
    bgCard: '#ffffff',
    bgCardAlt: '#f3f0e8',
    text: '#2c2520',
    text2: '#6e6459',
    text3: '#9e9386',
    accent: '#c96f3f',
    accentSoft: 'rgba(201, 111, 63, 0.10)',
    accentBorder: 'rgba(201, 111, 63, 0.28)',
    gold: '#b8860b',
    goldSoft: 'rgba(184, 134, 11, 0.10)',
    line: 'rgba(44, 37, 32, 0.10)',
    lineLight: 'rgba(44, 37, 32, 0.05)',
    serif: '"Noto Serif SC", "Songti SC", "STSong", serif',
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans SC", sans-serif'
  };
}

/** 绘制圆角矩形 */
function roundRect(ctx, x, y, w, h, r = 16) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y + w, x, y, r);
  ctx.closePath();
}

/** 文本自动折行 */
function wrapText(ctx, text, maxW) {
  const lines = [];
  let cur = '';
  for (const ch of String(text || '')) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
    if (ctx.measureText(cur + ch).width > maxW) {
      if (cur) lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ============================================================
   1. 东方命理全景长报告渲染器 (Eastern Full Report)
   ============================================================ */
/* ============================================================
   共享绘制件
   ============================================================ */
const NY60 = {
  '甲子': '海中金',
  '乙丑': '海中金',
  '丙寅': '炉中火',
  '丁卯': '炉中火',
  '戊辰': '大林木',
  '己巳': '大林木',
  '庚午': '路旁土',
  '辛未': '路旁土',
  '壬申': '剑锋金',
  '癸酉': '剑锋金',
  '甲戌': '山头火',
  '乙亥': '山头火',
  '丙子': '涧下水',
  '丁丑': '涧下水',
  '戊寅': '城头土',
  '己卯': '城头土',
  '庚辰': '白蜡金',
  '辛巳': '白蜡金',
  '壬午': '杨柳木',
  '癸未': '杨柳木',
  '甲申': '泉中水',
  '乙酉': '泉中水',
  '丙戌': '屋上土',
  '丁亥': '屋上土',
  '戊子': '霹雳火',
  '己丑': '霹雳火',
  '庚寅': '松柏木',
  '辛卯': '松柏木',
  '壬辰': '长流水',
  '癸巳': '长流水',
  '甲午': '沙中金',
  '乙未': '沙中金',
  '丙申': '山下火',
  '丁酉': '山下火',
  '戊戌': '平地木',
  '己亥': '平地木',
  '庚子': '壁上土',
  '辛丑': '壁上土',
  '壬寅': '金箔金',
  '癸卯': '金箔金',
  '甲辰': '覆灯火',
  '乙巳': '覆灯火',
  '丙午': '天河水',
  '丁未': '天河水',
  '戊申': '大驿土',
  '己酉': '大驿土',
  '庚戌': '钗钏金',
  '辛亥': '钗钏金',
  '壬子': '桑柘木',
  '癸丑': '桑柘木',
  '甲寅': '大溪水',
  '乙卯': '大溪水',
  '丙辰': '沙中土',
  '丁巳': '沙中土',
  '戊午': '天上火',
  '己未': '天上火',
  '庚申': '石榴木',
  '辛酉': '石榴木',
  '壬戌': '大海水',
  '癸亥': '大海水'
};

function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* 夜空报头:深蓝底 + 星点 + 金色品牌行 + 大标题(两模式统一视觉身份) */
function drawNightHeader(ctx, P, y, h, kicker, title, metaText, seed) {
  const navy1 = '#101a30', navy2 = '#0a0e1c';
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, navy1); grad.addColorStop(1, navy2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, W, h);

  const rnd = seededRand(seed);
  for (let i = 0; i < 70; i++) {
    const sx = rnd() * W, sy = y + rnd() * h, r = 0.8 + rnd() * 1.6;
    ctx.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.4})`;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = '#e6c37e';
  ctx.font = '700 22px ' + P.sans;
  ctx.fillText('✦ 问问大师 · V5.0', PAD, y + 40);
  ctx.fillStyle = '#9aa4c8';
  ctx.font = '500 19px ' + P.sans;
  const kick = kicker.toUpperCase();
  ctx.fillText(kick, W - PAD - ctx.measureText(kick).width, y + 40);

  ctx.fillStyle = '#f2ede4';
  ctx.font = '800 40px ' + P.serif;
  ctx.fillText(title, PAD, y + 96);

  ctx.fillStyle = '#cfd3e8';
  ctx.font = '400 21px ' + P.sans;
  ctx.fillText(metaText, PAD, y + 132);

  ctx.strokeStyle = 'rgba(217,179,106,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, y + h - 1); ctx.lineTo(W, y + h - 1); ctx.stroke();
}

/* 分区标题:金色编号 + 衬线标题 + 细线 */
function sectionHead(ctx, P, y, num, title) {
  ctx.fillStyle = '#b8860b';
  ctx.font = '700 22px ' + P.sans;
  ctx.fillText(num, PAD, y + 4);
  ctx.fillStyle = P.text;
  ctx.font = '700 27px ' + P.serif;
  ctx.fillText(title, PAD + 44, y + 4);
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD + 44, y + 18); ctx.lineTo(W - PAD, y + 18); ctx.stroke();
  return y + 44;
}

function drawChip(ctx, text, x, y, P) {
  ctx.font = '500 19px ' + P.sans;
  const w = ctx.measureText(text).width + 28;
  roundRect(ctx, x, y, w, 36, 18);
  ctx.fillStyle = P.accentSoft; ctx.fill();
  ctx.strokeStyle = P.accentBorder; ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, 36, 18); ctx.stroke();
  ctx.fillStyle = P.accent;
  ctx.fillText(text, x + 14, y + 25);
  return w;
}

function kvLine(ctx, P, label, value, x, y, valueColor) {
  ctx.fillStyle = P.text3;
  ctx.font = '500 19px ' + P.sans;
  ctx.fillText(label, x, y);
  ctx.fillStyle = valueColor || P.text;
  ctx.font = '600 21px ' + P.sans;
  ctx.fillText(value, x + 118, y);
}

/* ============================================================
   1. 东方命理全景长报告渲染器
   ============================================================ */
function drawEasternReport(ctx, d, P, dryRun = false) {
  const contentW = W - PAD * 2;
  let y = PAD;

  const b = d.b || { Y: { g: '甲', z: '子' }, M: { g: '丙', z: '寅' }, D: { g: '戊', z: '辰' }, H: { g: '壬', z: '子' } };
  const wx = d.wx || { Wood: 20, Fire: 25, Earth: 30, Metal: 15, Water: 10 };
  const ss = d.ss || {};
  const si = d.si || {};
  const shensha = d.shensha || [];
  const input = d.input || {};
  const gl = d.gl || '乾造';
  const cDy = d.cDy || { g: '庚', z: '午', startAge: 30, endAge: 39 };
  const cLn = d.cLn || { g: '甲', z: '辰' };
  const zw = d.zw || { name: '紫微天府' };
  const qm = d.qm || { name: '天辅星 · 生门' };
  const mh = d.mh || { name: '风火家人' };
  const dg = d.dg || '戊';
  const personaAll = d.P || {};
  const personaDims = [
    ['本我驱动', personaAll[dg]?.core || ''],
    ['事业倾向', personaAll[dg]?.career || ''],
    ['财富观念', personaAll[dg]?.money || ''],
    ['情感模式', personaAll[dg]?.love || ''],
    ['社交模式', personaAll[dg]?.social || '']
  ].filter(x => x[1]);

  /* ---- 夜空报头 ---- */
  const metaText = (input.by || 1995) + ' 年 ' + (input.bm || 6) + ' 月 ' + (input.bd || 15) + ' 日 · ' + (d.city?.n || '上海') + ' · ' + (input.timeStr || '12:00');
  drawNightHeader(ctx, P, y, 156, '东方命理 · 全景报告', '四柱八字与五行格局全览', metaText, 20260829);
  y += 156 + 26;

  /* ---- 信息胶囊 ---- */
  const capText = '【' + gl + '】 日主 ' + dg + (d.dw || '') + ' · 命格 ' + (d.pa?.name || '正财格') + ' · 用神 ' + (d.wx?.ys || '土');
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, 46, 23);
    ctx.fillStyle = P.accentSoft; ctx.fill();
    ctx.strokeStyle = P.accentBorder; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, 46, 23); ctx.stroke();
    ctx.fillStyle = P.accent;
    ctx.font = '600 21px ' + P.sans;
    ctx.fillText(capText, PAD + 20, y + 30);
  }
  y += 46 + 26;

  /* ---- 壹 · 四柱干支矩阵 ---- */
  y = sectionHead(ctx, P, y, '壹', '四柱干支矩阵');
  const matrixH = 236;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, matrixH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, matrixH, 18); ctx.stroke();

    const pillars = [
      { name: '年柱 · 根基', p: b.Y, ss: ss.yg, zc: ss.yzc },
      { name: '月柱 · 事业', p: b.M, ss: ss.mg, zc: ss.mzc },
      { name: '日柱 · 本我', p: b.D, ss: '日主', zc: ss.dzc, day: true },
      { name: '时柱 · 归宿', p: b.H, ss: ss.hg, zc: ss.hzc }
    ];
    const colW = (contentW - 30) / 4;
    pillars.forEach((p, idx) => {
      const px = PAD + 15 + idx * colW;
      const isDay = idx === 2;
      if (isDay) {
        roundRect(ctx, px + 4, y + 12, colW - 8, matrixH - 24, 14);
        ctx.fillStyle = P.accentSoft; ctx.fill();
        ctx.strokeStyle = P.accentBorder; ctx.lineWidth = 1.2;
        roundRect(ctx, px + 4, y + 12, colW - 8, matrixH - 24, 14); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = isDay ? P.accent : P.text3;
      ctx.font = '600 19px ' + P.sans;
      ctx.fillText(p.name, px + colW / 2, y + 38);
      ctx.fillStyle = isDay ? P.accent : P.text2;
      ctx.font = '500 20px ' + P.sans;
      ctx.fillText(p.ss || '—', px + colW / 2, y + 70);
      // 干支按五行着色
      const gc = WC[GW[p.p.g]] || P.text, zc = WC[ZW[p.p.z]] || P.text;
      ctx.font = '900 46px ' + P.serif;
      ctx.fillStyle = gc; ctx.fillText(p.p.g, px + colW / 2 - 26, y + 128);
      ctx.fillStyle = zc; ctx.fillText(p.p.z, px + colW / 2 + 26, y + 128);
      ctx.fillStyle = P.text2;
      ctx.font = '400 19px ' + P.sans;
      ctx.fillText('纳音 ' + (NY60[p.p.g + p.p.z] || '—'), px + colW / 2, y + 172);
      const zcTxt = (p.zc || []).map(x => x.g + (x.ss ? '·' + x.ss : '')).join(' ');
      ctx.fillStyle = P.text3;
      ctx.font = '400 16px ' + P.sans;
      ctx.fillText('藏干 ' + (zcTxt || '—'), px + colW / 2, y + 202);
      ctx.textAlign = 'left';
    });
  }
  y += matrixH + 14;

  /* —— 冲合刑害标签行 —— */
  const notes = shensha.map(x => x.t || x.n || x).filter(Boolean).slice(0, 4);
  let noteH = 64;
  for (const nt of notes) {
    ctx.font = '400 21px ' + P.sans;
    noteH += wrapText(ctx, '· ' + nt, contentW - 56).length * 33 + 8;
  }
  if (!dryRun && notes.length) {
    roundRect(ctx, PAD, y, contentW, noteH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, noteH, 18); ctx.stroke();
    let ny2 = y + 30;
    notes.forEach(nt => {
      const lines = wrapText(ctx, '· ' + nt, contentW - 56);
      lines.forEach(l => { ctx.fillStyle = P.text; ctx.font = '400 21px ' + P.sans; ctx.fillText(l, PAD + 28, ny2); ny2 += 33; });
      ny2 += 8;
    });
  }
  if (notes.length) y += noteH + 18;

  /* ---- 贰 · 五行能量 ---- */
  y = sectionHead(ctx, P, y, '贰', '五行能量与喜用调和');
  const wcMap = wx.c || {};
  const wTotal = ['木', '火', '土', '金', '水'].reduce((a, e) => a + (wcMap[e] || 0), 0) || 1;
  const elemItems = [
    { name: '木', pct: Math.round((wcMap['木'] || 0) / wTotal * 100), col: '#5c8d62' },
    { name: '火', pct: Math.round((wcMap['火'] || 0) / wTotal * 100), col: '#e05a47' },
    { name: '土', pct: Math.round((wcMap['土'] || 0) / wTotal * 100), col: '#c96f3f' },
    { name: '金', pct: Math.round((wcMap['金'] || 0) / wTotal * 100), col: '#c9a227' },
    { name: '水', pct: Math.round((wcMap['水'] || 0) / wTotal * 100), col: '#5e7fa2' },
  ];
  const wxCardH = 196;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, wxCardH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, wxCardH, 18); ctx.stroke();
    const barStartX = PAD + 28;
    const trackW = contentW - 200;
    elemItems.forEach((it, i) => {
      const by2 = y + 52 + i * 28;
      ctx.fillStyle = it.col;
      ctx.font = '700 20px ' + P.serif;
      ctx.fillText(it.name, barStartX, by2 + 1);
      const tx = barStartX + 46;
      roundRect(ctx, tx, by2 - 13, trackW, 15, 7);
      ctx.fillStyle = P.bgCardAlt; ctx.fill();
      roundRect(ctx, tx, by2 - 13, Math.max(10, trackW * (it.pct / 100)), 15, 7);
      ctx.fillStyle = it.col; ctx.fill();
      ctx.fillStyle = P.text;
      ctx.font = '700 19px ' + P.sans;
      ctx.fillText(it.pct + '%', tx + trackW + 18, by2 + 1);
    });
    if (d.wx?.ys) {
      ctx.fillStyle = P.text2;
      ctx.font = '400 18px ' + P.sans;
      ctx.fillText('用神 ' + d.wx.ys + ' · 喜神 ' + (d.wx.xs || '—') + ' · 以平衡日主强弱为准', PAD + 28, y + wxCardH - 16);
    }
  }
  y += wxCardH + 20;

  /* ---- 叁 · 心智画像 ---- */
  y = sectionHead(ctx, P, y, '叁', '心智画像与行为倾向');
  const personaKeys = personaDims;
  let personaH = 16;
  for (const [k, v] of personaKeys) {
    ctx.font = '400 22px ' + P.sans;
    const lines = wrapText(ctx, v, contentW - 190);
    personaH += Math.max(40, lines.length * 33) + 14;
  }
  personaH += 8;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, personaH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, personaH, 18); ctx.stroke();
    let py2 = y + 30;
    for (const [k, v] of personaKeys) {
      ctx.fillStyle = P.accent;
      ctx.font = '700 21px ' + P.sans;
      ctx.fillText(k, PAD + 26, py2);
      ctx.fillStyle = P.text;
      ctx.font = '400 22px ' + P.sans;
      const lines = wrapText(ctx, v, contentW - 190);
      let ly2 = py2;
      lines.forEach(l => { ctx.fillText(l, PAD + 120, ly2); ly2 += 33; });
      py2 = Math.max(py2 + 40, ly2) + 12;
    }
  }
  y += personaH + 20;

  /* ---- 肆 · 周期走势与三大流派 ---- */
  y = sectionHead(ctx, P, y, '肆', '周期走势与三大流派');
  const timelineH = 252;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, timelineH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, timelineH, 18); ctx.stroke();

    const halfW = (contentW - 72) / 2;
    const colW2 = halfW - 12;
    // 左栏:大运流年
    ctx.fillStyle = P.accent;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('当前时空坐标', PAD + 28, y + 42);
    const leftLines = [
      ['十年大运', cDy.g + cDy.z + ' (' + (cDy.startAge || 30) + '~' + (cDy.endAge || 39) + '岁)'],
      ['今年流年', cLn.g + cLn.z + ' · ' + (d.cLnSS || '太岁气场')],
      ['事业评分', String(d.cs || '—') + ' 分'], ['财富评分', String(d.ws || '—') + ' 分'], ['爱情评分', String(d.ls || '—') + ' 分']
    ];
    let ly = y + 80;
    leftLines.forEach(([lb, v]) => { kvLine(ctx, P, lb, v, PAD + 28, ly); ly += 36; });
    // 右栏:三大流派
    const rx = PAD + 44 + halfW;
    ctx.fillStyle = '#b8860b';
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('三大流派精要', rx, y + 42);
    const rightLines = [
      ['紫微斗数', zw.name || '紫微天府'],
      ['奇门遁甲', qm.name || '天辅生门'],
      ['梅花易数', mh.name || '风火家人']
    ];
    ly = y + 80;
    rightLines.forEach(([lb, v]) => {
      ctx.fillStyle = P.text3; ctx.font = '500 19px ' + P.sans;
      ctx.fillText(lb, rx, ly);
      const vl = wrapText(ctx, v, colW2 - 110);
      ctx.fillStyle = P.text; ctx.font = '600 20px ' + P.sans;
      vl.forEach((l2, i2) => ctx.fillText(l2, rx + 104, ly + i2 * 28));
      ly += Math.max(36, vl.length * 28);
    });
  }
  y += timelineH + 26;

  /* ---- 落款 ---- */
  if (!dryRun) {
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 26;
    ctx.fillStyle = P.text3;
    ctx.font = '400 19px ' + P.sans;
    ctx.fillText('✦ 问问大师 V5.0 · 报告仅供自我探索与生活参考', PAD, y);
    const gen = '生成于 ' + new Date().toLocaleString('zh-CN');
    ctx.fillText(gen, W - PAD - ctx.measureText(gen).width, y);
  }
  y += 52;
  return y;
}

function dwFix(dw) { return dw || ''; }

/* ============================================================
   2. 西方星相全景长报告渲染器 (真 3D 同源数据 + 星座星图带)
   ============================================================ */
function drawWesternReport(ctx, d, P, dryRun = false) {
  const contentW = W - PAD * 2;
  let y = PAD;

  const input = d.input || {};
  const by = input.by || 1995, bm = input.bm || 6, bd = input.bd || 15;
  const timeStr = input.timeStr || '12:00';
  const [h, min] = timeStr.split(':').map(Number);
  const city = d.city || { o: 116.4, a: 39.9, n: '北京' };

  const chart = calcWesternChart(by, bm, bd, h || 12, min || 0, city.o, city.a);
  const sun = chart.sun;
  const moon = chart.moon;
  const asc = chart.asc;
  const num = calcNumerology(by, bm, bd);
  const fToday = getHoroscopeForecast(sun, 'today');

  /* ---- 夜空报头 ---- */
  const metaText = by + ' 年 ' + bm + ' 月 ' + bd + ' 日 · ' + city.n + ' · ' + timeStr;
  drawNightHeader(ctx, P, y, 156, '西方星象 · 全景报告', '本命星盘 · 黄道十二宫与生命灵数', metaText, 20260915);
  y += 156 + 24;

  /* —— 十二星座真实星图带 —— */
  const stripIds = ['ari', 'tau', 'gem', 'cnc', 'leo', 'vir', 'lib', 'sco', 'sgr', 'cap', 'aqu', 'pis'];
  const ZNAMES = { ari: '白羊', tau: '金牛', gem: '双子', cnc: '巨蟹', leo: '狮子', vir: '处女', lib: '天秤', sco: '天蝎', sgr: '射手', cap: '摩羯', aqu: '水瓶', pis: '双鱼' };
  const stripH = 118;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, stripH, 16);
    ctx.fillStyle = '#0a0e1c'; ctx.fill();
    ctx.strokeStyle = 'rgba(217,179,106,0.4)'; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, stripH, 16); ctx.stroke();
    const cw = contentW / 12;
    stripIds.forEach((sid, i) => {
      drawZodiacArt(ctx, sid, PAD + cw * i + cw / 2, y + stripH / 2 - 8, cw * 0.78, '#ffffff', 'rgba(230,195,126,0.8)');
      ctx.fillStyle = '#e6c37e';
      ctx.font = '500 15px ' + P.sans;
      ctx.textAlign = 'center';
      ctx.fillText(ZNAMES[sid], PAD + cw * i + cw / 2, y + stripH - 12);
      ctx.textAlign = 'left';
    });
  }
  y += stripH + 22;

  /* ---- 壹 · 三核本我 ---- */
  y = sectionHead(ctx, P, y, '壹', '三核本我 · 人格三支柱');
  const trioH = 250;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, trioH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, trioH, 18); ctx.stroke();
    const trio = [
      { k: '太阳 · 本我驱动', s: sun, c: '#c96f3f', d: '核心英雄之旅与意志驱动' },
      { k: '月亮 · 内心情感', s: moon, c: '#5e7fa2', d: '潜意识、安全感与情绪需求' },
      { k: '上升 · 第一名片', s: asc, c: '#b5838d', d: '呈现给世界的面具与第一反应' }
    ];
    const colW = (contentW - 40) / 3;
    trio.forEach((t, i) => {
      const px = PAD + 14 + i * (colW + 6);
      if (i === 0) {
        roundRect(ctx, px, y + 14, colW - 8, trioH - 28, 14);
        ctx.fillStyle = P.accentSoft; ctx.fill();
        ctx.strokeStyle = P.accentBorder; ctx.lineWidth = 1.2;
        roundRect(ctx, px, y + 14, colW - 8, trioH - 28, 14); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = t.c;
      ctx.font = '700 19px ' + P.sans;
      ctx.fillText(t.k, px + colW / 2, y + 46);
      ctx.fillStyle = P.text;
      ctx.font = '800 34px ' + P.serif;
      ctx.fillText(t.s.name, px + colW / 2, y + 92);
      ctx.fillStyle = P.text2;
      ctx.font = '400 18px ' + P.sans;
      ctx.fillText(t.s.elem + '象 · ' + t.s.mode, px + colW / 2, y + 126);
      ctx.textAlign = 'left';
      const lines = wrapText(ctx, t.d + '。' + (t.s.summary || ''), colW - 44);
      let ly = y + 158;
      lines.slice(0, 4).forEach(l => { ctx.fillText(l, px + 22, ly); ly += 28; });
    });
  }
  y += trioH + 20;

  /* ---- 贰 · 十大星曜 ---- */
  y = sectionHead(ctx, P, y, '贰', '十大星曜落座与宫位');
  const gridH = 240;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, gridH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, gridH, 18); ctx.stroke();
    const planets = chart.planets || [];
    const colW = contentW / 5, rowH = gridH / 2;
    planets.slice(0, 10).forEach((pl, i) => {
      const cx = PAD + (i % 5) * colW + 24;
      const cy = y + 52 + Math.floor(i / 5) * rowH;
      ctx.fillStyle = P.accent;
      ctx.font = '700 19px ' + P.sans;
      ctx.fillText(pl.zh || pl.key, cx, cy);
      ctx.fillStyle = P.text;
      ctx.font = '600 21px ' + P.serif;
      ctx.fillText(pl.sign?.name || pl.sign, cx, cy + 32);
      ctx.fillStyle = P.text2;
      ctx.font = '400 18px ' + P.sans;
      ctx.fillText((pl.house ? '第' + pl.house + '宫' : '') + ' · ' + (pl.degree || ''), cx, cy + 60);
    });
  }
  y += gridH + 20;

  /* ---- 叁 · 四象能量与六维潜能 ---- */
  y = sectionHead(ctx, P, y, '叁', '四象能量与六维潜能');
  const quadH = 230;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, quadH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, quadH, 18); ctx.stroke();
    const halfW = (contentW - 72) / 2;
    // 左:四象条形
    const elems = chart.elemBreakdown || chart.elements || [];
    const elArr = Array.isArray(elems) ? elems : [];
    const items = (elArr.length ? elArr : [
      { name: '火象', pct: 25, col: '#e05a47' }, { name: '土象', pct: 25, col: '#5c8d62' },
      { name: '风象', pct: 27, col: '#c9a227' }, { name: '水象', pct: 23, col: '#5e7fa2' }
    ]).slice(0, 4);
    ctx.fillStyle = P.accent;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('四象能量配比', PAD + 28, y + 46);
    items.forEach((it, i) => {
      const by2 = y + 84 + i * 30;
      ctx.fillStyle = it.col || P.text2;
      ctx.font = '700 19px ' + P.serif;
      ctx.fillText(it.name || it.elem || '—', PAD + 28, by2 + 1);
      const tx = PAD + 118, tw = halfW - 130;
      roundRect(ctx, tx, by2 - 13, tw, 15, 7);
      ctx.fillStyle = P.bgCardAlt; ctx.fill();
      roundRect(ctx, tx, by2 - 13, Math.max(10, tw * ((it.pct || it.value || 25) / 100)), 15, 7);
      ctx.fillStyle = it.col || P.accent; ctx.fill();
      ctx.fillStyle = P.text;
      ctx.font = '700 19px ' + P.sans;
      ctx.fillText((it.pct || it.value || 25) + '%', tx + tw + 14, by2 + 1);
    });
    // 右:六维
    const rx = PAD + 60 + halfW;
    ctx.fillStyle = P.accent;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('六维人格天赋', rx, y + 46);
    const dims = (chart.dimensions || d.dimensions || [
      { name: '行动力', v: 82 }, { name: '逻辑力', v: 86 }, { name: '洞察力', v: 88 },
      { name: '同理心', v: 75 }, { name: '创造力', v: 95 }, { name: '坚韧度', v: 68 }
    ]).slice(0, 6);
    dims.forEach((dm, i) => {
      const dx = rx + (i % 3) * (halfW / 3);
      const dy = y + 92 + Math.floor(i / 3) * 56;
      ctx.fillStyle = P.text3;
      ctx.font = '400 17px ' + P.sans;
      ctx.fillText(dm.name || dm.k || '', dx, dy);
      ctx.fillStyle = P.accent;
      ctx.font = '800 30px ' + P.serif;
      ctx.fillText((dm.v || dm.score || 0) + '', dx, dy + 32);
    });
  }
  y += quadH + 20;

  /* ---- 肆 · 生命灵数 ---- */
  y = sectionHead(ctx, P, y, '肆', '生命灵数与流年密码');
  const numH = 190;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, numH, 18);
    ctx.fillStyle = P.bgCard; ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, numH, 18); ctx.stroke();
    ctx.fillStyle = P.accent;
    ctx.font = '800 84px ' + P.serif;
    ctx.fillText(String(num.lifePath), PAD + 30, y + 118);
    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText((num.archetype?.name || '') + ' · 核心原型', PAD + 150, y + 62);
    ctx.fillStyle = P.text2;
    ctx.font = '400 20px ' + P.sans;
    ctx.fillText('天赋数 ' + (num.talent || '—') + ' ｜ 生日数 ' + (num.bday || '—') + ' ｜ ' + (num.archetype?.tag || ''), PAD + 150, y + 96);
    const lines = wrapText(ctx, '9 年周期流年 · 第 ' + (num.personalYear || num.cycleYear || 1) + ' 年:稳中求进,把长期目标拆解为可落地的阶段计划。', contentW - 60);
    let ly = y + 136;
    lines.forEach(l => { ctx.fillText(l, PAD + 30, ly); ly += 30; });
  }
  y += numH + 26;

  /* ---- 落款 ---- */
  if (!dryRun) {
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 26;
    ctx.fillStyle = P.text3;
    ctx.font = '400 19px ' + P.sans;
    ctx.fillText('✦ 问问大师 V5.0 · 报告仅供心理探索参考', PAD, y);
    const gen = '生成于 ' + new Date().toLocaleString('zh-CN');
    ctx.fillText(gen, W - PAD - ctx.measureText(gen).width, y);
  }
  y += 52;
  return y;
}
export function renderLongReportCanvas(ctxData, customMode = null) {
  const mode = customMode || (typeof document !== 'undefined' && document.body.getAttribute('data-system-mode') === 'western' ? 'western' : 'eastern');
  const P = getThemePalette();

  // 创建测量 canvas 测算总高度 (Dry run)
  const measureCv = document.createElement('canvas');
  measureCv.width = W;
  measureCv.height = 1000;
  const mCtx = measureCv.getContext('2d');

  const totalH = mode === 'western'
    ? drawWesternReport(mCtx, ctxData, P, true)
    : drawEasternReport(mCtx, ctxData, P, true);

  // 实际 2x 超清画布
  const cv = document.createElement('canvas');
  cv.width = W * 2;
  cv.height = Math.ceil(totalH * 2);
  const ctx = cv.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 0, 0);

  // 背景填充与柔和顶光
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, totalH);

  const grad = ctx.createRadialGradient(W * 0.8, -80, 20, W * 0.8, -80, 500);
  grad.addColorStop(0, P.accentSoft);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 420);

  // 正式绘制内容
  if (mode === 'western') {
    drawWesternReport(ctx, ctxData, P, false);
  } else {
    drawEasternReport(ctx, ctxData, P, false);
  }

  return cv;
}

/* ============================================================
   4. 导出与分享交互核心 (Save, Copy, Print)
   ============================================================ */
export async function exportFullReportImage(canvas, filename = '问问大师_全景长报告') {
  let blob = null;
  try {
    blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  } catch (_) {}
  if (!blob) {
    showToast('生成图片失败，请重试');
    return;
  }

  // 1) 优先调用系统原生分享 (支持微信/相册直达)
  try {
    const file = new File([blob], filename + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '问问大师 · 全景长报告' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }

  // 2) 写入剪贴板图片
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('长报告已复制为高清图片，可直接粘贴分享');
      return;
    }
  } catch (_) {}

  // 3) 下载兜底
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('高清长报告已下载');
}

export async function copyFullReportImage(canvas) {
  try {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (blob && navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('✓ 长报告已成功复制到剪贴板');
      return;
    }
  } catch (_) {}
  showToast('剪贴板暂不支持直接写入图片，已为您开启下载');
  exportFullReportImage(canvas);
}

export function printFullReport() {
  window.print();
}

/* ============================================================
   5. 全景长报告弹窗 UI 交互 (Modal & Live Preview)
   ============================================================ */
let currentShareMode = null;

export function openFullReportShare(customMode = null) {
  const ctxData = getCtx() || {
    input: { by: 1995, bm: 6, bd: 15, timeStr: '12:00' },
    city: { n: '上海', o: 121.47, a: 31.23 },
    gl: '乾造'
  };

  const sysMode = customMode || (document.body.getAttribute('data-system-mode') === 'western' ? 'western' : 'eastern');
  currentShareMode = sysMode;

  let modal = document.getElementById('fullReportShareModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fullReportShareModal';
    modal.className = 'fr-share-modal';
    modal.innerHTML = `
      <div class="fr-share-backdrop" onclick="closeFullReportShare()"></div>
      <div class="fr-share-sheet" role="dialog" aria-label="全景长报告分享">
        <div class="fr-share-hd">
          <div class="fr-share-title-wrap">
            <h3 class="fr-share-title">✦ 全景长报告导出与分享</h3>
            <p class="fr-share-sub">2x 超高清矢量长图直出 ｜ 支持东方命理与西方星相</p>
          </div>
          <button class="fr-share-close" onclick="closeFullReportShare()" aria-label="关闭">×</button>
        </div>

        <!-- 模式切换 Capsule -->
        <div class="fr-share-mode-toggle">
          <button type="button" class="fr-mode-btn" id="frModeEastern" onclick="switchFullReportShareMode('eastern')">✦ 东方命理长报告</button>
          <button type="button" class="fr-mode-btn" id="frModeWestern" onclick="switchFullReportShareMode('western')">✦ 西方星相长报告</button>
        </div>

        <!-- 预览区 -->
        <div class="fr-share-preview-box" id="frSharePreviewBox">
          <div class="fr-loading-tip">正在绘制超高清全景长图…</div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="fr-share-actions">
          <button type="button" class="fr-act-btn primary" id="frBtnDownload">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 16v4a2 2 0 002 2h12a2 2 0 002-2v-4M12 4v12m-4-4l4 4 4-4"/></svg>
            保存高清长图
          </button>
          <button type="button" class="fr-act-btn secondary" id="frBtnCopy">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            复制长图
          </button>
          <button type="button" class="fr-act-btn ghost" id="frBtnPrint">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            打印/PDF
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 激活 Modal
  modal.classList.add('open');
  renderShareModalContent(ctxData, sysMode);
}

export function closeFullReportShare() {
  const modal = document.getElementById('fullReportShareModal');
  if (modal) modal.classList.remove('open');
}

export function switchFullReportShareMode(mode) {
  currentShareMode = mode;
  const ctxData = getCtx();
  renderShareModalContent(ctxData, mode);
}

function renderShareModalContent(ctxData, mode) {
  const modal = document.getElementById('fullReportShareModal');
  if (!modal) return;

  const btnE = modal.querySelector('#frModeEastern');
  const btnW = modal.querySelector('#frModeWestern');
  if (btnE && btnW) {
    btnE.classList.toggle('active', mode === 'eastern');
    btnW.classList.toggle('active', mode === 'western');
  }

  const box = modal.querySelector('#frSharePreviewBox');
  if (!box) return;

  box.innerHTML = '<div class="fr-loading-tip">正在绘制超高清全景长图…</div>';

  setTimeout(() => {
    try {
      const cv = renderLongReportCanvas(ctxData, mode);
      const imgDataUrl = cv.toDataURL('image/png');

      box.innerHTML = `<img src="${imgDataUrl}" alt="问问大师全景长报告" class="fr-preview-img" style="width:100%;max-width:480px;height:auto;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.18);display:block;margin:0 auto;"/>`;

      // 绑定按钮事件
      const btnDl = modal.querySelector('#frBtnDownload');
      const btnCp = modal.querySelector('#frBtnCopy');
      const btnPr = modal.querySelector('#frBtnPrint');

      const filename = `问问大师_${mode === 'western' ? '西方星相' : '东方命理'}_全景长报告`;

      if (btnDl) btnDl.onclick = () => exportFullReportImage(cv, filename);
      if (btnCp) btnCp.onclick = () => copyFullReportImage(cv);
      if (btnPr) btnPr.onclick = () => printFullReport();
    } catch (err) {
      console.error('Render long report error', err);
      box.innerHTML = '<div class="fr-loading-tip" style="color:var(--c-accent)">绘制报告失败，请检查出生信息后重试</div>';
    }
  }, 40);
}
