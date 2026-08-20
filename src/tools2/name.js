/* ============================================================
   07 name · 字卡网格（二级结果页）
   ------------------------------------------------------------
   保留原逻辑：用神字根 + 生用神两层取字（ROOTS/GEN 数据）。
   流程：表单页选择姓氏/风格/字根 → 生成候选名 → 结果页。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { getCtx } from '../state/context.js';

const ROOTS = {
  木: ['栩', '棠', '桐', '蔚', '桓', '槿', '柏', '榆'],
  火: ['昭', '昕', '晗', '昱', '暄', '晔', '焕', '炜'],
  土: ['安', '屹', '予', '坤', '岚', '岳', '培', '均'],
  金: ['知', '钰', '书', '钦', '铮', '铭', '鉴', '铎'],
  水: ['澄', '泓', '沅', '涵', '澈', '汐', '湛', '洵'],
};
const GEN = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
const ELEM_LABEL = { 木: 'WOOD', 火: 'FIRE', 土: 'EARTH', 金: 'METAL', 水: 'WATER' };

export const name = {
  id: 'name',
  name: '智能起名工具',
  cat: '灵感与娱乐',
  icon: '名',
  desc: '生成的是灵感方向，不替代读音、字义、重名和家族规范的核验。',
  open(container) {
    const ctx = getCtx();
    const ys = (ctx && ctx.wx && ctx.wx.ys) || '土';
    const aux = GEN[ys] || '土';
    const primary = ROOTS[ys] || ROOTS['土'];
    const auxRoots = ROOTS[aux] || primary;

    const S = { surname: '', style: '简洁现代', selP: null, selA: null };
    const styles = ['简洁现代', '温润典雅', '大气坚定'];
    const tails = { 简洁现代: ['然', '一', '可'], 温润典雅: ['宁', '言', '清'], 大气坚定: ['远', '承', '衡'] };

    const pickCombos = (selPrimary, selAux) => {
      const s = S.surname || '你的姓氏';
      const out = [];
      const used = new Set();
      for (const c of selPrimary) {
        const nm = s + c;
        if (!used.has(nm)) { used.add(nm); out.push({ nm, why: '用神「' + ys + '」字根' }); }
        if (out.length >= 4) break;
      }
      for (let i = 0; i < selAux.length && out.length < 8; i++) {
        const c1 = selPrimary[i % selPrimary.length];
        const c2 = selAux[(i + 2) % selAux.length];
        if (c1 === c2) continue;
        const nm = s + c1 + c2;
        if (!used.has(nm)) { used.add(nm); out.push({ nm, why: '用神「' + ys + '」+ 生助「' + aux + '」' }); }
      }
      const tailT = tails[S.style] || tails['简洁现代'];
      if (S.selP) {
        tailT.forEach(t => {
          if (out.length < 8) out.push({ nm: s + S.selP + t, why: '用神「' + ys + '」· ' + S.style + '尾字' });
        });
      }
      return out.slice(0, 8);
    };

    const card = (c, kind, isSel) =>
      '<div class="tw-n-card ' + kind + (isSel ? ' sel' : '') + '" data-c="' + c + '" data-kind="' + kind + '">' +
        '<span class="c">' + c + '</span><span class="w">' + ELEM_LABEL[kind === 'primary' ? ys : aux] + '</span></div>';

    const renderForm = () => {
      const form = viewShell(
        '<div class="tw-field-grid">' +
          '<div class="tw-field"><label>姓氏</label><input type="text" id="twNSur" placeholder="输入姓氏" maxlength="2" value="' + esc(S.surname) + '"></div>' +
          '<div class="tw-field"><label>风格</label><select id="twNStyle">' +
            styles.map(s => '<option' + (s === S.style ? ' selected' : '') + '>' + s + '</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<div class="tw-h3">用神字根 · 五行属「' + ys + '」<small style="color:var(--tw-ink-3);font-weight:600;margin-left:6px">点选可锁定</small></div>' +
        '<div class="tw-n-grid" id="twNPrimary">' + primary.map(c => card(c, 'primary', S.selP === c)).join('') + '</div>' +
        '<div class="tw-h3">辅助字根 · 生助用神「' + aux + '」</div>' +
        '<div class="tw-n-grid" id="twNAux">' + auxRoots.map(c => card(c, 'aux', S.selA === c)).join('') + '</div>' +
        '<div class="tw-actions"><button type="button" class="tw-btn tw-btn-primary" id="twNGen">生成候选名 →</button></div>' +
        notice('<b>核验清单：</b>读音顺口、字义稳妥、重名查询、方言谐音、家族避讳与正式登记规范，请逐项核对后再定。')
      );
      container.innerHTML = masthead(name, { sub: name.desc }) + form;

      container.querySelector('#twNSur')?.addEventListener('input', e => { S.surname = e.target.value.trim(); });
      container.querySelector('#twNStyle')?.addEventListener('change', e => { S.style = e.target.value; });

      // 字卡选择（委托到两个网格容器）
      [['#twNPrimary', 'primary'], ['#twNAux', 'aux']].forEach(([sel, kind]) => {
        const grid = container.querySelector(sel);
        if (!grid) return;
        grid.addEventListener('click', e => {
          const el = e.target.closest('.tw-n-card');
          if (!el) return;
          const c = el.dataset.c;
          if (kind === 'primary') S.selP = (S.selP === c ? null : c);
          else S.selA = (S.selA === c ? null : c);
          grid.querySelectorAll('.tw-n-card').forEach(x =>
            x.classList.toggle('sel', x.dataset.c === (kind === 'primary' ? S.selP : S.selA)));
        });
      });

      container.querySelector('#twNGen').addEventListener('click', () => {
        const sP = S.selP ? [S.selP] : primary;
        const sA = S.selA ? [S.selA] : auxRoots;
        const combos = pickCombos(sP, sA);
        goResult(container, name.name,
          '<div class="tw-kicker">NAME · 名称灵感</div>' +
          '<div class="tw-h2">为「' + esc(S.surname || '你的姓氏') + '」的候选</div>' +
          '<div class="tw-para" style="margin-bottom:6px">用神「' + ys + '」' +
            (S.selP ? '，锁定字根「' + S.selP + '」' : '') + ' · 风格「' + esc(S.style) + '」</div>' +
          '<div class="tw-n-combos" style="margin-top:14px">' + combos.map(c =>
            '<div class="tw-n-combo">' +
              '<span class="nm">' + esc(c.nm) + '</span>' +
              '<span class="why">' + c.why + '</span>' +
              '<span class="act" data-nm="' + esc(c.nm) + '">复制</span>' +
            '</div>').join('') + '</div>' +
          '<div class="tw-rule"></div>' +
          '<div class="tw-para"><b>取字逻辑：</b>以用神「' + ys + '」属性字为主，辅以生助用神的「' + aux + '」属性字，双字名取两者搭配。</div>' +
          '<div class="tw-para" style="margin-top:6px"><b>核验清单：</b>读音顺口、字义稳妥、重名查询、方言谐音、家族避讳与正式登记规范，请逐项核对后再定。</div>'
        );
      });
    };
    renderForm();
  },
};

export default name;
