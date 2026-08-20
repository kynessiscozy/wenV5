/* ============================================================
   10 zodiac · 生肖环
   ------------------------------------------------------------
   保留原数据：六合/六冲/相害/三合关系表 + 场景建议。
   新形态：12 生肖环形图，选择对方生肖后高亮连线，
   中心卡片给出判定与沟通建议。
   ============================================================ */
import { masthead, notice, esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';

const SX = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const EN  = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

const HE    = [['鼠', '牛'], ['虎', '猪'], ['兔', '狗'], ['龙', '鸡'], ['蛇', '猴'], ['马', '羊']];
const CHONG = [['鼠', '马'], ['牛', '羊'], ['虎', '猴'], ['兔', '鸡'], ['龙', '狗'], ['蛇', '猪']];
const HAI   = [['鼠', '羊'], ['牛', '马'], ['虎', '蛇'], ['兔', '龙'], ['猴', '猪'], ['鸡', '狗']];
const SAN   = [['猴', '鼠', '龙'], ['虎', '马', '狗'], ['蛇', '鸡', '牛'], ['猪', '兔', '羊']];

const REL = {
  same:   { rel: '同属相', tag: '同频双刃', tone: 'var(--tw-o)',
    detail: '你们节奏和自我要求的来源相似，容易互相理解，也可能在同一个固执点上较劲。',
    advice: '共鸣多，但别让"谁也不肯先让步"变成僵局；分歧时先定规则再谈对错。' },
  he:     { rel: '六合', tag: '天然合拍', tone: 'var(--tw-g)',
    detail: '在生肖关系中属于最合的一对，沟通成本低，容易快速建立信任与默契。',
    advice: '适合尽快推进实质性合作或沟通；但别因为太顺就跳过边界和分工的确认。' },
  chong:  { rel: '六冲', tag: '节奏对冲', tone: 'var(--tw-r)',
    detail: '处事节奏和方式差异明显，容易在小事上起摩擦，属于需要明确规则的配对。',
    advice: '靠默契容易翻车，重要事项落到文字：分工、时间、验收标准；情绪上头时先搁置，别当场拍板。' },
  hai:    { rel: '相害', tag: '暗处损耗', tone: 'var(--tw-y)',
    detail: '不易爆发大冲突，但容易在细节和期待上互相消耗，误解说不清。',
    advice: '多确认、少猜测，把"我以为你懂了"换成复述核对；定期对齐期待。' },
  san:    { rel: '三合', tag: '同向协作', tone: 'var(--tw-g)',
    detail: '属于同一五行局，目标和方向上容易站到一起，适合为共同目标分工。',
    advice: '适合组队做项目；提前说好利益与责任分配，能走得更远。' },
  neutral:{ rel: '平和', tag: '中性配对', tone: 'var(--tw-ink-3)',
    detail: '没有明显的合冲关系，属于中性配对，关系质量主要由现实相处决定。',
    advice: '按正常节奏相处，观察对方的边界与沟通习惯即可，不必预设好坏。' },
};

function pairOf(a, b) { return t => t.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)); }
function judge(a, b) {
  if (a === b) return REL.same;
  if (pairOf(a, b)(HE)) return REL.he;
  if (pairOf(a, b)(CHONG)) return REL.chong;
  if (pairOf(a, b)(HAI)) return REL.hai;
  if (SAN.some(g => g.includes(a) && g.includes(b))) return REL.san;
  return REL.neutral;
}

/* 计算生肖在环上的角度（度）与连线端点 */
const ANG = i => i * 30 - 90; // 12 等分，从 12 点方向开始

export const zodiac = {
  id: 'zodiac',
  name: '生肖合冲分析',
  cat: '关系与沟通',
  icon: '肖',
  desc: '只作为传统文化参考。真正决定关系质量的是边界、沟通和共同目标。',
  open(container) {
    const ctx = getCtx();
    const me = (ctx && ctx.b && ctx.b.sx) || '';
    let other = '';

    const pos = i => {
      const a = ANG(i) * Math.PI / 180;
      const r = 132;
      return { x: 160 + r * Math.cos(a), y: 160 + r * Math.sin(a) };
    };

    const ringSvg = (a, b) => {
      // a=本人生肖下标 b=对方生肖下标，-1 表示未选
      const links = [];
      if (me && a >= 0 && b >= 0) {
        const r = judge(me, SX[b]);
        if (r !== REL.neutral && r !== REL.same) {
          const p1 = pos(a), p2 = pos(b);
          links.push('<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y +
            '" stroke="' + r.tone + '" stroke-width="2.5" stroke-dasharray="5 4" opacity=".75"/>');
        }
      }
      // 本人高亮环
      const meCircle = a >= 0
        ? '<circle cx="' + pos(a).x + '" cy="' + pos(a).y + '" r="17" fill="none" stroke="var(--tw-accent)" stroke-width="1.5" stroke-dasharray="3 3"/>' : '';
      return '<svg viewBox="0 0 320 320" aria-hidden="true">' +
        '<circle cx="160" cy="160" r="150" fill="none" stroke="var(--tw-line)" stroke-width="1"/>' +
        '<circle cx="160" cy="160" r="112" fill="none" stroke="var(--tw-line)" stroke-width="1" stroke-dasharray="2 5"/>' +
        links.join('') + meCircle +
        '</svg>';
    };

    const render = () => {
      const a = me ? SX.indexOf(me) : -1;
      const b = other ? SX.indexOf(other) : -1;

      // 生肖节点绝对定位
      const nodes = SX.map((s, i) => {
        const p = pos(i);
        return '<div class="tw-z-sx' +
          (s === me ? ' me' : '') +
          (s === other ? ' sel' : '') + '" style="left:' + p.x + 'px;top:' + p.y + 'px" data-sx="' + s + '">' +
          '<span class="char">' + s + '</span><span class="eng">' + EN[i] + '</span></div>';
      }).join('');

      const resultHtml = (() => {
        if (!me) return '<div class="tw-z-result"><p>未检测到你本人的生肖（需要先完成推演）。先按通用相处原则给出建议：把分工、时间和期待说清楚，减少"你应该懂"的猜测。</p></div>';
        if (!other) return '<div class="tw-z-result"><p>点击环上任意生肖，查看与「' + me + '」的相处提醒。</p></div>';
        const r = judge(me, other);
        const scene = container.querySelector('select')?.value || '亲密关系';
        const sceneAdvice = scene === '亲密关系' ? '把需求直接说出来，别用生肖给对方的反应下结论。'
          : scene === '朋友合作' ? '先小范围协作一次再谈深度绑定，观察可靠性。'
          : '保持尊重和边界，生肖只是参考，不是定论。';
        return '<div class="tw-z-result">' +
          '<div class="rel"><span>' + me + ' × ' + other + '</span>' +
          '<span class="tag" style="color:' + r.tone + ';border-color:' + r.tone + '">' + r.tag + '</span></div>' +
          '<div class="rel" style="font-size:18px;margin-top:2px;color:' + r.tone + '">' + r.rel + '</div>' +
          '<p><b>关系判读：</b>' + r.detail + '</p>' +
          '<p><b>沟通建议：</b>' + r.advice + '</p>' +
          '<p><b>' + scene + '：</b>' + sceneAdvice + '</p>' +
          '</div>';
      })();

      container.innerHTML =
        masthead(zodiac, { sub: zodiac.desc }) +
        '<div class="tw-field"><label>关系场景</label>' +
          '<select id="twZSce"><option>亲密关系</option><option>朋友合作</option><option>家人沟通</option></select></div>' +
        '<div class="tw-z-stage" style="position:relative;width:320px;height:320px">' +
          ringSvg(a, b) + nodes +
        '</div>' +
        resultHtml +
        (other ? '<div class="tw-actions" id="twZAI"></div>' : '') +
        notice('<b>提示：</b>生肖合冲仅为传统文化参考，不构成对任何关系的判断或决定依据。真正决定关系的是沟通、边界和共同目标。');

      // 事件
      container.querySelectorAll('.tw-z-sx').forEach(el => {
        el.addEventListener('click', () => {
          other = el.dataset.sx;
          render();
        });
      });
      container.querySelector('#twZSce')?.addEventListener('change', () => {
        if (other) render();
      });

      // 全面接入 AI：选定对方生肖后，在结果下方提供「AI 解读」
      const zSlot = container.querySelector('#twZAI');
      if (zSlot) {
        attachToolAI({
          root: container,
          typeLabel: zodiac.name,
          getSource: () => (container.querySelector('.tw-z-result')?.innerText || '').slice(0, 1800),
          slot: zSlot,
        });
      }
    };
    render();
  },
};

export default zodiac;
