/* ============================================================
   02 career · 准备度坐标（二级结果页）
   ------------------------------------------------------------
   保留原逻辑：目标/准备程度/可承受期 → 准备度评分 + 验证路径
   （含命盘事业评分修正）。
   流程：表单输入（实时预览评分环）→ 生成测评 → 独立结果页。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { getCtx } from '../state/context.js';

const PATHS = {
  转行: ['约 3 位目标行业的从业者深聊，核实你对这行的想象和现实的差距', '用兼职、试单或作品集投递做一次真实验证', '确认起步期的收入落差，在现金流承受范围内'],
  副业: ['先做一个最小可交付版本：一件样品、一次试服务或一页介绍', '把第一单完整跑通，再考虑扩大投入', '固定每周的副业时段，不让它侵蚀主业和休息'],
  创业: ['先验证需求：找到 3 个愿意付费或预定意向的真实客户', '把启动成本压到最坏情况也能承受的水平', '写下明确的止损线：亏到多少、拖到多久就停'],
};

export const career = {
  id: 'career',
  name: '转行与副业测评',
  cat: '财富与事业',
  icon: '业',
  desc: '不替你冲动跳船，而是判断准备度、现金流和验证路径。',
  open(container) {
    const ctx = getCtx();
    const cs = (ctx && typeof ctx.cs === 'number') ? ctx.cs : 60;
    const S = { goal: '转行', ready: '已有技能和作品', runway: '3个月以上' };

    const scoreOf = () => {
      let s = 40;
      if (S.ready === '已有技能和作品') s += 26;
      else if (S.ready.includes('方向')) s += 12;
      if (S.runway === '3个月以上') s += 10;
      else if (S.runway.includes('1—3')) s += 4;
      else s -= 4;
      s += Math.round((cs - 50) * 0.3);
      return Math.max(28, Math.min(94, Math.round(s)));
    };

    const colorOf = s => s >= 75 ? 'var(--tw-g)' : s >= 55 ? 'var(--tw-b)' : 'var(--tw-r)';
    const verdictOf = s => s >= 75 ? '准备较充分，可以推进验证' : s >= 55 ? '方向可行，条件还要补一补' : '先做低成本验证，别急着下注';

    const quad = (x, y) => {
      const W = 300, H = 200, PAD = 24;
      const px = (PAD + (x / 100) * (W - PAD * 2)) / W * 100;
      const py = (H - PAD - (y / 100) * (H - PAD * 2)) / H * 100;
      return '<div class="tw-c-quad" style="max-width:340px;margin:0 auto">' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%">' +
          '<line x1="' + PAD + '" y1="' + (H - PAD) + '" x2="' + (W - PAD) + '" y2="' + (H - PAD) + '" stroke="var(--tw-line)"/>' +
          '<line x1="' + PAD + '" y1="' + PAD + '" x2="' + PAD + '" y2="' + (H - PAD) + '" stroke="var(--tw-line)"/>' +
          '<line x1="' + (W / 2) + '" y1="' + PAD + '" x2="' + (W / 2) + '" y2="' + (H - PAD) + '" stroke="var(--tw-line)" stroke-dasharray="3 4"/>' +
          '<line x1="' + PAD + '" y1="' + (H / 2 + 10) + '" x2="' + (W - PAD) + '" y2="' + (H / 2 + 10) + '" stroke="var(--tw-line)" stroke-dasharray="3 4"/>' +
          '<text x="' + PAD + '" y="' + (H - 6) + '" font-size="9" fill="var(--tw-ink-3)">准备度 →</text>' +
          '<text x="8" y="' + (H / 2) + '" font-size="9" fill="var(--tw-ink-3)" transform="rotate(-90 8 ' + (H / 2) + ')">可承受期 →</text>' +
          '<text x="' + (W - PAD) + '" y="' + (PAD + 10) + '" font-size="9" fill="var(--tw-ink-3)" text-anchor="end">充裕</text>' +
          '<text x="' + (W - PAD) + '" y="' + (H - PAD + 4) + '" font-size="9" fill="var(--tw-ink-3)" text-anchor="end">紧张</text>' +
        '</svg>' +
        '<span class="marker" style="left:' + px + '%;top:' + py + '%;background:var(--tw-accent);border-color:var(--tw-accent);box-shadow:0 0 0 1.5px var(--tw-accent)"></span>' +
      '</div>';
    };

    const ring = (score, color) => {
      const r = 54, c = 2 * Math.PI * r;
      const pct = Math.max(0, Math.min(100, score));
      return '<div class="tw-c-ring">' +
        '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="var(--tw-line-2)" stroke-width="9"/>' +
        '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="butt" ' +
        'stroke-dasharray="' + (c * pct / 100) + ' ' + c + '" style="transition:stroke-dasharray .6s cubic-bezier(.2,.7,.2,1)"/></svg>' +
        '<div class="num">' + score + '<small>准备度</small></div></div>';
    };

    const render = () => {
      container.innerHTML =
        masthead(career, { sub: career.desc }) +
        viewShell(
          '<div class="tw-field-grid">' +
            '<div class="tw-field"><label>目标</label><select id="twCGoal">' +
              Object.keys(PATHS).map(g => '<option' + (g === S.goal ? ' selected' : '') + '>' + g + '</option>').join('') +
            '</select></div>' +
            '<div class="tw-field"><label>准备程度</label><select id="twCReady">' +
              ['已有技能和作品', '已有方向但未验证', '还没有明确方向'].map(x => '<option' + (x === S.ready ? ' selected' : '') + '>' + x + '</option>').join('') +
            '</select></div>' +
            '<div class="tw-field"><label>可承受准备期</label><select id="twCRunway">' +
              ['1个月以内', '1—3个月', '3个月以上'].map(x => '<option' + (x === S.runway ? ' selected' : '') + '>' + x + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div style="display:flex;gap:20px;align-items:center;margin:14px 0 4px">' +
            quad(scoreOf(), S.runway === '3个月以上' ? 78 : S.runway.includes('1—3') ? 55 : 25) +
            ring(scoreOf(), colorOf(scoreOf())) +
          '</div>' +
          '<div class="tw-para" style="margin-top:6px">当前输入对应准备度 <b>' + scoreOf() + '/100</b>，' + verdictOf(scoreOf()) + '。调整选项可实时预览。</div>' +
          '<div class="tw-actions" style="margin-top:20px">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twCGen">生成测评报告 →</button>' +
          '</div>' +
          notice('<b>方法：</b>评分结合自评与命盘事业节奏（' + cs + '/100）修正；现实条件与专业意见优先。')
        );

      container.querySelector('#twCGoal')?.addEventListener('change', e => { S.goal = e.target.value; refreshPreview(); });
      container.querySelector('#twCReady')?.addEventListener('change', e => { S.ready = e.target.value; refreshPreview(); });
      container.querySelector('#twCRunway')?.addEventListener('change', e => { S.runway = e.target.value; refreshPreview(); });

      container.querySelector('#twCGen').addEventListener('click', () => {
        const s = scoreOf();
        const yMap = S.runway === '3个月以上' ? 78 : S.runway.includes('1—3') ? 55 : 25;
        const color = colorOf(s);
        const steps = PATHS[S.goal] || PATHS['转行'];
        const stepIdx = s >= 75 ? 0 : s >= 55 ? 1 : 2;
        goResult(container, career.name,
          '<div class="tw-kicker">VERDICT · 判断</div>' +
          '<div class="tw-h2">' + verdictOf(s) + '</div>' +
          '<div class="tw-para">目标「' + esc(S.goal) + '」，准备程度「' + esc(S.ready) + '」，可承受期「' + esc(S.runway) + '」。</div>' +
          '<div class="tw-rule"></div>' +
          '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">' +
            quad(s, yMap) + ring(s, color) +
          '</div>' +
          '<div class="tw-rule-double"></div>' +
          '<div class="tw-kicker">PATH · 验证三步</div>' +
          '<div class="tw-c-stage">' + steps.map((t, i) =>
            '<div class="tw-c-stage-item' + (i >= stepIdx ? ' on' : '') + '">' +
              '<div class="no">STEP ' + (i + 1) + '</div>' +
              '<h4>' + ['验证', '试水', '切换'][i] + '</h4>' +
              '<p>' + t + '</p>' +
            '</div>').join('') +
          '</div>' +
          '<div class="tw-rule"></div>' +
          '<div class="tw-para"><b>底线：</b>' +
            (S.runway === '1个月以内' ? '你的缓冲期很短，任何变动都先确保下月现金流有着落。' : '保留现金流缓冲，不建议在没有退出方案时裸辞或重投入。') +
          '</div>' +
          '<div class="tw-para" style="margin-top:6px"><b>命盘节奏参考：</b>当前事业评分 ' + cs + '/100，' +
            (cs >= 70 ? '节奏支持主动争取，但仍以验证为先。' : '节奏偏蓄力，更适合小步试错而非大动作。') +
            ' 仅供节奏参考，现实条件优先。</div>'
        );
      });

      function refreshPreview() {
        const s = scoreOf();
        const yMap = S.runway === '3个月以上' ? 78 : S.runway.includes('1—3') ? 55 : 25;
        const form = container.querySelector('.tw-view-form');
        if (!form) return;
        const quadEl = form.querySelector('.tw-c-quad');
        const ringEl = form.querySelector('.tw-c-ring');
        const para = form.querySelector('.tw-para');
        if (quadEl) quadEl.outerHTML = quad(s, yMap);
        if (ringEl) ringEl.outerHTML = ring(s, colorOf(s));
        if (para) para.innerHTML = '当前输入对应准备度 <b>' + s + '/100</b>，' + verdictOf(s) + '。调整选项可实时预览。';
      }
    };
    render();
  },
};

export default career;
