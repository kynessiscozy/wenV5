/* ============================================================
   09 lottery · 娱乐选号（二级结果页）
   ------------------------------------------------------------
   保留原逻辑：纯随机生成号码组合（不使用命盘）。
   流程：玩法/注数表单 → 摇一组号码 → 独立结果页（号码球）。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';

const DEFS = {
  ssq: { name: '双色球', red: { n: 6, max: 33 }, blue: { n: 1, max: 16 } },
  dlt: { name: '超级大乐透', red: { n: 5, max: 35 }, blue: { n: 2, max: 12 } },
};

function pick(n, max) {
  const set = new Set();
  while (set.size < n) set.add(Math.floor(Math.random() * max) + 1);
  return [...set].sort((a, b) => a - b);
}
const pad = x => String(x).padStart(2, '0');

export const lottery = {
  id: 'lottery',
  name: '娱乐选号',
  cat: '灵感与娱乐',
  icon: '号',
  desc: '纯随机生成，不预测中奖，也不使用命盘制造确定性。仅使用可承受的娱乐预算。',
  open(container) {
    const S = { type: 'ssq', count: 1 };

    const renderBalls = (row, base) => {
      const def = DEFS[S.type];
      const reds = row.red.map((v, i) =>
        '<span class="tw-l-ball red" style="animation-delay:' + (base + i * 60) + 'ms">' + pad(v) + '</span>').join('');
      const blues = row.blue.map((v, i) =>
        '<span class="tw-l-ball blue" style="animation-delay:' + (base + row.red.length * 60 + i * 60) + 'ms">' + pad(v) + '</span>').join('');
      const sep = '<span class="tw-l-plus">+</span>';
      return '<div class="tw-l-ball-row">' + reds + sep + blues + '</div>';
    };

    const render = () => {
      const tab = (label, key, current) =>
        '<button type="button" class="tw-tab' + (current === key ? ' active' : '') + '" data-k="' + key + '">' + label + '</button>';

      container.innerHTML =
        masthead(lottery, { sub: lottery.desc }) +
        viewShell(
          '<div class="tw-tabs">' + tab('双色球', 'ssq', S.type) + tab('超级大乐透', 'dlt', S.type) + '</div>' +
          '<div class="tw-tabs" style="margin-top:10px">' +
            [1, 3, 5].map(n => tab(n + ' 注', String(n), String(S.count))).join('') +
          '</div>' +
          '<div class="tw-actions" style="margin-top:18px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twLotDraw">摇一组号码 →</button>' +
          '</div>' +
          notice('<b>声明：</b>号码为纯随机生成，不使用命盘，也不提高任何中奖概率。购彩请量力而行，娱乐为主。')
        );

      container.querySelectorAll('[data-k]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.k;
          if (k === 'ssq' || k === 'dlt') S.type = k;
          else S.count = +k;
          render();
        });
      });

      container.querySelector('#twLotDraw').addEventListener('click', () => {
        const def = DEFS[S.type];
        const rows = Array.from({ length: S.count }, (_, i) => {
          return { idx: i + 1, red: pick(def.red.n, def.red.max), blue: pick(def.blue.n, def.blue.max) };
        });
        goResult(container, lottery.name,
          '<div class="tw-kicker">NUMBER · 随机组合</div>' +
          '<div class="tw-h2">' + def.name + ' · ' + S.count + ' 注</div>' +
          rows.map(r => '<div class="tw-l-note" style="margin-top:8px;gap:14px"><span class="num">第 ' + r.idx + ' 注</span></div>' + renderBalls(r, r.idx * 220)).join('') +
          '<div class="tw-rule"></div>' +
          '<div class="tw-actions">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twLotCopy">复制号码</button>' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twLotAgain">↻ 换一组</button>' +
          '</div>'
        );
        // 结果页内的再次摇号
        const resultEl = container.querySelector('.tw-view-result');
        const bindResultActions = () => {
          resultEl.querySelector('#twLotCopy')?.addEventListener('click', copyText);
          resultEl.querySelector('#twLotAgain')?.addEventListener('click', () => {
            container.querySelector('#twLotDraw')?.click();
          });
        };
        bindResultActions();

        function copyText() {
          const text = def.name + ' ' + S.count + ' 注\n' + rows.map(r =>
            '第' + r.idx + '注 ' + (S.type === 'ssq' ? '红球 ' : '前区 ') +
            r.red.map(pad).join(' ') + (S.type === 'ssq' ? ' 蓝球 ' : ' 后区 ') +
            r.blue.map(pad).join(' ')).join('\n');
          const btn = resultEl.querySelector('#twLotCopy');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
              btn.textContent = '已复制 ✓';
              setTimeout(() => btn.textContent = '复制号码', 1400);
            }).catch(() => {});
          } else {
            const ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); btn.textContent = '已复制 ✓'; setTimeout(() => btn.textContent = '复制号码', 1400); } catch (e) {}
            document.body.removeChild(ta);
          }
        }
      });
    };
    render();
  },
};

export default lottery;
