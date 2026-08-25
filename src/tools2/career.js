/* ============================================================
   career · 事业大师（转行副业测评 + 职场风控预案）
   ------------------------------------------------------------
   融合两大核心职场模块：
     1. 转行与副业测评：目标/准备度/可承受期 → 准备度评分 + 四象限图 + 验证三步路径
     2. 职场风控与预案：公司经营信号/现金流缓冲/求职准备度 → 综合风险指数 + 行动预案
     3. ✦ AI 深度职场咨询与多轮追问
     4. 生成事业大师分享卡片
   ============================================================ */

import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { showToast } from '../ui/toast.js';

const PATHS = {
  转行: ['约 3 位目标行业资深从业者深聊，核实你对该领域的预期与真实差距', '通过兼职、试单或独立作品集投递做一次低成本真实验证', '评估确认起步期的收入落差，确保在个人现金流可承受范围内'],
  副业: ['打造一个最小可行性交付版本 (MVP)：一件样品、一次试服务或一页介绍', '完整跑通第一单闭环与回款，再考虑扩大精力或资金投入', '设立固定的每周副业时段，不让副业侵蚀主业绩效与身心健康'],
  创业: ['先做需求验证：找到至少 3 位愿意真实付费或签署预定意向的客户', '把启动与运营成本压到最坏情况下也能从容承受的底线', '设立清晰的止损线与里程碑：亏损多少、拖延多久即果断调整或停步'],
};

const SIGNALS = {
  company: {
    label: '公司经营状态', color: '#d4654a',
    opts: [
      { v: 1, t: '业务稳健增长，持续招聘' },
      { v: 2, t: '业务局部调整，工作可交接' },
      { v: 3, t: '部门收缩、预算冻结或不补员' },
      { v: 4, t: '已出现明确裁撤合并信号' },
    ],
  },
  buffer: {
    label: '现金流缓冲期', color: '#d4a04a',
    opts: [
      { v: 1, t: '储蓄可覆盖 6 个月以上' },
      { v: 2, t: '储蓄可覆盖 3—6 个月' },
      { v: 3, t: '储蓄不足 3 个月' },
    ],
  },
  ready: {
    label: '求职准备度', color: '#3f6f8f',
    opts: [
      { v: 1, t: '简历作品已就绪，随时可投递' },
      { v: 2, t: '有部分材料，需花时间整理' },
      { v: 3, t: '尚未准备任何求职材料与渠道' },
    ],
  },
};

const RISK_LEVEL = {
  high: { label: '需要立即准备', badge: 'high', actions: ['48小时内紧急更新简历与核心作品集', '整理劳动合同、绩效凭证与重要项目交付证据', '迅速启动外部人脉，建立不少于 3 个备选机会'] },
  mid:  { label: '建议提前预案', badge: 'mid', actions: ['本周内梳理更新简历并联系 2 位行业同行', '盘点可迁移核心技能与个人家庭现金流安全垫'] },
  low:  { label: '保持从容观察', badge: 'low', actions: ['每月定期归纳沉淀工作成果与量化数据', '持续拓展外部人脉网络，提升核心不可替代性'] },
};

export const career = {
  id: 'career',
  name: '事业大师',
  cat: '财富与事业',
  icon: '业',
  desc: '整合转行与副业准备度测评、职场风控与裁员预案，为职业发展保驾护航。',

  open(container) {
    const ctx = getCtx();
    const cs = (ctx && typeof ctx.cs === 'number') ? ctx.cs : 60;

    const S = {
      activeTab: 'transition', // 'transition' | 'risk'
      goal: '转行',
      ready: '已有技能和作品',
      runway: '3个月以上',
      companySig: 2,
      bufferSig: 2,
      readySig: 2,
    };

    /* —— 准备度计算 —— */
    const scoreOfTransition = () => {
      let s = 40;
      if (S.ready === '已有技能和作品') s += 26;
      else if (S.ready.includes('方向')) s += 12;
      if (S.runway === '3个月以上') s += 10;
      else if (S.runway.includes('1—3')) s += 4;
      else s -= 4;
      s += Math.round((cs - 50) * 0.3);
      return Math.max(28, Math.min(94, Math.round(s)));
    };

    const colorOfTrans = s => s >= 75 ? 'var(--tw-g)' : s >= 55 ? 'var(--tw-b)' : 'var(--tw-r)';
    const verdictOfTrans = s => s >= 75 ? '准备较充分，可积极推进低成本验证' : s >= 55 ? '方向具备可行性，核心条件仍需补齐' : '先做低成本尝试，切忌盲目冲动下注';

    /* —— 风险指数计算 —— */
    const scoreOfRisk = () => {
      const base = {
        1: 12, 2: 28, 3: 48, 4: 62,
      }[S.companySig] + {
        1: 0, 2: 8, 3: 16,
      }[S.bufferSig] + {
        1: 0, 2: 6, 3: 12,
      }[S.readySig] + Math.round((70 - cs) * 0.18);
      return Math.max(8, Math.min(92, base));
    };

    const levelOfRisk = r => r >= 65 ? 'high' : r >= 42 ? 'mid' : 'low';
    const colorOfRisk = r => r >= 65 ? 'var(--tw-r)' : r >= 42 ? 'var(--tw-y)' : 'var(--tw-g)';

    const quad = (x, y) => {
      const W = 300, H = 180, PAD = 24;
      const px = (PAD + (x / 100) * (W - PAD * 2)) / W * 100;
      const py = (H - PAD - (y / 100) * (H - PAD * 2)) / H * 100;
      return '<div class="tw-c-quad" style="max-width:320px;margin:0 auto">' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%">' +
          '<line x1="' + PAD + '" y1="' + (H - PAD) + '" x2="' + (W - PAD) + '" y2="' + (H - PAD) + '" stroke="var(--tw-line)"/>' +
          '<line x1="' + PAD + '" y1="' + PAD + '" x2="' + PAD + '" y2="' + (H - PAD) + '" stroke="var(--tw-line)"/>' +
          '<line x1="' + (W / 2) + '" y1="' + PAD + '" x2="' + (W / 2) + '" y2="' + (H - PAD) + '" stroke="var(--tw-line)" stroke-dasharray="3 4"/>' +
          '<line x1="' + PAD + '" y1="' + (H / 2 + 10) + '" x2="' + (W - PAD) + '" y2="' + (H / 2 + 10) + '" stroke="var(--tw-line)" stroke-dasharray="3 4"/>' +
          '<text x="' + PAD + '" y="' + (H - 6) + '" font-size="9" fill="var(--tw-ink-3)">准备度 →</text>' +
          '<text x="8" y="' + (H / 2) + '" font-size="9" fill="var(--tw-ink-3)" transform="rotate(-90 8 ' + (H / 2) + ')">缓冲期 →</text>' +
          '<text x="' + (W - PAD) + '" y="' + (PAD + 10) + '" font-size="9" fill="var(--tw-ink-3)" text-anchor="end">充裕</text>' +
          '<text x="' + (W - PAD) + '" y="' + (H - PAD + 4) + '" font-size="9" fill="var(--tw-ink-3)" text-anchor="end">紧张</text>' +
        '</svg>' +
        '<span class="marker" style="left:' + px + '%;top:' + py + '%;background:var(--tw-accent);border-color:var(--tw-accent);box-shadow:0 0 0 1.5px var(--tw-accent)"></span>' +
      '</div>';
    };

    const ring = (score, color, label = '准备度') => {
      const r = 48, c = 2 * Math.PI * r;
      const pct = Math.max(0, Math.min(100, score));
      return '<div class="tw-c-ring">' +
        '<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="' + r + '" fill="none" stroke="var(--tw-line-2)" stroke-width="8"/>' +
        '<circle cx="55" cy="55" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="butt" ' +
        'stroke-dasharray="' + (c * pct / 100) + ' ' + c + '" style="transition:stroke-dasharray .6s cubic-bezier(.2,.7,.2,1)"/></svg>' +
        '<div class="num">' + score + '<small>' + label + '</small></div></div>';
    };

    const render = () => {
      container.innerHTML =
        masthead(career, { sub: career.desc }) +
        // 顶部子功能 Tab
        '<div class="tw-t-nav">' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'transition' ? ' active' : '') + '" data-tab="transition">🚀 转行与副业测评</button>' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'risk' ? ' active' : '') + '" data-tab="risk">🛡️ 职场风控与预案</button>' +
        '</div>' +
        '<div id="twCareerBody"></div>';

      container.querySelectorAll('.tw-t-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          S.activeTab = btn.dataset.tab;
          render();
        });
      });

      const body = container.querySelector('#twCareerBody');
      if (!body) return;

      if (S.activeTab === 'transition') renderTransitionView(body);
      else renderRiskView(body);
    };

    /* —— 模块 1: 转行副业测评 —— */
    const renderTransitionView = (el) => {
      const s = scoreOfTransition();
      const yMap = S.runway === '3个月以上' ? 78 : S.runway.includes('1—3') ? 55 : 25;
      const color = colorOfTrans(s);
      const steps = PATHS[S.goal] || PATHS['转行'];
      const stepIdx = s >= 75 ? 0 : s >= 55 ? 1 : 2;

      el.innerHTML =
        '<div class="tw-field-grid">' +
          '<div class="tw-field"><label>转型目标</label><select id="twCGoal">' +
            Object.keys(PATHS).map(g => '<option' + (g === S.goal ? ' selected' : '') + '>' + g + '</option>').join('') +
          '</select></div>' +
          '<div class="tw-field"><label>准备程度</label><select id="twCReady">' +
            ['已有技能和作品', '已有方向但未验证', '还没有明确方向'].map(x => '<option' + (x === S.ready ? ' selected' : '') + '>' + x + '</option>').join('') +
          '</select></div>' +
          '<div class="tw-field"><label>可承受准备期</label><select id="twCRunway">' +
            ['1个月以内', '1—3个月', '3个月以上'].map(x => '<option' + (x === S.runway ? ' selected' : '') + '>' + x + '</option>').join('') +
          '</select></div>' +
        '</div>' +

        // 实时仪表与四象限图
        '<div class="tw-h-card" style="margin-top:12px">' +
          '<div class="tw-h-card-hd"><b>当前准备度评估</b><span class="sub" style="color:' + color + '">' + verdictOfTrans(s) + '</span></div>' +
          '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center">' +
            quad(s, yMap) + ring(s, color, '准备度') +
          '</div>' +
        '</div>' +

        // 验证三步路径
        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>推荐行动验证三步法</b><span class="sub">目标：' + S.goal + '</span></div>' +
          '<div class="tw-c-stage">' + steps.map((t, i) =>
            '<div class="tw-c-stage-item' + (i >= stepIdx ? ' on' : '') + '">' +
              '<div class="no">STEP ' + (i + 1) + '</div>' +
              '<h4>' + ['验证', '试水', '切换'][i] + '</h4>' +
              '<p>' + t + '</p>' +
            '</div>').join('') +
          '</div>' +
          '<div class="tw-para" style="margin-top:10px"><b>底线建议：</b>' +
            (S.runway === '1个月以内' ? '你的缓冲期很短，任何变动前先确保下个月现金流有着落。' : '保留现金流缓冲，不建议在没有退出方案时裸辞或重资产投入。') +
          '</div>' +
        '</div>' +

        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twCShareTrans">✦ 生成转行测评卡片</button>' +
        '</div>' +
        '<div class="tw-ai-mount" id="twCAIMount"></div>' +
        notice('<b>方法：</b>评分结合自评与命盘事业节奏（' + cs + '/100）修正；现实条件与专业意见优先。');

      // 绑定下拉更新
      el.querySelector('#twCGoal')?.addEventListener('change', e => { S.goal = e.target.value; renderTransitionView(el); });
      el.querySelector('#twCReady')?.addEventListener('change', e => { S.ready = e.target.value; renderTransitionView(el); });
      el.querySelector('#twCRunway')?.addEventListener('change', e => { S.runway = e.target.value; renderTransitionView(el); });

      // 分享卡片
      el.querySelector('#twCShareTrans')?.addEventListener('click', async () => {
        const btn = el.querySelector('#twCShareTrans');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const card = renderShareCard({
            kicker: '事业大师 · 转行与副业测评',
            title: S.goal + '准备度 · ' + s + '分',
            sub: verdictOfTrans(s),
            badge: s >= 75 ? '准备充分' : s >= 55 ? '条件待补' : '低成本试水',
            rows: [
              { k: '转型目标', v: S.goal },
              { k: '准备程度', v: S.ready },
              { k: '承受周期', v: S.runway },
              { k: '核心建议', v: steps[stepIdx] },
            ],
            quote: '不冲动跳船，用最小可行性版本跑通第一单闭环。',
            foot: '测评仅作行动参考，现实条件优先。'
          });
          exportShareCard(card, '问问大师_事业测评_' + S.goal);
        } catch (err) {
          console.error(err);
        }
        btn.disabled = false; btn.textContent = '✦ 生成转行测评卡片';
      });

      // 接入 AI 解读
      const aiSlot = el.querySelector('#twCAIMount');
      if (aiSlot) {
        attachToolAI({
          root: el,
          typeLabel: '事业大师 · 转型测评',
          getSource: () => {
            return `【事业大师·转型测评事实】
转型目标：${S.goal}
准备程度：${S.ready}
可承受期：${S.runway}
准备度得分：${s}分 (${verdictOfTrans(s)})
推荐验证路径：${steps.join(' -> ')}
当前命盘事业节奏评分：${cs}分`;
          },
          slot: aiSlot,
          extraSystem: '你是一位资深职业规划与商业咨询大师。请基于用户的转型目标、准备程度与承受期，提供具体、清晰、极具实操性的职场破局与验证方案。'
        });
      }
    };

    /* —— 模块 2: 职场风控预案 —— */
    const renderRiskView = (el) => {
      const r = scoreOfRisk();
      const lv = levelOfRisk(r);
      const L = RISK_LEVEL[lv];
      const color = colorOfRisk(r);

      const signalSelHtml = (key) => {
        const s = SIGNALS[key];
        const curV = key === 'company' ? S.companySig : key === 'buffer' ? S.bufferSig : S.readySig;
        return '<div class="tw-l-signal" style="margin-bottom:12px">' +
          '<div class="hd" style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><b>' + s.label + '</b><span class="lv" style="color:' + s.color + ';font-weight:600">' +
            s.opts.find(o => o.v === curV).t + '</span></div>' +
          '<div class="tw-l-sel">' + s.opts.map(o =>
            '<button type="button" class="' + (o.v === curV ? 'on' : '') + '" data-k="' + key + '" data-v="' + o.v + '">' + o.t + '</button>').join('') +
          '</div></div>';
      };

      el.innerHTML =
        // 风险总览卡
        '<div class="tw-h-card" style="margin-top:4px">' +
          '<div class="tw-h-card-hd"><b>职场风险综合评估</b><span class="sub" style="color:' + color + ';font-weight:700">' + L.label + '</span></div>' +
          '<div style="display:flex;align-items:center;gap:18px;justify-content:center;flex-wrap:wrap">' +
            ring(r, color, '风险指数') +
            '<div style="flex:1;min-width:180px">' +
              '<div style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700;color:' + color + ';background:color-mix(in srgb,' + color + ' 12%,transparent);border:1px solid ' + color + '44">' + L.label + '</div>' +
              '<p class="tw-para" style="margin-top:6px;font-size:12.5px">综合公司信号、现金流缓冲与求职准备度，当前风险指数为 <b>' + r + '/100</b>。</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 信号选择器
        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>现实红旗信号评估</b></div>' +
          signalSelHtml('company') + signalSelHtml('buffer') + signalSelHtml('ready') +
        '</div>' +

        // 推荐行动预案
        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>推荐行动预案</b></div>' +
          '<div class="tw-c-stage">' + L.actions.map((a, i) =>
            '<div class="tw-c-stage-item on"><div class="no">' + String(i + 1).padStart(2, '0') + '</div>' +
            '<p style="margin:0;font-size:13px;color:var(--tw-ink-2)">' + a + '</p></div>').join('') +
          '</div>' +
        '</div>' +

        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twCShareRisk">✦ 生成风控预案卡片</button>' +
        '</div>' +
        '<div class="tw-ai-mount" id="twCRiskAIMount"></div>' +
        notice('<b>提示：</b>现实证据优先，命理只作趋势参考（约 18% 权重）。结果用于风险规划，不代表裁员概率或法律结论。');

      // 绑定点击信号
      el.querySelectorAll('[data-k]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.k;
          if (k === 'company') S.companySig = +btn.dataset.v;
          else if (k === 'buffer') S.bufferSig = +btn.dataset.v;
          else S.readySig = +btn.dataset.v;
          renderRiskView(el);
        });
      });

      // 分享风控卡
      el.querySelector('#twCShareRisk')?.addEventListener('click', async () => {
        const btn = el.querySelector('#twCShareRisk');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const card = renderShareCard({
            kicker: '事业大师 · 职场风控预案',
            title: '风险指数 ' + r + '分 · ' + L.label,
            sub: '公司信号 · 现金流缓冲 · 求职准备度综合评估',
            badge: L.label,
            rows: [
              { k: '公司信号', v: SIGNALS.company.opts.find(o => o.v === S.companySig).t },
              { k: '现金缓冲', v: SIGNALS.buffer.opts.find(o => o.v === S.bufferSig).t },
              { k: '求职准备', v: SIGNALS.ready.opts.find(o => o.v === S.readySig).t },
              { k: '行动指南', v: L.actions[0] },
            ],
            quote: '提前排查现实红旗，做好备选方案，从容应对职场变局。',
            foot: '风险评估仅作个人预案参考，不构成法律意见。'
          });
          exportShareCard(card, '问问大师_职场风控_' + lv);
        } catch (err) {
          console.error(err);
        }
        btn.disabled = false; btn.textContent = '✦ 生成风控预案卡片';
      });

      // AI 挂载
      const aiSlot = el.querySelector('#twCRiskAIMount');
      if (aiSlot) {
        attachToolAI({
          root: el,
          typeLabel: '事业大师 · 职场风控',
          getSource: () => {
            return `【事业大师·职场风控事实】
综合风险指数：${r}分 (${L.label})
公司经营信号：${SIGNALS.company.opts.find(o => o.v === S.companySig).t}
现金流缓冲：${SIGNALS.buffer.opts.find(o => o.v === S.bufferSig).t}
求职准备度：${SIGNALS.ready.opts.find(o => o.v === S.readySig).t}
推荐行动预案：${L.actions.join('；')}
命盘事业节奏评分：${cs}分`;
          },
          slot: aiSlot,
          extraSystem: '你是一位资深职场导师与劳动法法务咨询专家。请基于用户的现实风险信号、现金流缓冲与准备度，提供冷静、专业、保护个人权益的实战行动策略。'
        });
      }
    };

    render();
  }
};

export default career;
