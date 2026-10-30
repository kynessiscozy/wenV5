/* ============================================================
   horoscope · 星座大师
   ------------------------------------------------------------
   全功能西方占星与十二星座罗盘系统：
     1. 本命星盘档案：太阳（本我）、月亮（内心情绪）、上升（外在人格）
        三核精算 + 四象能量图谱（火/土/风/水）+ 六维天赋雷达
     2. 时空运势罗盘：今日 / 本周 / 本月 / 年度 运势深度预测
        （综合分、事业学业、感情桃花、财富投资、身心元气、宇宙指引）
     3. 星座合盘速配：12x12 全量契合度矩阵 + 元素动力学 + 相处破冰指南
     4. 12星座图鉴：四象分类筛选 + 守护星/神话与心理学全景画像
     5. ✦ AI 深度星座解读：无缝结合星盘上下文与多轮智能追问
     6. 生成分享卡片：支持一键导出精美 Claude 风格星座卡片
   ============================================================ */

import { masthead, notice, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { showToast } from '../ui/toast.js';
import { getZodiacSvg } from '../render/western-view.js';
import { getWesternProfile } from '../engines/western-context.js';

// UI 和兼容导出均使用同一份纯计算实现。
import { SIGNS, SIGN_MAP, getSunSignByDate, getCompatibility } from '../engines/horoscope.js';
export { SIGNS, getSunSignByDate, getAscendantSign, getMoonSign, calcElementBreakdown,
  getCompatibility, getHoroscopeForecast } from '../engines/horoscope.js';

/* ============================================================
   主工具对象定义 · 星座助手
   ============================================================ */
export const horoscope = {
  id: 'horoscope',
  name: '星座助手',
  cat: '西方大师',
  icon: '星',
  desc: '基于双方星座的趣味速配、相处提示与十二星座图鉴。',

  open(container) {
    const ctx = getCtx();
    const profile = getWesternProfile(ctx?.isDemoPreview ? null : ctx);
    // The selected solar sign matches the report's birth-time chart, including
    // cusp dates. Without a real report the initial choice is only an example.
    const initialSign = profile?.chart.sun || getSunSignByDate(6, 15);

    const S = {
      activeTab: 'synastry', // 'synastry' | 'compendium'
      sunSign: initialSign,
      partnerSign: SIGNS[(SIGNS.findIndex(s => s.id === initialSign.id) + 4) % 12],
      selectedCatalogSign: initialSign,
      elemFilter: 'all', // 'all' | 'fire' | 'earth' | 'air' | 'water'
    };

    /* —— 渲染主框架 —— */
    const render = () => {
      container.innerHTML =
        masthead(horoscope, { sub: horoscope.desc }) +
        // 顶部两大核心功能导航 Tabs (纯 SVG 矢量微标)
        '<div class="tw-t-nav">' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'synastry' ? ' active' : '') + '" data-tab="synastry"><svg viewBox="0 0 24 24" width="15" height="15" class="w-svg-ic" style="vertical-align:-2px;margin-right:4px;color:currentColor" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M 12 20 C 12 20 4 15 4 9 C 4 6 6 4 9 4 C 10.8 4 12 5.2 12 5.2 C 12 5.2 13.2 4 15 4 C 18 4 20 6 20 9 C 20 15 12 20 12 20 Z"/></svg>星座速配</button>' +
          '<button type="button" class="tw-t-nav-btn' + (S.activeTab === 'compendium' ? ' active' : '') + '" data-tab="compendium"><svg viewBox="0 0 24 24" width="15" height="15" class="w-svg-ic" style="vertical-align:-2px;margin-right:4px;color:currentColor" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M 4 19.5 C 4 17 6 17 12 17 C 18 17 20 17 20 19.5 M 4 4.5 C 4 7 6 7 12 7 C 18 7 20 7 20 4.5 M 4 4.5 L 4 19.5 M 20 4.5 L 20 19.5 M 12 7 L 12 17"/></svg>12星座图鉴</button>' +
        '</div>' +
        '<div class="tw-h-body" id="twHBody"></div>';

      container.querySelectorAll('.tw-t-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          S.activeTab = btn.dataset.tab;
          render();
        });
      });

      const body = container.querySelector('#twHBody');
      if (!body) return;

      if (S.activeTab === 'synastry') renderSynastryTab(body);
      else renderCompendiumTab(body);
    };

    /* ============================================================
       Tab 1: 星座合盘速配 (Zodiac Synastry)
       ============================================================ */
    const renderSynastryTab = (el) => {
      const sA = S.sunSign;
      const sB = S.partnerSign;
      const match = getCompatibility(sA, sB);

      const gaugeHtml = (score, tag, tone) => {
        const r = 46, c = 2 * Math.PI * r;
        return '<div class="tw-h-gauge-box">' +
          '<svg viewBox="0 0 110 110" class="gauge-svg">' +
            '<circle cx="55" cy="55" r="' + r + '" fill="none" stroke="var(--tw-line-2)" stroke-width="9"/>' +
            '<circle cx="55" cy="55" r="' + r + '" fill="none" stroke="' + tone + '" stroke-width="9" stroke-linecap="round" ' +
              'stroke-dasharray="' + (c * score / 100) + ' ' + c + '" style="transition:stroke-dasharray .6s ease"/></svg>' +
          '<div class="center">' +
            '<div class="score" style="color:' + tone + '">' + score + '<small>%</small></div>' +
            '<div class="tag">' + tag.split(' · ')[0] + '</div>' +
          '</div>' +
        '</div>';
      };

      el.innerHTML =
        notice(profile ? '默认使用个人星盘的太阳星座，可自行调整。' : '未读取到个人星盘：初始星座为示例，请自行选择。') +
        // 双方星座选择选择器
        '<div class="tw-h-synastry-picker">' +
          '<div class="pick-box">' +
            '<label>我的星座</label>' +
            '<select id="twHSynMe">' +
              SIGNS.map(s => '<option value="' + s.id + '"' + (s.id === sA.id ? ' selected' : '') + '>' + s.name + ' (' + s.en + ')</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="vs-heart"><svg viewBox="0 0 24 24" width="18" height="18" class="w-svg-ic" style="color:var(--tw-accent)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M 13 2 L 4 14 L 11 14 L 11 22 L 20 10 L 13 10 Z"/></svg></div>' +
          '<div class="pick-box">' +
            '<label>对方星座</label>' +
            '<select id="twHSynOther">' +
              SIGNS.map(s => '<option value="' + s.id + '"' + (s.id === sB.id ? ' selected' : '') + '>' + s.name + ' (' + s.en + ')</option>').join('') +
            '</select>' +
          '</div>' +
        '</div>' +

        // 契合度总览仪表卡
        '<div class="tw-h-synastry-hero">' +
          gaugeHtml(match.score, match.tag, match.tone) +
          '<div class="hero-info">' +
            '<div class="pair-title">' + sA.name + ' <span class="mul">×</span> ' + sB.name + '</div>' +
            '<div class="pair-badge" style="color:' + match.tone + ';border-color:' + match.tone + '">' + match.tag + '</div>' +
            '<div class="scores-row">' +
              '<div class="s-it"><span class="k">心动契合</span><b>' + match.loveScore + '%</b></div>' +
              '<div class="s-it"><span class="k">职场协作</span><b>' + match.workScore + '%</b></div>' +
              '<div class="s-it"><span class="k">沟通共鸣</span><b>' + match.talkScore + '%</b></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 元素动力学与相处指南
        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>元素动力学解析</b><span class="sub">' + sA.elem + '象 (' + sA.name + ') 遇上 ' + sB.elem + '象 (' + sB.name + ')</span></div>' +
          '<p class="tw-h-desc">' + match.dynamicDesc + '</p>' +
        '</div>' +

        '<div class="tw-h-card">' +
          '<div class="tw-h-card-hd"><b>相处与实战指南</b></div>' +
          '<div class="tw-h-rows">' +
            '<div class="it"><b>恋爱与情感：</b><span>' + match.loveAdvice + '</span></div>' +
            '<div class="it"><b>事业与合作：</b><span>' + match.workAdvice + '</span></div>' +
            '<div class="it"><b>分歧破冰法：</b><span>' + match.frictionBreak + '</span></div>' +
          '</div>' +
        '</div>' +

        // 底部操作
        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twHShareSyn">✦ 生成速配卡片</button>' +
        '</div>' +
        '<div class="tw-ai-mount" id="twHAIMount"></div>' +
        notice('<b>提示：</b>速配仅依据两个太阳星座，不是完整合盘或科学测量。感情与合作请结合真实沟通、边界与共同经历判断。');

      // 事件
      el.querySelector('#twHSynMe')?.addEventListener('change', e => {
        S.sunSign = SIGN_MAP[e.target.value] || SIGNS[0];
        render();
      });
      el.querySelector('#twHSynOther')?.addEventListener('change', e => {
        S.partnerSign = SIGN_MAP[e.target.value] || SIGNS[0];
        render();
      });

      // 生成合盘卡
      el.querySelector('#twHShareSyn')?.addEventListener('click', async () => {
        const btn = el.querySelector('#twHShareSyn');
        btn.disabled = true; btn.textContent = '生成中…';
        try {
          const { renderShareCard, exportShareCard } = await import('../share/card.js');
          const card = renderShareCard({
            kicker: '星座助手 · 星座速配',
            title: sA.name + ' × ' + sB.name,
            sub: '综合契合度 ' + match.score + '% ｜ ' + match.tag,
            badge: match.tag.split(' · ')[0],
            rows: [
              { k: '恋爱心动', v: match.loveScore + '% ｜ ' + match.loveAdvice },
              { k: '职场协作', v: match.workScore + '% ｜ ' + match.workAdvice },
              { k: '分歧破冰', v: match.frictionBreak },
            ],
            quote: match.dynamicDesc,
            foot: '合盘结果仅供相处参考，真诚沟通是良好关系的基石。'
          });
          exportShareCard(card, '问问大师_合盘_' + sA.name + '_' + sB.name, btn);
        } catch (err) {
          console.error(err);
        }
        btn.disabled = false; btn.textContent = '✦ 生成速配卡片';
      });

      // AI 解读挂载
      const aiSlot = el.querySelector('#twHAIMount');
      if (aiSlot) {
        attachToolAI({
          root: el,
          typeLabel: '星座助手 · 星座速配',
          getSource: () => {
            return sA.name + ' × ' + sB.name + ' 契合度' + match.score + '%（' + match.tag + '）\n' +
              '心动契合 ' + match.loveScore + '%，职场协作 ' + match.workScore + '%，沟通共鸣 ' + match.talkScore + '%。\n' +
              '元素动力：' + sA.elem + '象 (' + sA.name + ') 遇上 ' + sB.elem + '象 (' + sB.name + ')。' + match.dynamicDesc + '\n' +
              '恋爱与情感：' + match.loveAdvice + '\n' +
              '事业与合作：' + match.workAdvice + '\n' +
              '分歧破冰法：' + match.frictionBreak;
          },
          slot: aiSlot,
          extraSystem: '请以星座速配作为文化体验的参考。请围绕双方星座性格、互动特质及具体困扰，给出兼具心理学深度与现实可行性的沟通建议。'
        });
      }
    };

    /* ============================================================
       Tab 2: 12星座全景图鉴 (Compendium)
       ============================================================ */
    const renderCompendiumTab = (el) => {
      const filtered = S.elemFilter === 'all' ? SIGNS : SIGNS.filter(s => s.elemKey === S.elemFilter);
      const sel = S.selectedCatalogSign || SIGNS[0];

      el.innerHTML =
        // 元素过滤器 (纯 SVG 矢量微标)
        '<div class="tw-h-catalog-filter">' +
          ['all:全部星座', 'fire:火象星座', 'earth:土象星座', 'air:风象星座', 'water:水象星座'].map(p => {
            const [k, label] = p.split(':');
            return '<button type="button" class="tw-h-filter-btn' + (S.elemFilter === k ? ' active' : '') + '" data-elem="' + k + '">' + label + '</button>';
          }).join('') +
        '</div>' +

        // 12星座网格矩阵 (纯 SVG 矢量微标)
        '<div class="tw-h-catalog-grid">' +
          filtered.map(s =>
            '<div class="tw-h-cat-tile' + (s.id === sel.id ? ' sel' : '') + '" data-sign="' + s.id + '">' +
              '<div class="sym" style="color:' + s.color + '">' + getZodiacSvg(s.id, 28, s.color) + '</div>' +
              '<div class="name">' + s.name + '</div>' +
              '<div class="date">' + s.date + '</div>' +
              '<div class="elem">' + s.elem + '象 · ' + s.mode + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +

        // 当前选中星座的深度全景档案
        '<div class="tw-h-detail-card" style="border-top: 3px solid ' + sel.color + '">' +
          '<div class="detail-hd">' +
            '<span class="symbol" style="color:' + sel.color + '">' + getZodiacSvg(sel.id, 36, sel.color) + '</span>' +
            '<div class="title-wrap">' +
              '<h3>' + sel.name + ' <small>' + sel.en + ' (' + sel.date + ')</small></h3>' +
              '<div class="meta-tag">' + sel.elem + '象星座 ｜ ' + sel.mode + '形态 ｜ 守护星：' + sel.ruler + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="detail-quick">' +
            '<div><b>幸运色：</b><span>' + sel.luckyColor + '</span></div>' +
            '<div><b>幸运数：</b><span>' + sel.luckyNum + '</span></div>' +
            '<div><b>幸运宝石：</b><span>' + sel.stone + '</span></div>' +
            '<div><b>贵人星座：</b><span>' + sel.nobleSigns.join('、') + '</span></div>' +
          '</div>' +
          '<div class="tw-h-prose" style="margin-top:14px">' +
            '<p><b>性格画像：</b>' + sel.summary + '</p>' +
            '<p><b>核心优势：</b>' + sel.strength + '</p>' +
            '<p><b>成长盲区：</b>' + sel.blindSpot + '</p>' +
            '<p><b>事业方向：</b>' + sel.career + '</p>' +
            '<p><b>恋爱特质：</b>' + sel.love + '</p>' +
          '</div>' +
        '</div>' +

        '<div class="tw-actions">' +
          '<button type="button" class="tw-btn tw-btn-primary" id="twHUseAsMySign">设为我的主星 →</button>' +
        '</div>';

      // 绑定筛选
      el.querySelectorAll('[data-elem]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.elemFilter = btn.dataset.elem;
          renderCompendiumTab(el);
        });
      });

      // 绑定点击星座卡片
      el.querySelectorAll('[data-sign]').forEach(tile => {
        tile.addEventListener('click', () => {
          const sid = tile.dataset.sign;
          S.selectedCatalogSign = SIGN_MAP[sid] || SIGNS[0];
          renderCompendiumTab(el);
        });
      });

      // 设为主星
      el.querySelector('#twHUseAsMySign')?.addEventListener('click', () => {
        S.sunSign = S.selectedCatalogSign;
        S.activeTab = 'synastry';
        render();
        showToast('已切换主星为「' + S.sunSign.name + '」');
      });
    };

    render();
  }
};

export default horoscope;
