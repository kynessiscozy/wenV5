/* ============================================================
   13 calendar · 日历模式
   ------------------------------------------------------------
   把应用当作日历使用：月历网格（日柱 + 五行 + 基调色），
   点击任意一天查看当日详情。
   有命盘时逐日 calcLiuRi 个性化（十神领域 / 能量 / 互动）；
   未排盘时不显示命理信息，保持纯日历（干支五行 / 节假日 / 心情 / 待办）。
   ============================================================ */
import { esc, attachToolAI } from './runtime.js';
import { getCtx } from '../state/context.js';
import { getDayGZ, calcLiuRi } from '../engines/liuri.js';

const WD = ['一', '二', '三', '四', '五', '六', '日'];

const TONE = {
  flow:     { label: '顺势',   color: 'var(--tw-g)' },
  steady:   { label: '平稳',   color: 'var(--tw-b)' },
  friction: { label: '有阻力', color: 'var(--tw-y)' },
  rest:     { label: '宜收',   color: 'var(--tw-gray)' },
};

/* —— 五行日通用宜忌（已弃用：未排盘时不显示命理信息） —— */

/* —— 中国法定节假日（2025/2026 官方放假安排；其余年份用固定公历节日兜底） —— */
const HOLIDAYS = {
  2025: {
    '1-1': ['元旦', 'h'],
    '1-28': ['除夕', 'h'], '1-29': ['春节', 'h'], '1-30': ['春节', 'h'], '1-31': ['春节', 'h'],
    '2-1': ['春节', 'h'], '2-2': ['春节', 'h'], '2-3': ['春节', 'h'], '2-4': ['春节', 'h'],
    '1-26': ['调休上班', 'w'], '2-8': ['调休上班', 'w'],
    '4-4': ['清明节', 'h'], '4-5': ['清明节', 'h'], '4-6': ['清明节', 'h'],
    '5-1': ['劳动节', 'h'], '5-2': ['劳动节', 'h'], '5-3': ['劳动节', 'h'], '5-4': ['劳动节', 'h'], '5-5': ['劳动节', 'h'],
    '4-27': ['调休上班', 'w'],
    '5-31': ['端午节', 'h'], '6-1': ['端午节', 'h'], '6-2': ['端午节', 'h'],
    '10-1': ['国庆节', 'h'], '10-2': ['国庆节', 'h'], '10-3': ['国庆节', 'h'], '10-4': ['中秋节', 'h'],
    '10-5': ['国庆节', 'h'], '10-6': ['国庆节', 'h'], '10-7': ['国庆节', 'h'], '10-8': ['国庆节', 'h'],
    '9-28': ['调休上班', 'w'], '10-11': ['调休上班', 'w'],
  },
  2026: {
    '1-1': ['元旦', 'h'], '1-2': ['元旦', 'h'], '1-3': ['元旦', 'h'], '1-4': ['调休上班', 'w'],
    '2-15': ['除夕', 'h'], '2-16': ['春节', 'h'], '2-17': ['春节', 'h'], '2-18': ['春节', 'h'],
    '2-19': ['春节', 'h'], '2-20': ['春节', 'h'], '2-21': ['春节', 'h'], '2-22': ['春节', 'h'], '2-23': ['春节', 'h'],
    '2-14': ['调休上班', 'w'], '2-28': ['调休上班', 'w'],
    '4-4': ['清明节', 'h'], '4-5': ['清明节', 'h'], '4-6': ['清明节', 'h'],
    '5-1': ['劳动节', 'h'], '5-2': ['劳动节', 'h'], '5-3': ['劳动节', 'h'], '5-4': ['劳动节', 'h'], '5-5': ['劳动节', 'h'],
    '5-9': ['调休上班', 'w'],
    '6-19': ['端午节', 'h'], '6-20': ['端午节', 'h'], '6-21': ['端午节', 'h'],
    '9-25': ['中秋节', 'h'], '9-26': ['中秋节', 'h'], '9-27': ['中秋节', 'h'],
    '10-1': ['国庆节', 'h'], '10-2': ['国庆节', 'h'], '10-3': ['国庆节', 'h'], '10-4': ['国庆节', 'h'],
    '10-5': ['国庆节', 'h'], '10-6': ['国庆节', 'h'], '10-7': ['国庆节', 'h'],
    '9-20': ['调休上班', 'w'], '10-10': ['调休上班', 'w'],
  },
};
/* 固定公历节日兜底（未列入上表的年份） */
const FIXED_HOLIDAYS = { '1-1': '元旦', '5-1': '劳动节', '10-1': '国庆节' };
function getHoliday(d) {
  const k = (d.getMonth() + 1) + '-' + d.getDate();
  const hit = (HOLIDAYS[d.getFullYear()] || {})[k];
  if (hit) return { name: hit[0], type: hit[1] };
  if (FIXED_HOLIDAYS[k]) return { name: FIXED_HOLIDAYS[k], type: 'h' };
  return null;
}

/* —— 用户心情记录（localStorage） —— */
const MOOD_KEY = 'tj_cal_mood';
const MOODS = [
  { k: 'great', e: '😀', label: '很开心' },
  { k: 'good',  e: '🙂', label: '不错' },
  { k: 'ok',    e: '😐', label: '一般' },
  { k: 'low',   e: '😔', label: '低落' },
  { k: 'tired', e: '😫', label: '疲惫' },
];
function loadMoods() { try { return JSON.parse(localStorage.getItem(MOOD_KEY) || '{}'); } catch (e) { return {}; } }
function saveMood(d, moodK) {
  const map = loadMoods();
  const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  if (moodK) map[key] = moodK; else delete map[key];
  try { localStorage.setItem(MOOD_KEY, JSON.stringify(map)); } catch (e) {}
  return map;
}
const moodEmoji = (map, d) => {
  const k = map[d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()];
  const m = MOODS.find(x => x.k === k);
  return m ? m.e : '';
};

/* —— 用户每日待办（localStorage） —— */
const TODO_KEY = 'tj_cal_todo';
function loadTodos() { try { return JSON.parse(localStorage.getItem(TODO_KEY) || '{}'); } catch (e) { return {}; } }
function saveTodos(map) { try { localStorage.setItem(TODO_KEY, JSON.stringify(map)); } catch (e) {} }
const todoKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
function dayTodos(map, d) { return map[todoKey(d)] || []; }
function todoCount(map, d) { return dayTodos(map, d).filter(t => !t.done).length; }

function chartInfo() {
  const ctx = getCtx();
  if (ctx && ctx.b && ctx.wx && ctx.wx.ys) return { b: ctx.b, ys: ctx.wx.ys };
  return null;
}

/** 某日简况：干支 + 五行 + 基调（有命盘用 calcLiuRi，否则按日柱五行中性基调） */
function daySummary(d, info) {
  const gz = getDayGZ(d);
  if (info) {
    const r = calcLiuRi(info.b, info.ys, d);
    return {
      date: d, gz, wx: gz.wx, r,
      tone: r.tone, energy: r.energy, label: TONE[r.tone].label, color: TONE[r.tone].color,
    };
  }
  // 无命盘：按日柱天干五行给中性基调（平稳），能量留空
  return {
    date: d, gz, wx: gz.wx, r: null,
    tone: 'steady', energy: null, label: TONE.steady.label, color: TONE.steady.color,
  };
}

function monthGrid(view) {
  const y = view.getFullYear(), m = view.getMonth();
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7; // 周一 = 0
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

const pad2 = x => String(x).padStart(2, '0');
const keyOf = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

export const calendar = {
  id: 'calendar',
  name: '日历模式',
  cat: '日常决策',
  icon: '历',
  desc: '把应用当作日历：逐日查看干支、五行与当日节奏，有命盘时显示与你个人的每日互动。',
  open(container) {
    const S = { view: new Date(), sel: new Date() };
    let info = chartInfo();
    const moods = loadMoods();
    const todos = loadTodos();

    // 顶部右侧日历按钮高亮；关闭时取消；日历为全屏模式且不显示右上角 ×（点空白处关闭）；隐藏首页汉堡按钮避免重叠
    const fab = document.getElementById('calFab');
    if (fab) fab.classList.add('active');
    const modal = document.getElementById('toolModal');
    modal?.classList.add('cal-fullscreen', 'no-close');
    const menuBtn = document.getElementById('homeMenuBtn');
    if (menuBtn) menuBtn.style.display = 'none';

    const render = () => {
      const y = S.view.getFullYear(), m = S.view.getMonth();
      const cells = monthGrid(S.view);
      const todayKey = keyOf(new Date());
      const selKey = keyOf(S.sel);
      const summaries = cells.map(c => c ? daySummary(c, info) : null);

      container.innerHTML =
        '<div class="tw-cal">' +
          '<div class="tw-cal-bar">' +
            '<button type="button" class="tw-cal-back" data-close-cal aria-label="返回">‹ 返回</button>' +
            '<div class="tw-cal-monthwrap">' +
              '<button type="button" class="tw-cal-nav" data-nav="-1" aria-label="上一月">‹</button>' +
              '<div class="tw-cal-month">' + y + ' 年 ' + (m + 1) + ' 月</div>' +
              '<button type="button" class="tw-cal-nav" data-nav="1" aria-label="下一月">›</button>' +
            '</div>' +
          '</div>' +
          '<div class="tw-cal-ops">' +
            '<button type="button" class="tw-cal-fill" data-fill>' + (info ? '重填信息' : '填写信息') + '</button>' +
            '<button type="button" class="tw-cal-today" data-today>今天</button>' +
            (info ? '<span class="tw-cal-pill">✦ 已结合命盘 · 用神「' + info.ys + '」</span>'
                  : '<span class="tw-cal-pill dim">未排盘 · 纯日历</span>') +
          '</div>' +
          '<div class="tw-cal-week">' + WD.map(w => '<span>' + w + '</span>').join('') + '</div>' +
          '<div class="tw-cal-grid">' +
            cells.map((c, i) => {
              if (!c) return '<div class="tw-cal-day blank"></div>';
              const s = summaries[i];
              const k = keyOf(c);
              const hol = getHoliday(c);
              const mood = moodEmoji(moods, c);
              const tc = todoCount(todos, c);
              const cls = 'tw-cal-day' +
                (k === todayKey ? ' today' : '') +
                (k === selKey ? ' sel' : '') +
                (s.tone ? ' t-' + s.tone : '') +
                (hol && hol.type === 'w' ? ' workday' : '') +
                (hol && hol.type === 'h' ? ' holiday' : '');
              return '<button type="button" class="' + cls + '" data-k="' + k + '">' +
                (mood ? '<span class="mood">' + mood + '</span>' : '') +
                (tc ? '<span class="todo-n">' + tc + '</span>' : '') +
                '<span class="d">' + c.getDate() + '</span>' +
                (hol ? '<span class="hol">' + (hol.type === 'w' ? '班' : hol.name) + '</span>'
                     : '<span class="gz">' + s.gz.gz + '</span>') +
                '<span class="bar" style="background:' + s.color + '"></span>' +
              '</button>';
            }).join('') +
          '</div>' +
          '<div class="tw-cal-detail" id="twCalDetail"></div>' +
        '</div>';

      container.querySelectorAll('[data-nav]').forEach(b =>
        b.addEventListener('click', () => {
          S.view = new Date(S.view.getFullYear(), S.view.getMonth() + (+b.dataset.nav), 1);
          render();
        }));
      container.querySelector('[data-close-cal]')?.addEventListener('click', () => {
        if (typeof window.closeToolPage === 'function') window.closeToolPage();
      });
      container.querySelector('[data-today]').addEventListener('click', () => {
        S.view = new Date(); S.sel = new Date();
        render();
      });
      container.querySelector('[data-fill]')?.addEventListener('click', () => {
        if (typeof window.TJOpenForm === 'function') window.TJOpenForm();
      });
      container.querySelectorAll('[data-k]').forEach(b =>
        b.addEventListener('click', () => {
          const [yy, mm, dd] = b.dataset.k.split('-').map(Number);
          S.sel = new Date(yy, mm - 1, dd);
          renderDetail();
          container.querySelectorAll('.tw-cal-day').forEach(x =>
            x.classList.toggle('sel', x.dataset.k === b.dataset.k));
        }));
      renderDetail();
    };

    const renderDetail = () => {
      const box = container.querySelector('#twCalDetail');
      if (!box) return;
      const s = daySummary(S.sel, info);
      const d = s.date;
      const wd = '星期' + WD[(d.getDay() + 6) % 7];
      const wx = s.gz.wx;

      let body = '';
      if (info && s.r) {
        const r = s.r;
        const t = TONE[r.tone];
        const wxText = {
          same:    '今日五行属' + r.dayGanWx + '，正是你的用神「' + info.ys + '」，做事更容易顺手。',
          support: '今日五行属' + r.dayGanWx + '，能生助你的用神「' + info.ys + '」，是有利的一天。',
          drain:   '今日五行属' + r.dayGanWx + '，会克耗你的用神「' + info.ys + '」，容易觉得费劲，属正常波动。',
          neutral: '今日五行属' + r.dayGanWx + '，与你的用神「' + info.ys + '」关系中性，影响不大。',
        }[r.wxRelation];
        const hit = r.chong.length ? { k: '今天要留意', v: r.chong[0].text + '，行程别排太满，避免不可逆决定。' }
                 : r.he.length ? { k: '今天的助力', v: r.he[0].text + '，沟通与求助的开口成本较低。' }
                 : null;
        body =
          '<div class="tw-cal-score"><span class="n">' + r.energy + '</span><span class="l">当日能量</span></div>' +
          '<div class="tw-cal-rows">' +
            '<div class="it"><b>今日适合</b><span>' + r.roleInfo.act + '</span></div>' +
            (hit ? '<div class="it"><b>' + hit.k + '</b><span>' + hit.v + '</span></div>' : '') +
            '<div class="it"><b>能量</b><span>' + wxText + '</span></div>' +
          '</div>' +
          '<div class="tw-actions tw-ai-mount" id="twCalAI"></div>';
      } else {
        // 未排盘：不显示「今日适合 / 节奏 / 提示」等命理信息，保持纯日历（节假日/心情/待办）
        body = '';
      }

      const hol = getHoliday(d);
      const moodK = moods[d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()];
      const moodRow =
        '<div class="tw-cal-mood">' +
          '<span class="tt">心情</span>' +
          '<div class="opts">' +
            MOODS.map(x =>
              '<button type="button" class="m' + (x.k === moodK ? ' on' : '') + '" data-mood="' + x.k + '" title="' + x.label + '">' + x.e + '</button>').join('') +
            (moodK ? '<button type="button" class="clr" data-mood="" title="清除">×</button>' : '') +
          '</div>' +
        '</div>';

      /* 待办列表 */
      const dayKey = todoKey(d);
      const list = todos[dayKey] || [];
      const undone = list.filter(t => !t.done).length;
      const todoRow =
        '<div class="tw-cal-todo">' +
          '<div class="hd"><span class="tt">待办</span><span class="cnt">' + (undone ? undone + ' 项未完成' : '全部完成') + '</span></div>' +
          '<div class="add">' +
            '<input id="twCalTodoIn" type="text" placeholder="添加一条待办，回车保存…" maxlength="60" autocomplete="off">' +
            '<button type="button" id="twCalTodoAdd" aria-label="添加待办">＋</button>' +
          '</div>' +
          (list.length ? '<div class="list">' + list.map(t =>
            '<div class="it' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
              '<button type="button" class="ck" data-act="toggle" aria-label="完成">' + (t.done ? '✓' : '') + '</button>' +
              '<span class="tx">' + esc(t.text) + '</span>' +
              '<button type="button" class="del" data-act="del" aria-label="删除">×</button>' +
            '</div>').join('') + '</div>' : '') +
        '</div>';

      box.innerHTML =
        '<div class="tw-cal-dt">' +
          '<div class="l">' + ymd(d) + ' · ' + wd + '</div>' +
          '<div class="r"><b>' + s.gz.gz + '</b>日 · <em>' + wx + '</em></div>' +
          (hol ? '<span class="hol-tag ' + hol.type + '">' + (hol.type === 'w' ? '调休上班' : hol.name) + '</span>' : '') +
          '<span class="tag" style="color:' + s.color + ';border-color:' + s.color + '">' + s.label + '</span>' +
        '</div>' +
        moodRow +
        todoRow +
        body;

      /* 心情选择交互 */
      box.querySelectorAll('[data-mood]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.mood;
          const updated = saveMood(d, key);
          Object.assign(moods, updated);
          // 更新当前格子与详情
          const k = keyOf(d);
          container.querySelectorAll('.tw-cal-day').forEach(x => {
            if (x.dataset.k === k) {
              const m = moodEmoji(moods, d);
              let mEl = x.querySelector('.mood');
              if (m) { if (!mEl) { mEl = document.createElement('span'); mEl.className = 'mood'; x.appendChild(mEl); } mEl.textContent = m; }
              else mEl?.remove();
            }
          });
          renderDetail();
        });
      });

      /* 待办交互 */
      const refreshTodoMark = (k) => {
        container.querySelectorAll('.tw-cal-day').forEach(x => {
          if (x.dataset.k !== k) return;
          const [yy, mm, dd] = k.split('-').map(Number);
          const dt = new Date(yy, mm - 1, dd);
          const n = todoCount(todos, dt);
          let el = x.querySelector('.todo-n');
          if (n) { if (!el) { el = document.createElement('span'); el.className = 'todo-n'; x.appendChild(el); } el.textContent = n; }
          else el?.remove();
        });
      };
      const addTodo = () => {
        const inp = box.querySelector('#twCalTodoIn');
        const text = (inp?.value || '').trim();
        if (!text) { inp?.focus(); return; }
        if (!todos[dayKey]) todos[dayKey] = [];
        todos[dayKey].push({ id: Date.now() + Math.floor(Math.random() * 999), text, done: false });
        saveTodos(todos);
        refreshTodoMark(keyOf(d));
        renderDetail();
      };
      box.querySelector('#twCalTodoAdd')?.addEventListener('click', addTodo);
      box.querySelector('#twCalTodoIn')?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
      box.querySelectorAll('.tw-cal-todo [data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.it');
          const id = +item.dataset.id;
          const arr = todos[dayKey] || [];
          const idx = arr.findIndex(t => t.id === id);
          if (idx < 0) return;
          if (btn.dataset.act === 'toggle') arr[idx].done = !arr[idx].done;
          else arr.splice(idx, 1);
          if (!arr.length) delete todos[dayKey]; else todos[dayKey] = arr;
          saveTodos(todos);
          refreshTodoMark(keyOf(d));
          renderDetail();
        });
      });

      // 全面接入 AI：有命盘个性化解读时，提供「AI 解读这一天」
      const calSlot = box.querySelector('#twCalAI');
      if (calSlot) {
        attachToolAI({
          root: box,
          typeLabel: calendar.name,
          getSource: () => {
            const c = box.cloneNode(true);
            c.querySelector('#twCalAI')?.remove();
            c.querySelector('.tw-ai-box')?.remove();
            return (c.innerText || '').slice(0, 1800) + ' ' + ymd(s.date) + ' · ' + s.gz.gz + '日';
          },
          slot: calSlot,
        });
      }
    };

    const ymd = d => d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';

    // 录入八字后：停留在日历并刷新（由 calc 在日历场景提交后派发），不跳报告页
    const onProfileReady = () => {
      // 日历已关闭则自动注销监听，避免泄漏
      if (!document.getElementById('toolModal')?.classList.contains('cal-fullscreen')) {
        window.removeEventListener('tj:profile-ready', onProfileReady);
        return;
      }
      info = chartInfo();
      render();
    };
    window.addEventListener('tj:profile-ready', onProfileReady);

    render();

    // 关闭日历后取消顶部圆形按钮高亮、恢复全屏、恢复关闭按钮与汉堡按钮
    return () => {
      window.removeEventListener('tj:profile-ready', onProfileReady);
      document.getElementById('calFab')?.classList.remove('active');
      modal?.classList.remove('cal-fullscreen', 'no-close');
      if (menuBtn) menuBtn.style.display = '';
    };
  },
};

export default calendar;
