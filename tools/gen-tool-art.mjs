/* ============================================================
   生成工具卡背景 SVG
   ------------------------------------------------------------
   替换掉 14 张 900×502 的 WEBP（208KB）。

   设计约束：
   · 只用几何图形，不用滤镜/渐变网格，保证体积极小
   · 使用 currentColor + 半透明，随明暗主题自动适配
     （原 WEBP 是深蓝金配色，在 Claude 浅色主题下完全不搭）
   · 作为「纹理」而非「插图」：低对比、不与文字抢注意力
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const W = 400, H = 220;

/** 统一外壳：viewBox + 一层极淡底色 */
/* 注意：作为 CSS url() 背景加载的外部 SVG 处于独立文档，
   拿不到页面的 currentColor。因此这里写死一个中性赭色，
   再靠 CSS 的 opacity 与明暗主题配合（深色下不会刺眼）。 */
const INK = '#d97757';
const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none" preserveAspectRatio="xMidYMid slice">` +
  `<g stroke="${INK}" fill="${INK}">${inner}</g></svg>`;

/** 正弦波折线：用于「增长/节奏」类语义 */
function wave({ amp = 26, y = 130, lines = 7, gap = 7, phase = 0, op = 0.16 }) {
  let out = '';
  for (let i = 0; i < lines; i++) {
    const oy = y + i * gap;
    const a = amp * (1 - i * 0.05);
    // 步长放大到 20 并用二次贝塞尔平滑：点数减半，曲线依然顺滑
    const pt = x => [x, Math.round(oy - Math.sin((x / W) * Math.PI * 2 + phase) * a)];
    let [px, py] = pt(0);
    let d = `M${px} ${py}`;
    for (let x = 20; x <= W; x += 20) {
      const [cx2, cy2] = pt(x - 10), [nx, ny] = pt(x);
      d += `Q${cx2} ${cy2} ${nx} ${ny}`;
    }
    out += `<path d="${d}" stroke-width="1" opacity="${(op - i * 0.014).toFixed(3)}" fill="none"/>`;
  }
  return out;
}

/** 同心圆环：用于「循环/罗盘」类语义 */
function rings({ cx = 320, cy = 60, from = 20, count = 6, step = 18, op = 0.14 }) {
  let out = '';
  for (let i = 0; i < count; i++)
    out += `<circle cx="${cx}" cy="${cy}" r="${from + i * step}" stroke-width="1" fill="none" opacity="${(op - i * 0.016).toFixed(3)}"/>`;
  return out;
}

/** 点阵：用于「选择/随机」类语义 */
// 点阵改用 pattern 平铺：一个定义 + 一个矩形，比逐点输出小一个数量级
let _pid = 0;
function dots({ r = 1.6, op = 0.14, gx = 26, gy = 26, ox = 24, oy = 30 }) {
  const id = 'd' + (_pid++);
  return `<defs><pattern id="${id}" x="${ox}" y="${oy}" width="${gx}" height="${gy}" patternUnits="userSpaceOnUse">` +
         `<circle cx="${r}" cy="${r}" r="${r}" stroke="none"/></pattern></defs>` +
         `<rect width="${W}" height="${H}" fill="url(#${id})" opacity="${op}" stroke="none"/>`;
}

/** 斜向条纹：用于「秩序/流程」类语义 */
function stripes({ n = 10, w = 2, gapx = 44, op = 0.09, skew = 60 }) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = -80 + i * gapx;
    out += `<path d="M${x} ${H} L${x + skew} 0" stroke-width="${w}" opacity="${op}" fill="none"/>`;
  }
  return out;
}

/** 柱状：用于「评估/指数」类语义 */
function bars({ n = 9, base = 190, ox = 34, gx = 40, op = 0.13 }) {
  const hs = [40, 72, 56, 96, 64, 118, 84, 140, 100];
  let out = '';
  for (let i = 0; i < n; i++) {
    const h = hs[i % hs.length];
    out += `<rect x="${ox + i * gx}" y="${base - h}" width="10" height="${h}" rx="5" opacity="${(op - i * 0.006).toFixed(3)}" stroke="none"/>`;
  }
  return out;
}

/** 卦爻线：用于「卜卦/答案」类语义 */
function hexLines({ x = 250, y = 46, w = 120, gap = 22, pattern = [1, 0, 1, 1, 0, 1], op = 0.16 }) {
  let out = '';
  pattern.forEach((v, i) => {
    const yy = y + i * gap;
    if (v) out += `<rect x="${x}" y="${yy}" width="${w}" height="7" rx="3.5" opacity="${op}" stroke="none"/>`;
    else {
      const hw = (w - 14) / 2;
      out += `<rect x="${x}" y="${yy}" width="${hw}" height="7" rx="3.5" opacity="${op}" stroke="none"/>`;
      out += `<rect x="${x + hw + 14}" y="${yy}" width="${hw}" height="7" rx="3.5" opacity="${op}" stroke="none"/>`;
    }
  });
  return out;
}

/** 两颗相交的圆：用于「关系/合盘」语义 */
function venn({ cx = 300, cy = 110, r = 62, d = 46, op = 0.13 }) {
  return `<circle cx="${cx - d / 2}" cy="${cy}" r="${r}" stroke-width="1.2" fill="none" opacity="${op}"/>` +
         `<circle cx="${cx + d / 2}" cy="${cy}" r="${r}" stroke-width="1.2" fill="none" opacity="${op}"/>` +
         `<circle cx="${cx - d / 2}" cy="${cy}" r="${r - 14}" stroke-width="1" fill="none" opacity="${op * 0.6}"/>` +
         `<circle cx="${cx + d / 2}" cy="${cy}" r="${r - 14}" stroke-width="1" fill="none" opacity="${op * 0.6}"/>`;
}

/* —— 每张图的构成 —— */
const ART = {
  // 财富：上升波形 + 节点
  'wealth':   wave({ amp: 30, y: 120, lines: 8, gap: 8 }) +
              `<circle cx="120" cy="128" r="6" opacity=".2" stroke="none"/>` +
              `<circle cx="240" cy="98" r="8" opacity=".24" stroke="none"/>` +
              `<circle cx="340" cy="112" r="5" opacity=".18" stroke="none"/>`,
  // 事业：上行柱状
  'career':   bars({}) + rings({ cx: 350, cy: 40, from: 14, count: 4, step: 15, op: 0.1 }),
  // 择日：网格 + 高亮格
  'date':     dots({ cols: 12, rows: 6, gx: 30, gy: 30, op: 0.13 }) +
              `<rect x="140" y="78" width="34" height="34" rx="9" stroke-width="1.4" fill="none" opacity=".26"/>`,
  // 穿搭/环境：斜纹
  'style':    stripes({ n: 12, op: 0.1 }) + rings({ cx: 70, cy: 170, from: 16, count: 4, step: 16, op: 0.1 }),
  // 裁员预案：阶梯下行 + 护栏
  'layoff':   bars({ n: 7, ox: 40, gx: 46, base: 180, op: 0.12 }) +
              `<path d="M20 60 L380 60" stroke-width="1" stroke-dasharray="5 7" opacity=".18" fill="none"/>`,
  // 日签：同心圆（一天的循环）
  'daily':    rings({ cx: 300, cy: 100, from: 22, count: 7, step: 17 }) +
              `<circle cx="300" cy="100" r="9" opacity=".22" stroke="none"/>`,
  // 起名：点阵 + 方框
  'name':     dots({ cols: 13, rows: 7, op: 0.12 }) +
              `<rect x="238" y="62" width="96" height="96" rx="14" stroke-width="1.3" fill="none" opacity=".2"/>`,
  // 摇签：卦爻
  'oracle':   hexLines({}) + wave({ amp: 12, y: 178, lines: 3, gap: 8, op: 0.1 }),
  // 答案之书：书页折线
  'answerbook': `<path d="M60 40 L200 62 L200 190 L60 168 Z" stroke-width="1.3" fill="none" opacity=".18"/>` +
              `<path d="M340 40 L200 62 L200 190 L340 168 Z" stroke-width="1.3" fill="none" opacity=".14"/>` +
              `<path d="M200 62 L200 190" stroke-width="1" opacity=".2" fill="none"/>` +
              dots({ cols: 5, rows: 3, ox: 84, oy: 84, gx: 22, gy: 26, r: 1.4, op: 0.12 }),
  // 娱乐选号：随机圆点
  'lottery':  dots({ cols: 8, rows: 4, ox: 40, oy: 46, gx: 46, gy: 42, r: 9, op: 0.09 }) +
              `<circle cx="86" cy="88" r="13" stroke-width="1.4" fill="none" opacity=".22"/>` +
              `<circle cx="270" cy="130" r="13" stroke-width="1.4" fill="none" opacity=".22"/>`,
  // 关系/合盘：双圆相交
  'relation': venn({}) + wave({ amp: 10, y: 40, lines: 3, gap: 7, op: 0.09 }),
};

/* 分组底纹（磁贴按 data-group 使用） */
ART['group-money']    = wave({ amp: 22, y: 130, lines: 6, gap: 9, op: 0.12 });
ART['group-life']     = stripes({ n: 10, op: 0.08 });
ART['group-relation'] = venn({ cx: 290, cy: 110, r: 54, d: 40, op: 0.11 });
ART['group-play']     = dots({ cols: 12, rows: 6, r: 2.2, op: 0.1 });

const outDir = path.resolve('public/art');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
for (const [name, inner] of Object.entries(ART)) {
  const svg = wrap(inner);
  const file = path.join(outDir, `${name}.svg`);
  fs.writeFileSync(file, svg);
  total += Buffer.byteLength(svg);
  console.log(`${name.padEnd(16)} ${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB`);
}
console.log(`\n合计 ${(total / 1024).toFixed(1)}KB（原 WEBP 208KB）`);
