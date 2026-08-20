/* ============================================================
   06 daily · 日签卡
   ------------------------------------------------------------
   保留原逻辑：calcLiuRi（当日干支 × 本人命盘）+ buildDailyCopy。
   新形态：竖版日签卡（干支印章 / 基调 / 宜·忌两栏 / 行动），
   打开即生成，无需表单。
   ============================================================ */
import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { calcLiuRi, buildDailyCopy, getDayGZ } from '../engines/liuri.js';
import { showToast } from '../ui/toast.js';

const TONE_CN = { flow: '顺势', steady: '平稳', friction: '有阻力', rest: '宜收' };

export const daily = {
  id: 'daily',
  name: '今日日签',
  cat: '日常决策',
  icon: '签',
  desc: '依据「当日干支 × 你的命盘」实时推演，同一天内容固定，用于整理节奏，不预测吉凶。',
  open(container) {
    const ctx = getCtx();
    if (!ctx || !ctx.b) {
      container.innerHTML =
        masthead(daily, { sub: daily.desc }) +
        '<div class="tw-para">请先完成个人推演，才能生成专属日签。</div>' +
        '<div class="tw-actions"><button type="button" class="tw-btn tw-btn-primary" onclick="closeToolPage()">关闭</button></div>';
      return;
    }

    const render = () => {
      let r, c;
      try {
        r = calcLiuRi(ctx.b, ctx.wx.ys || '土');
        c = buildDailyCopy(r);
      } catch (e) {
        container.innerHTML = masthead(daily, { sub: daily.desc }) +
          '<div class="tw-para">日签生成失败，请稍后再试。</div>';
        return;
      }

      // 今日吉凶侧重：宜 = 今日适合处理领域 + 助力；忌 = 留意/节奏提醒
      const yi = [c.domain];
      if (r.he.length) yi.push('借助今日的相合助力，主动沟通或请求协助');
      const ji = [];
      if (r.chong.length) ji.push('行程别排太满，避开不可逆决定');
      ji.push(r.tone === 'rest' ? '重要决定往后放，先把状态养回来' : '不在疲惫或情绪高点拍板');

      const toneColor = r.tone === 'flow' ? 'var(--tw-g)' : r.tone === 'steady' ? 'var(--tw-b)' : r.tone === 'friction' ? 'var(--tw-y)' : 'var(--tw-ink-3)';

      container.innerHTML =
        masthead(daily, { sub: daily.desc }) +
        '<div class="tw-y-card">' +
          '<div class="tw-y-gz">' +
            '<div class="tw-y-stamp">' + c.gz + '</div>' +
            '<div class="tw-y-meta">' + getDayGZ().dateKey + '<br>' +
              '基调 <b style="color:' + toneColor + '">' + c.label + '</b> · 能量 ' + c.energy + ' · 十神「' + c.role + '」</div>' +
          '</div>' +
          '<div class="tw-y-headline">' + c.headline + '</div>' +
          '<div class="tw-y-grid">' +
            '<div class="tw-y-col yi"><h5>宜</h5><ul>' + yi.map(x => '<li>' + x + '</li>').join('') + '</ul></div>' +
            '<div class="tw-y-col ji"><h5>忌</h5><ul>' + ji.map(x => '<li>' + x + '</li>').join('') + '</ul></div>' +
          '</div>' +
          '<div class="tw-y-foot">' +
            (r.wxRelation === 'same' ? '今日五行属' + r.dayGanWx + '，正是你的用神，做事更容易顺手。'
            : r.wxRelation === 'support' ? '今日五行属' + r.dayGanWx + '，能生助你的用神「' + r.yongShen + '」，是有利的一天。'
            : r.wxRelation === 'drain' ? '今日五行属' + r.dayGanWx + '，会克耗你的用神「' + r.yongShen + '」，容易觉得费劲，属正常波动。'
            : '今日五行属' + r.dayGanWx + '，与你的用神「' + r.yongShen + '」关系中性，影响不大。') +
          '</div>' +
        '</div>' +
        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twYShare">生成分享卡</button>' +
          '<button type="button" class="tw-btn tw-btn-ghost" id="twYText">文字分享</button>' +
        '</div>' +
        '<div class="tw-actions" id="twYAI"></div>' +
        notice('<b>说明：</b>日签用于整理当日节奏，不替代现实判断。');

      container.querySelector('#twYShare').addEventListener('click', async () => {
        const btn = container.querySelector('#twYShare');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const now = new Date();
          const card = renderShareCard({
            kicker: '今日日签 · ' + c.label + ' · ' + r.role,
            title: c.headline,
            sub: now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 · ' + c.gz + '日',
            rows: [
              { k: '适合处理', v: c.domain },
              { k: '今日助力', v: r.he.length ? r.he.map(h => h.text).join('；') : '按既定节奏推进即可' },
              { k: '行动', v: '只定一件最重要的事，留出不被打断的时间完成它' },
            ],
            quote: '同一天内容固定，用于整理节奏，不预测吉凶。',
            foot: '问问大师 · 今日日签',
          });
          exportShareCard(card, '问问大师_今日日签');
        } catch (e) { showToast('分享卡生成失败'); }
        btn.disabled = false; btn.textContent = '生成分享卡';
      });

      container.querySelector('#twYText').addEventListener('click', () => {
        const text = '问问大师 · 今日日签\n' + c.gz + '日 · ' + c.label + '\n' + c.headline + '\n' +
          '宜：' + yi.join('；') + '\n' + '忌：' + ji.join('；') + '\n—— 依据当日干支与本人命盘推演，仅供节奏参考。';
        if (navigator.share) {
          navigator.share({ title: '今日日签', text }).catch(() => {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => showToast('日签已复制，可分享给朋友')).catch(() => {});
        } else { showToast(text); }
      });

      attachToolAI({
        root: container,
        typeLabel: daily.name,
        getSource: () => (container.querySelector('.tw-y-card')?.innerText || '').slice(0, 1800),
        slot: container.querySelector('#twYAI'),
      });
    };
    render();
  },
};

export default daily;
