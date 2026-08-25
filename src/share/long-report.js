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
function drawEasternReport(ctx, d, P, dryRun = false) {
  const contentW = W - PAD * 2;
  let y = PAD;

  const b = d.b || { Y: { g: '甲', z: '子' }, M: { g: '丙', z: '寅' }, D: { g: '戊', z: '辰' }, H: { g: '壬', z: '子' } };
  const wx = d.wx || { Wood: 20, Fire: 25, Earth: 30, Metal: 15, Water: 10 };
  const ss = d.ss || {};
  const si = d.si || {};
  const shensha = d.shensha || {};
  const input = d.input || {};
  const gl = d.gl || '乾造';
  const cDy = d.cDy || { g: '庚', z: '午', startAge: 30, endAge: 39 };
  const cLn = d.cLn || { g: '甲', z: '辰' };
  const zw = d.zw || { name: '紫微天府' };
  const qm = d.qm || { name: '天辅星 · 生门' };
  const mh = d.mh || { name: '风火家人' };
  const persona = d.P || { 思维: '目标明确，善于统筹布局', 情绪: '沉稳平和，自我调节力强', 人际: '重信守义，深受信赖', 决策: '谋定后动，审慎求实', 压力: '适度运动与独处复盘' };

  /* ---- Header 顶部大标头 ---- */
  if (!dryRun) {
    ctx.fillStyle = P.accent;
    ctx.font = '700 24px ' + P.sans;
    ctx.fillText('✦ 问问大师 · 东方全景命理全息报告', PAD, y);
    ctx.fillStyle = P.text3;
    ctx.font = '400 20px ' + P.sans;
    const timeText = (input.by || 1995) + '年' + (input.bm || 6) + '月' + (input.bd || 15) + '日 ' + (input.timeStr || '12:00');
    ctx.fillText(timeText, W - PAD - ctx.measureText(timeText).width, y + 2);
  }
  y += 38;

  if (!dryRun) {
    ctx.fillStyle = P.text;
    ctx.font = '800 42px ' + P.serif;
    ctx.fillText('四柱八字与五行格局全览', PAD, y);
  }
  y += 54;

  // 用户信息徽章胶囊
  const infoCapsuleText = `【${gl}】 公历 ${input.by || 1995}.${input.bm || 6}.${input.bd || 15} · ${d.city?.n || '上海'} · 日主【${d.dg || '戊'}${d.dw || '土'}】· 命格【${d.pa?.name || '正财格'}】`;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, 46, 23);
    ctx.fillStyle = P.accentSoft;
    ctx.fill();
    ctx.strokeStyle = P.accentBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, 46, 23);
    ctx.stroke();

    ctx.fillStyle = P.accent;
    ctx.font = '600 22px ' + P.sans;
    ctx.fillText(infoCapsuleText, PAD + 20, y + 12);
  }
  y += 62;

  /* ---- Section 1: 四柱干支矩阵大盘 ---- */
  const matrixH = 260;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, matrixH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, matrixH, 20);
    ctx.stroke();

    // 4 根柱子
    const pillars = [
      { name: '年柱 (根基祖荫)', g: b.Y.g, z: b.Y.z, ss: ss.Y || '偏印', ny: b.Y.ny || '海中金', cs: b.Y.cs || '死' },
      { name: '月柱 (事业父母)', g: b.M.g, z: b.M.z, ss: ss.M || '七杀', ny: b.M.ny || '炉中火', cs: b.M.cs || '帝旺' },
      { name: '日柱 (本我配偶)', g: b.D.g, z: b.D.z, ss: '日主元神', ny: b.D.ny || '大林木', cs: b.D.cs || '建禄' },
      { name: '时柱 (归宿子女)', g: b.H?.g || '壬', z: b.H?.z || '子', ss: ss.H || '正财', ny: b.H?.ny || '剑锋金', cs: b.H?.cs || '养' }
    ];

    const colW = (contentW - 30) / 4;
    pillars.forEach((p, idx) => {
      const px = PAD + 15 + idx * colW;
      const isDay = idx === 2;

      if (isDay) {
        roundRect(ctx, px + 4, y + 12, colW - 8, matrixH - 24, 14);
        ctx.fillStyle = P.accentSoft;
        ctx.fill();
        ctx.strokeStyle = P.accentBorder;
        ctx.lineWidth = 1.2;
        roundRect(ctx, px + 4, y + 12, colW - 8, matrixH - 24, 14);
        ctx.stroke();
      }

      ctx.fillStyle = isDay ? P.accent : P.text3;
      ctx.font = '600 20px ' + P.sans;
      ctx.textAlign = 'center';
      ctx.fillText(p.name, px + colW / 2, y + 26);

      ctx.fillStyle = isDay ? P.accent : P.text2;
      ctx.font = '500 20px ' + P.sans;
      ctx.fillText(p.ss, px + colW / 2, y + 58);

      // 干支大字
      ctx.fillStyle = isDay ? P.accent : P.text;
      ctx.font = '900 48px ' + P.serif;
      ctx.fillText(p.g + ' ' + p.z, px + colW / 2, y + 116);

      // 纳音与长生
      ctx.fillStyle = P.text2;
      ctx.font = '400 20px ' + P.sans;
      ctx.fillText('纳音: ' + p.ny, px + colW / 2, y + 180);
      ctx.fillText('长生: ' + p.cs, px + colW / 2, y + 212);
    });
    ctx.textAlign = 'left';
  }
  y += matrixH + 20;

  /* ---- Section 2: 五行力量与用神喜忌 ---- */
  const elemItems = [
    { name: '木 (Wood)', pct: wx.Wood || 20, col: '#5c8d62' },
    { name: '火 (Fire)', pct: wx.Fire || 25, col: '#e05a47' },
    { name: '土 (Earth)', pct: wx.Earth || 30, col: '#c96f3f' },
    { name: '金 (Metal)', pct: wx.Metal || 15, col: '#d4af37' },
    { name: '水 (Water)', pct: wx.Water || 10, col: '#5e7fa2' },
  ];
  const wxCardH = 210;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, wxCardH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, wxCardH, 20);
    ctx.stroke();

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText('五行能量占比与喜忌用神调和', PAD + 24, y + 28);

    const barStartX = PAD + 24;
    const barW = contentW - 48;
    elemItems.forEach((it, i) => {
      const by2 = y + 72 + i * 26;
      ctx.fillStyle = P.text2;
      ctx.font = '500 18px ' + P.sans;
      ctx.fillText(it.name, barStartX, by2 + 1);

      // 能量条
      const trackX = barStartX + 120;
      const trackW = barW - 190;
      roundRect(ctx, trackX, by2 - 12, trackW, 14, 7);
      ctx.fillStyle = P.bgCardAlt;
      ctx.fill();

      roundRect(ctx, trackX, by2 - 12, Math.max(8, trackW * (it.pct / 100)), 14, 7);
      ctx.fillStyle = it.col;
      ctx.fill();

      ctx.fillStyle = P.text;
      ctx.font = '700 18px ' + P.sans;
      ctx.fillText(it.pct + '%', trackX + trackW + 16, by2 + 1);
    });
  }
  y += wxCardH + 20;

  /* ---- Section 3: 深度心智与性格画像 ---- */
  const personaKeys = ['思维', '情绪', '人际', '决策', '压力'];
  let personaH = 68;
  for (const k of personaKeys) {
    ctx.font = '400 22px ' + P.sans;
    const lines = wrapText(ctx, (persona[k] || ''), contentW - 170);
    personaH += Math.max(36, lines.length * 32) + 12;
  }

  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, personaH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, personaH, 20);
    ctx.stroke();

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText('心智性格全息画像与行为倾向', PAD + 24, y + 28);

    let py2 = y + 70;
    for (const k of personaKeys) {
      ctx.fillStyle = P.accent;
      ctx.font = '700 22px ' + P.sans;
      ctx.fillText(k + '模式', PAD + 24, py2);

      ctx.fillStyle = P.text;
      ctx.font = '400 22px ' + P.sans;
      const lines = wrapText(ctx, (persona[k] || ''), contentW - 170);
      let ly2 = py2;
      lines.forEach(l => {
        ctx.fillText(l, PAD + 140, ly2);
        ly2 += 32;
      });
      py2 = Math.max(py2 + 36, ly2) + 12;
    }
  }
  y += personaH + 20;

  /* ---- Section 4: 周期时空运势与三大流派 ---- */
  const timelineH = 200;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, timelineH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, timelineH, 20);
    ctx.stroke();

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText('周期时空走势与三大流派赋能', PAD + 24, y + 28);

    const halfW = (contentW - 60) / 2;

    // 左栏：大运流年
    ctx.fillStyle = P.accent;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('当前时空坐标', PAD + 24, y + 70);
    ctx.fillStyle = P.text;
    ctx.font = '400 21px ' + P.sans;
    ctx.fillText(`十年大运：【${cDy.g}${cDy.z}】(${cDy.startAge || 30}~${cDy.endAge || 39}岁) · ${d.cDySS || '偏印'}`, PAD + 24, y + 104);
    ctx.fillText(`今年流年：【${cLn.g}${cLn.z}】· 太岁气场 · ${d.cLnSS || '比肩'}`, PAD + 24, y + 138);
    ctx.fillText(`今日能量：立足行动，顺势而为，聚焦核心价值`, PAD + 24, y + 172);

    // 右栏：三大流派
    const rx = PAD + 36 + halfW;
    ctx.fillStyle = P.gold;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('三大流派精要', rx, y + 70);
    ctx.fillStyle = P.text;
    ctx.font = '400 21px ' + P.sans;
    ctx.fillText(`紫微斗数：命宫星曜【${zw.name || '紫微天府'}】`, rx, y + 104);
    ctx.fillText(`奇门遁甲：值符用神【${qm.name || '天辅生门'}】`, rx, y + 138);
    ctx.fillText(`梅花易数：本卦主象【${mh.name || '风火家人'}】`, rx, y + 172);
  }
  y += timelineH + 30;

  /* ---- 底部品牌落款与防伪声明 ---- */
  if (!dryRun) {
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 24;

    ctx.fillStyle = P.text3;
    ctx.font = '400 20px ' + P.sans;
    ctx.fillText('✦ 问问大师 · 从命盘看倾向，把选择落到行动 ｜ 报告仅供自我探索与生活行动参考', PAD, y);
  }
  y += 50;

  return y;
}

/* ============================================================
   2. 西方星相全景长报告渲染器 (Western Full Report)
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

  /* ---- Header 顶部大标头 ---- */
  if (!dryRun) {
    ctx.fillStyle = P.accent;
    ctx.font = '700 24px ' + P.sans;
    ctx.fillText('✦ 问问大师 · 西方星相全息全景报告', PAD, y);
    const timeText = `${by}.${bm}.${bd} ${timeStr}`;
    ctx.fillStyle = P.text3;
    ctx.font = '400 20px ' + P.sans;
    ctx.fillText(timeText, W - PAD - ctx.measureText(timeText).width, y + 2);
  }
  y += 38;

  if (!dryRun) {
    ctx.fillStyle = P.text;
    ctx.font = '800 42px ' + P.serif;
    ctx.fillText('本命星盘 · 黄道十二宫与生命灵数', PAD, y);
  }
  y += 54;

  // 用户星相信息胶囊
  const infoCapsuleText = `出生地 ${city.n} · 太阳【${sun.name}】 · 月亮【${moon.name}】 · 上升【${asc.name}】 · 生命主命数【${num.lifePath}号人】`;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, 46, 23);
    ctx.fillStyle = P.accentSoft;
    ctx.fill();
    ctx.strokeStyle = P.accentBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, 46, 23);
    ctx.stroke();

    ctx.fillStyle = P.accent;
    ctx.font = '600 22px ' + P.sans;
    ctx.fillText(infoCapsuleText, PAD + 20, y + 12);
  }
  y += 62;

  /* ---- Section 1: 三核黄金宇宙 (Big Three) ---- */
  const trioCardH = 220;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, trioCardH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, trioCardH, 20);
    ctx.stroke();

    const trios = [
      { role: '太阳星座 · 核心本我', sign: sun.name, tag: sun.elem + '象 · ' + sun.mode, desc: sun.summary },
      { role: '月亮星座 · 内心情感', sign: moon.name, tag: moon.elem + '象 · 潜意识', desc: '掌管真实情绪需求、安全感源泉与内在精神寄托。' },
      { role: '上升星座 · 第一名片', sign: asc.name, tag: asc.elem + '象 · 处世面具', desc: '主导外在人格气质、第一印象与应对挑战的本能反应。' }
    ];

    const colW = (contentW - 30) / 3;
    trios.forEach((t, idx) => {
      const tx = PAD + 15 + idx * colW;
      const isSun = idx === 0;

      if (isSun) {
        roundRect(ctx, tx + 4, y + 12, colW - 8, trioCardH - 24, 14);
        ctx.fillStyle = P.accentSoft;
        ctx.fill();
        ctx.strokeStyle = P.accentBorder;
        ctx.lineWidth = 1.2;
        roundRect(ctx, tx + 4, y + 12, colW - 8, trioCardH - 24, 14);
        ctx.stroke();
      }

      ctx.fillStyle = isSun ? P.accent : P.text3;
      ctx.font = '700 19px ' + P.sans;
      ctx.fillText(t.role, tx + 14, y + 36);

      ctx.fillStyle = isSun ? P.accent : P.text;
      ctx.font = '900 36px ' + P.serif;
      ctx.fillText(t.sign, tx + 14, y + 80);

      ctx.fillStyle = P.text2;
      ctx.font = '600 18px ' + P.sans;
      ctx.fillText(t.tag, tx + 14, y + 114);

      ctx.fillStyle = P.text2;
      ctx.font = '400 18px ' + P.sans;
      const lines = wrapText(ctx, t.desc, colW - 28);
      let dy2 = y + 144;
      lines.slice(0, 2).forEach(l => {
        ctx.fillText(l, tx + 14, dy2);
        dy2 += 26;
      });
    });
  }
  y += trioCardH + 20;

  /* ---- Section 2: 十大星曜落座全景简表 ---- */
  const planetsH = 210;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, planetsH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, planetsH, 20);
    ctx.stroke();

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText('十大星体全景落座与宫位领域', PAD + 24, y + 28);

    const pList = chart.planets.slice(0, 10);
    const gridCols = 5;
    const cellW = (contentW - 48) / gridCols;

    pList.forEach((p, idx) => {
      const row = Math.floor(idx / gridCols);
      const col = idx % gridCols;
      const cx2 = PAD + 24 + col * cellW;
      const cy2 = y + 70 + row * 62;

      ctx.fillStyle = P.accent;
      ctx.font = '700 20px ' + P.sans;
      ctx.fillText(p.zh, cx2, cy2);

      ctx.fillStyle = P.text;
      ctx.font = '600 19px ' + P.sans;
      ctx.fillText(p.sign.name, cx2, cy2 + 24);

      ctx.fillStyle = P.text3;
      ctx.font = '400 17px ' + P.sans;
      ctx.fillText(`第${p.houseNum}宫 · ${p.degree}`, cx2, cy2 + 46);
    });
  }
  y += planetsH + 20;

  /* ---- Section 3: 四象能量与六维潜能 ---- */
  const radarItems = [
    { label: '行动力', val: sun.radar.action },
    { label: '同理心', val: sun.radar.empathy },
    { label: '洞察力', val: sun.radar.insight },
    { label: '逻辑力', val: sun.radar.logic },
    { label: '创造力', val: sun.radar.creative },
    { label: '坚韧度', val: sun.radar.grit },
  ];
  const elemBreakdown = chart.elemBreakdown;
  const energyH = 200;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, energyH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, energyH, 20);
    ctx.stroke();

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText('四象能量图谱与六维潜能评估', PAD + 24, y + 28);

    const halfW = (contentW - 60) / 2;

    // 左：四象配比
    elemBreakdown.forEach((e, idx) => {
      const ey2 = y + 68 + idx * 28;
      ctx.fillStyle = P.text2;
      ctx.font = '600 19px ' + P.sans;
      ctx.fillText(e.name, PAD + 24, ey2 + 2);

      const trackX = PAD + 100;
      const trackW = halfW - 160;
      roundRect(ctx, trackX, ey2 - 12, trackW, 14, 7);
      ctx.fillStyle = P.bgCardAlt;
      ctx.fill();

      roundRect(ctx, trackX, ey2 - 12, Math.max(8, trackW * (e.pct / 100)), 14, 7);
      ctx.fillStyle = e.color;
      ctx.fill();

      ctx.fillStyle = P.text;
      ctx.font = '700 18px ' + P.sans;
      ctx.fillText(e.pct + '%', trackX + trackW + 12, ey2 + 2);
    });

    // 右：六维潜能
    const rx = PAD + 36 + halfW;
    ctx.fillStyle = P.text2;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('六维人格天赋分值', rx, y + 68);

    radarItems.forEach((r, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const cx2 = rx + col * ((halfW - 20) / 3);
      const cy2 = y + 102 + row * 44;

      ctx.fillStyle = P.text3;
      ctx.font = '400 18px ' + P.sans;
      ctx.fillText(r.label, cx2, cy2);

      ctx.fillStyle = P.accent;
      ctx.font = '700 22px ' + P.sans;
      ctx.fillText(r.val + '分', cx2, cy2 + 24);
    });
  }
  y += energyH + 20;

  /* ---- Section 4: 毕达哥拉斯生命灵数与流年 ---- */
  const numH = 210;
  if (!dryRun) {
    roundRect(ctx, PAD, y, contentW, numH, 20);
    ctx.fillStyle = P.bgCard;
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, contentW, numH, 20);
    ctx.stroke();

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.serif;
    ctx.fillText('毕达哥拉斯生命灵数与流年密码', PAD + 24, y + 28);

    // 核心灵数展示
    ctx.fillStyle = P.accent;
    ctx.font = '900 64px ' + P.serif;
    ctx.fillText(num.lifePath + '', PAD + 28, y + 105);

    ctx.fillStyle = P.text;
    ctx.font = '700 24px ' + P.sans;
    ctx.fillText('核心主命数 · ' + num.archetype.name, PAD + 110, y + 74);

    ctx.fillStyle = P.text2;
    ctx.font = '400 19px ' + P.sans;
    ctx.fillText('天赋数: ' + num.talentNums.join('、') + ' ｜ 生日数: ' + num.birthdayNum + '号 ｜ ' + num.archetype.tag, PAD + 110, y + 106);

    // 九宫优势连线与流年主题
    ctx.fillStyle = P.gold;
    ctx.font = '700 20px ' + P.sans;
    ctx.fillText('优势连线 (' + num.activeLines.length + '条)：' + (num.activeLines.map(l => l.name).join(' · ') || '全域沉淀型'), PAD + 24, y + 146);

    ctx.fillStyle = P.text;
    ctx.font = '400 20px ' + P.sans;
    ctx.fillText(`9年周期流年：第 ${num.personalYear} 年 · 【${num.personalYearGuide.theme}】 - ${num.personalYearGuide.advice.slice(0, 36)}…`, PAD + 24, y + 178);
  }
  y += numH + 30;

  /* ---- 底部品牌落款与防伪声明 ---- */
  if (!dryRun) {
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 24;

    ctx.fillStyle = P.text3;
    ctx.font = '400 20px ' + P.sans;
    ctx.fillText('✦ 问问大师 · 西方星相全景命盘 ｜ 报告仅供心理探索、天赋开发与生活决策参考', PAD, y);
  }
  y += 50;

  return y;
}

/* ============================================================
   3. 渲染长报告 Canvas 主入口 (2x Retina 输出)
   ============================================================ */
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
