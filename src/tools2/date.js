/* ============================================================
   03 date · 择日热力图
   ------------------------------------------------------------
   保留原逻辑：未来 N 天逐日 calcLiuRi 计算能量分 + 十神领域
   匹配 + 冲/宜收扣分，按适配度排序推荐前 3。
   新形态：日历热力网格（能量色块）+ 点击看详情 + 榜单。
   ============================================================ */
import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { calcLiuRi } from '../engines/liuri.js';

const EVENTS = ['签约合作', '面试入职', '发布项目', '搬家出行', '关系沟通', '启动新计划'];
const EVENT_ROLE = {
  签约合作: ['正官', '正财', '偏财'],
  面试入职: ['正官', '正印'],
  发布项目: ['食神', '伤官', '偏财'],
  搬家出行: ['偏财', '比肩'],
  关系沟通: ['正印', '食神'],
  启动新计划: ['比肩', '偏财', '正财'],
};
const NOTES = {
  签约合作: '适合确认边界、责任与交付节点',
  面试入职: '适合展示准备成果并主动沟通',
  发布项目: '适合公开推进，让成果获得反馈',
  搬家出行: '优先核对交通、天气和物品清单',
  关系沟通: '适合在情绪稳定时把需求说清楚',
  启动新计划: '适合先完成一个可见的第一步',
};
const TONE_CN = { flow: '顺势', steady: '平稳', friction: '有阻力', rest: '宜收' };
const WD = ['日', '一', '二', '三', '四', '五', '六'];

const energyColor = e => {
  if (e >= 72) return 'var(--tw-g)';
  if (e >= 55) return 'var(--tw-g2)';
  if (e >= 38) return 'var(--tw-y)';
  return 'var(--tw-gray)';
};

export const date = {
  id: 'date',
  name: '重要事项择日助手',
  cat: '日常决策',
  icon: '择',
  desc: '结合你的命盘节奏与近期日期，逐日计算适配度，筛选更适合推进重要事项的时间。',
  open(container) {
    const ctx = getCtx();
    if (!ctx || !ctx.b) {
      container.innerHTML =
        masthead(date, { sub: date.desc }) +
        '<div class="tw-para">请先完成个人推演，才能为你本人挑选日期。</div>' +
        '<div class="tw-actions"><button type="button" class="tw-btn tw-btn-primary" onclick="closeToolPage()">关闭</button></div>';
      return;
    }
    const ys = (ctx.wx && ctx.wx.ys) || '土';
    const S = { event: '签约合作', range: 14 };

    /* 计算未来 days 天的数据 */
    const compute = () => {
      const want = EVENT_ROLE[S.event] || [];
      const out = [];
      for (let i = 1; i <= S.range; i++) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        const r = calcLiuRi(ctx.b, ys, d);
        let score = r.energy + (want.includes(r.role) ? 8 : 0);
        if (r.chong.length) score -= 6;
        if (r.tone === 'rest') score -= 4;
        out.push({ d, r, score: Math.max(5, Math.min(98, Math.round(score))) });
      }
      return out;
    };

    const fmt = d => d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    const fmtShort = d => (d.getMonth() + 1) + '/' + d.getDate();

    const render = () => {
      const days = compute();
      const sorted = [...days].sort((a, b) => b.score - a.score);
      const top3 = sorted.slice(0, 3);

      // 日历网格：从今天开始（含今天？从明天开始）
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const startDow = today.getDay();
      const grid = [];
      for (let i = 0; i < startDow; i++) grid.push(null); // 今天之前的位置留空
      for (const x of days) grid.push(x);

      const dayCell = (x, i) => {
        if (!x) return '<div class="tw-d-day blank"></div>';
        const isToday = x.d.toDateString() === today.toDateString();
        return '<button type="button" class="tw-d-day' + (isToday ? ' today' : '') + '" data-i="' + i + '">' +
          '<span class="d">' + x.d.getDate() + '</span>' +
          '<span class="gz">' + x.r.day.gz + '</span>' +
          '<span class="e" style="background:' + energyColor(x.r.energy) + '">' + TONE_CN[x.r.tone] + '</span>' +
          '</button>';
      };

      container.innerHTML =
        masthead(date, { sub: date.desc }) +
        '<div class="tw-field-grid">' +
          '<div class="tw-field"><label>事项</label><select id="twDEvent">' +
            EVENTS.map(e => '<option' + (e === S.event ? ' selected' : '') + '>' + e + '</option>').join('') +
          '</select></div>' +
          '<div class="tw-field"><label>时间范围</label><select id="twDRange">' +
            [7, 14, 30].map(n => '<option value="' + n + '"' + (n === S.range ? ' selected' : '') + '>未来 ' + n + ' 天</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<div class="tw-d-head" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">' +
          WD.map(w => '<span style="text-align:center;font-size:10px;color:#948a78;letter-spacing:.1em;font-weight:700">周' + w + '</span>').join('') +
        '</div>' +
        '<div class="tw-d-cal">' + grid.map(dayCell).join('') + '</div>' +
        '<div class="tw-d-legend">' +
          '<span><i style="background:var(--tw-g)"></i>顺势</span>' +
          '<span><i style="background:var(--tw-g2)"></i>平稳</span>' +
          '<span><i style="background:var(--tw-y)"></i>有阻力</span>' +
          '<span><i style="background:var(--tw-gray)"></i>宜收</span>' +
        '</div>' +
        '<div class="tw-d-detail" id="twDDetail">' +
          '<div class="dt">点击日期查看当天详情</div>' +
          '<p>颜色越深代表当日与你命盘的适配度越高；结合「' + S.event + '」的十神领域评分。</p>' +
        '</div>' +
        '<div class="tw-d-rank" id="twDRank"></div>' +
        '<div class="tw-actions" id="twDAI"></div>' +
        notice('<b>方法：</b>逐日计算当日干支与你命盘的契合度（能量分、十神领域与冲合），无随机数。最终请再核对对方时间、天气、交通和实际截止日期。');

      // 榜单
      const rankEl = container.querySelector('#twDRank');
      rankEl.innerHTML = '<div class="tw-h3">TOP 3 推荐</div>' + top3.map((x, i) =>
        '<div class="tw-d-rank-item">' +
          '<span class="no">' + (i + 1) + '</span>' +
          '<div class="meta"><b>' + fmt(x.d) + ' · 周' + WD[x.d.getDay()] + '</b>' +
          '<span>' + x.r.day.gz + '日 · ' + TONE_CN[x.r.tone] + ' · ' + x.r.roleInfo.domain + '</span></div>' +
          '<span class="sc">' + x.score + '<small>适配度</small></span>' +
        '</div>').join('');

      // 点击日期
      container.querySelectorAll('.tw-d-day').forEach(el => {
        el.addEventListener('click', () => {
          container.querySelectorAll('.tw-d-day').forEach(x => x.classList.remove('sel'));
          el.classList.add('sel');
          const idx = +el.dataset.i;
          const x = grid[idx];
          if (!x) return;
          const dd = container.querySelector('#twDDetail');
          const want = EVENT_ROLE[S.event] || [];
          const roleHit = want.includes(x.r.role);
          dd.innerHTML = '<div class="dt">' + fmt(x.d) + ' · 周' + WD[x.d.getDay()] + ' · ' + x.r.day.gz + '日</div>' +
            '<p><b>基调：</b>' + TONE_CN[x.r.tone] + '（能量 ' + x.r.energy + '）　<b>十神：</b>' + x.r.role + ' —— ' + x.r.roleInfo.domain + '</p>' +
            (x.r.chong.length ? '<p><b>留意：</b>' + x.r.chong.map(h => h.text).join('；') + '</p>' : '') +
            (x.r.he.length ? '<p><b>助力：</b>' + x.r.he.map(h => h.text).join('；') + '</p>' : '') +
            '<p><b>' + S.event + '：</b>' + (roleHit ? '当日领域与本事项契合' : '本事项' + NOTES[S.event]) + '。适配度 ' + x.score + '。' + (i === 0 ? '' : '') + '</p>';
        });
      });

      container.querySelector('#twDEvent')?.addEventListener('change', e => { S.event = e.target.value; render(); });
      container.querySelector('#twDRange')?.addEventListener('change', e => { S.range = +e.target.value; render(); });

      attachToolAI({
        root: container,
        typeLabel: date.name,
        getSource: () => (container.querySelector('#twDRank')?.innerText || '') + ' ' + (container.querySelector('#twDDetail')?.innerText || '') + ' 事项：' + S.event,
        slot: container.querySelector('#twDAI'),
      });
    };
    render();
  },
};

export default date;
