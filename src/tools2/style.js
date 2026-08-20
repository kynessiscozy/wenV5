/* ============================================================
   04 style · 能量穿搭与工位风水（二级结果页 + 天气 + 配图）
   ------------------------------------------------------------
   保留原逻辑：PALETTE 五用神配色方案 + 场景穿法/工位建议。
   新增：
    · 结合当前天气（getWxNow：温度/雨雪/风力）微调穿搭
    · 生成穿搭配图（衣架三件套 SVG）与工位配图（桌面俯视 SVG）
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { getCtx } from '../state/context.js';
import { getWxNow } from '../ui/weather.js';

const PALETTE = {
  木: { 主: { c: '#3f6f52', t: '青绿 · 墨绿' }, 辅: { c: '#e8e0cd', t: '米白 · 原木色' }, 点缀: { c: '#5f8fb0', t: '少量湖蓝' }, 饰: { c: '#8a6b4a', t: '木质或布艺小物' } },
  火: { 主: { c: '#a84638', t: '朱红 · 珊瑚' }, 辅: { c: '#f0e3d3', t: '暖米 · 杏色' }, 点缀: { c: '#c9a44c', t: '金色配件' }, 饰: { c: '#b05252', t: '红绳 · 暖光小物' } },
  土: { 主: { c: '#b0833f', t: '米色 · 暖黄 · 咖' }, 辅: { c: '#f5f0e4', t: '乳白' }, 点缀: { c: '#a85c3a', t: '陶土色' }, 饰: { c: '#8a6a45', t: '陶瓷 · 编织材质' } },
  金: { 主: { c: '#cfc9bd', t: '白 · 银灰 · 香槟' }, 辅: { c: '#e9e6df', t: '浅灰' }, 点缀: { c: '#b08a3e', t: '金属线条' }, 饰: { c: '#9a9aa0', t: '金属腕表 · 钢笔' } },
  水: { 主: { c: '#2f4d63', t: '深蓝 · 雾蓝 · 墨黑' }, 辅: { c: '#d8dce2', t: '浅灰蓝' }, 点缀: { c: '#9fc4d0', t: '透明材质' }, 饰: { c: '#5f7f93', t: '玻璃 · 水晶小物' } },
};

const SCENES = {
  重要沟通: { wear: '整体柔和、低攻击性：用主色大面积，点缀色只出现在一个细节（领带、胸针、丝巾），让对方注意力在内容不在衣服上。' },
  面试汇报: { wear: '正式感优先：辅助色打底，主色作一件单品，显得稳重又有记忆点；避免全身高饱和。' },
  专注工作: { wear: '颜色越少越好：中性色为主，主色只在视线边缘出现（杯子、桌垫），减少注意力拉扯。' },
  休息恢复: { wear: '暖调低照度：辅助色+点缀色，避开正红正黑这类强刺激，材质以柔软为主。' },
};

const SPACE_FIX = {
  杂乱: '清空桌面，只留当前任务相关物品；给每样东西定一个固定位置，用完归位。',
  光线: '优先改善光线和屏幕高度：屏幕顶与视线平齐，补一盏暖光台灯，再谈摆件。',
  久坐: '每 50 分钟起身两分钟，把水杯放远一点强制走动；调整座椅支撑腰部。',
  正常: '现有环境保持简洁即可，减少新增物品，避免变成新的干扰源。',
};

/* —— 天气 → 穿搭微调 —— */
function weatherAdvice(wxNow) {
  if (!wxNow) return null;
  const tips = [];
  const t = wxNow.temp;
  if (t >= 28) tips.push('天气炎热（' + t + '°C），主色以轻薄透气款为主，点缀色用在小面积防晒配件（帽子、伞）。');
  else if (t <= 8) tips.push('天气寒冷（' + t + '°C），适合叠穿：辅助色打底 + 主色作中间层或围巾，外层加保暖外套。');
  else tips.push('气温 ' + t + '°C，单层或轻叠穿即可，主色可放心大面积使用。');
  const L = wxNow.label || '';
  if (/雨|雪|雷/.test(L)) tips.push('今日' + L + '，外层选防水材质、鞋底防滑；主色留在内搭，避免大面积浅色沾污。');
  else if (/雾/.test(L)) tips.push('今日有雾，通勤注意层次与亮度，避免全黑穿搭，保留一个亮色细节。');
  if (wxNow.wind >= 20) tips.push('风力 ' + wxNow.wind + ' km/h，避免宽摆裙、长围巾等易飘单品，外套系扣更稳。');
  return tips.join('　');
}

function wxBadge(wxNow) {
  if (!wxNow) return '';
  const icon = wxNow.icon || 'sun';
  const glyph = { sun: '☀', 'sun-cloud': '◐', 'cloud-sun': '◑', cloud: '☁', drizzle: '☂', rain: '☔', 'heavy-rain': '☔', snow: '❄', thunder: '⚡', fog: '≡' }[icon] || '☁';
  return '<span class="wx-glyph">' + glyph + '</span>' +
    '<div class="wx-copy"><b>' + wxNow.temp + '°C · ' + (wxNow.label || '未知') + '</b>' +
    '<span>' + (wxNow.city || '当前位置') + ' · 湿度 ' + wxNow.hum + '% · 风 ' + wxNow.wind + ' km/h</span></div>';
}

/* —— 穿搭配图：衣架三件套（主/辅/点缀 + 随身小物） —— */
function outfitSvg(p) {
  const C = { main: p.主.c, aux: p.辅.c, dot: p.点缀.c, acc: p.饰.c };
  const line = 'var(--tw-line-2)';
  return '<svg viewBox="0 0 260 240" class="tw-style-art" role="img" aria-label="穿搭配色示意">' +
    // 衣架横杆
    '<line x1="24" y1="52" x2="236" y2="52" stroke="' + line + '" stroke-width="2"/>' +
    '<path d="M48 52q30 30 82 0M212 52q-30 30-82 0" fill="none" stroke="' + line + '" stroke-width="2"/>' +
    // 外套（主色）
    '<path d="M70 60 h60 v34 q-15 16 -30 16 t-30 -16 Z" fill="' + C.main + '" stroke="' + line + '"/>' +
    '<text x="100" y="128" text-anchor="middle" font-size="10" fill="var(--tw-ink-3)">主色外套</text>' +
    // 内搭（辅助色）
    '<path d="M152 62 h54 v38 q-13 14 -27 14 t-27 -14 Z" fill="' + C.aux + '" stroke="' + line + '"/>' +
    '<text x="179" y="128" text-anchor="middle" font-size="10" fill="var(--tw-ink-3)">辅助打底</text>' +
    // 点缀（领巾/包）
    '<path d="M96 66 l-14 6 8 8Z" fill="' + C.dot + '"/>' +
    '<path d="M204 66 l14 6 -8 8Z" fill="' + C.dot + '"/>' +
    '<text x="184" y="146" text-anchor="middle" font-size="10" fill="var(--tw-ink-3)">点缀小物</text>' +
    // 下装（辅助色深一档，用主色弱化）
    '<path d="M60 160 h34 v46 h-18 q-8 0 -8 -8Z" fill="' + C.main + '" opacity=".55" stroke="' + line + '"/>' +
    '<path d="M166 160 h34 v46 h-18 q-8 0 -8 -8Z" fill="' + C.aux + '" stroke="' + line + '"/>' +
    '<text x="93" y="222" text-anchor="middle" font-size="10" fill="var(--tw-ink-3)">下装</text>' +
    // 随身小物（右下）
    '<circle cx="232" cy="196" r="10" fill="' + C.acc + '" stroke="' + line + '"/>' +
    '<text x="232" y="220" text-anchor="middle" font-size="9" fill="var(--tw-ink-3)">随身</text>' +
  '</svg>';
}

/* —— 工位配图：桌面俯视（屏幕/键盘/绿植/台灯/水杯/记事本） —— */
function deskSvg(p, dir) {
  const line = 'var(--tw-line-2)';
  const main = p.主.c, dot = p.点缀.c;
  return '<svg viewBox="0 0 280 210" class="tw-style-art" role="img" aria-label="工位布局示意">' +
    // 桌面
    '<rect x="8" y="8" width="264" height="194" rx="12" fill="var(--tw-card)" stroke="' + line + '" stroke-width="1.5"/>' +
    // 显示器
    '<rect x="92" y="40" width="96" height="62" rx="6" fill="var(--tw-ink)" opacity=".12" stroke="' + line + '" stroke-width="1.5"/>' +
    '<rect x="137" y="102" width="6" height="12" fill="' + line + '"/>' +
    '<rect x="118" y="114" width="44" height="5" rx="2.5" fill="' + line + '"/>' +
    '<text x="140" y="96" text-anchor="middle" font-size="9" fill="var(--tw-ink-3)">屏幕（视线平齐）</text>' +
    // 键盘
    '<rect x="106" y="132" width="68" height="26" rx="4" fill="var(--tw-card)" stroke="' + line + '" stroke-width="1.5"/>' +
    '<g stroke="' + line + '" stroke-width="1.5">' +
      '<line x1="118" y1="137" x2="118" y2="153"/><line x1="129" y1="137" x2="129" y2="153"/><line x1="140" y1="137" x2="140" y2="153"/>' +
      '<line x1="151" y1="137" x2="151" y2="153"/><line x1="162" y1="137" x2="162" y2="153"/>' +
    '</g>' +
    // 鼠标
    '<ellipse cx="194" cy="145" rx="10" ry="13" fill="var(--tw-card)" stroke="' + line + '" stroke-width="1.5"/>' +
    // 水杯（右侧）
    '<rect x="216" y="120" width="22" height="34" rx="4" fill="var(--tw-card)" stroke="' + line + '" stroke-width="1.5"/>' +
    '<rect x="214" y="116" width="26" height="6" rx="3" fill="' + line + '"/>' +
    '<text x="227" y="172" text-anchor="middle" font-size="9" fill="var(--tw-ink-3)">水杯</text>' +
    // 绿植（左上）
    '<g transform="translate(30,34)">' +
      '<path d="M20 22 C8 14 10 2 20 2 C30 2 32 14 20 22Z" fill="var(--tw-g)" opacity=".75"/>' +
      '<path d="M20 22 C14 12 22 4 26 4 C30 10 26 16 20 22Z" fill="var(--tw-g)" opacity=".6"/>' +
      '<rect x="14" y="20" width="12" height="10" rx="3" fill="var(--tw-accent)" opacity=".55"/>' +
    '</g>' +
    '<text x="34" y="70" text-anchor="middle" font-size="9" fill="var(--tw-ink-3)">绿植</text>' +
    // 台灯（左下）
    '<g transform="translate(30,150)">' +
      '<circle cx="16" cy="10" r="10" fill="var(--tw-y)" opacity=".35" stroke="' + line + '" stroke-width="1.5"/>' +
      '<path d="M16 20 v18" stroke="' + line + '" stroke-width="2"/>' +
      '<ellipse cx="16" cy="40" rx="12" ry="3.5" fill="var(--tw-card)" stroke="' + line + '" stroke-width="1.5"/>' +
    '</g>' +
    '<text x="46" y="178" text-anchor="middle" font-size="9" fill="var(--tw-ink-3)">暖光台灯</text>' +
    // 有利方位
    '<text x="140" y="198" text-anchor="middle" font-size="10" fill="var(--tw-accent)" font-weight="700">有利方位 · ' + esc(dir) + '</text>' +
  '</svg>';
}

/* —— 五行 → 方位 —— */
const DIR_OF = { 木: '东方', 火: '南方', 土: '中央', 金: '西方', 水: '北方' };

export const style = {
  id: 'style',
  name: '能量穿搭与工位风水',
  cat: '日常决策',
  icon: '装',
  desc: '将抽象的五行提示转成颜色、环境和专注习惯，并结合当日天气给出穿法。',
  open(container) {
    const ctx = getCtx();
    const ys = (ctx && ctx.wx && ctx.wx.ys) || '土';
    const p = PALETTE[ys] || PALETTE['土'];
    const S = { scene: '重要沟通', space: '杂乱' };
    const wxNow = getWxNow();
    const dir = DIR_OF[ys] || '中央';

    const render = () => {
      container.innerHTML =
        masthead(style, { sub: style.desc }) +
        viewShell(
          '<div class="tw-h3">场景</div>' +
          '<div class="tw-tabs tw-tabs-underline">' +
            Object.keys(SCENES).map(s => '<button type="button" class="tw-tab' + (s === S.scene ? ' active' : '') + '" data-s="' + s + '">' + s + '</button>').join('') +
          '</div>' +
          '<div class="tw-field" style="margin-top:16px"><label>当前工位问题</label>' +
            '<select id="twSSpace">' +
              Object.keys(SPACE_FIX).map(k => '<option' + (k === S.space ? ' selected' : '') + '>' + k + '</option>').join('') +
            '</select></div>' +
          (wxNow ? '<div class="tw-style-wx">' + wxBadge(wxNow) + '</div>' : '') +
          '<div class="tw-actions" style="margin-top:20px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twSGen">生成方案 →</button>' +
          '</div>' +
          notice('<b>说明：</b>配色与穿法用于状态提醒，舒适、整洁和可持续使用优先；天气数据来自当前定位（可授权后自动获取）。')
        );

      container.querySelectorAll('[data-s]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.scene = btn.dataset.s;
          container.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('active', x === btn));
        });
      });
      container.querySelector('#twSSpace')?.addEventListener('change', e => { S.space = e.target.value; });

      container.querySelector('#twSGen').addEventListener('click', () => {
        const s = SCENES[S.scene];
        const fix = SPACE_FIX[S.space] || SPACE_FIX['杂乱'];
        const wAdv = weatherAdvice(wxNow);
      const wxRow = wxNow ? '<div class="tw-style-wx">' + wxBadge(wxNow) + '</div>' : '';
      goResult(container, style.name,
          '<div class="tw-kicker">WEATHER · 今日天气</div>' +
          (wxNow ? '<div class="tw-style-wx" style="margin-bottom:16px">' + wxBadge(wxNow) + '</div>' : '<div class="tw-para" style="margin-bottom:14px">未能获取天气，以下按通用方案给出建议；可授权定位后重试。</div>') +
          '<div class="tw-kicker">PALETTE · 用神「' + ys + '」配色</div>' +
          '<div class="tw-s-palette">' +
            '<div class="tw-s-swatch"><div class="color" style="background:' + p.主.c + '"><span class="tag">主色</span></div><div class="desc"><b>' + p.主.t + '</b>大面积 · 主体穿搭</div></div>' +
            '<div class="tw-s-swatch"><div class="color" style="background:' + p.辅.c + '"><span class="tag">辅助</span></div><div class="desc"><b>' + p.辅.t + '</b>打底 · 中和</div></div>' +
            '<div class="tw-s-swatch"><div class="color" style="background:' + p.点缀.c + '"><span class="tag">点缀</span></div><div class="desc"><b>' + p.点缀.t + '</b>小面积 · 一处细节</div></div>' +
            '<div class="tw-s-swatch"><div class="color" style="background:' + p.饰.c + '"><span class="tag">随身</span></div><div class="desc"><b>' + p.饰.t + '</b>心理暗示即可</div></div>' +
          '</div>' +
          '<div class="tw-rule-double"></div>' +
          '<div class="tw-kicker">OUTFIT · ' + esc(S.scene) + '怎么穿</div>' +
          '<div class="tw-style-art-box">' + outfitSvg(p) + '</div>' +
          '<div class="tw-para"><b>穿法：</b>' + s.wear + '</div>' +
          (wAdv ? '<div class="tw-para" style="margin-top:8px"><b>结合天气：</b>' + wAdv + '</div>' : '') +
          '<div class="tw-rule-double"></div>' +
          '<div class="tw-kicker">DESK · 工位第一步</div>' +
          '<div class="tw-style-art-box">' + deskSvg(p, dir) + '</div>' +
          '<div class="tw-para"><b>' + esc(S.space) + '：</b>' + fix + '</div>' +
          '<div class="tw-para" style="margin-top:6px"><b>随身小物：</b>' + p.饰.t + '——小面积出现即可，作用在心理暗示，不在堆砌。</div>'
        );
      });
    };
    render();
  },
};

export default style;
