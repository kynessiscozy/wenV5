/* ============================================================
   08 oracle · 签筒抽签（二级结果页）
   ------------------------------------------------------------
   保留原数据：window.ORACLE_SIGNS 八种签库，运行时读取，
   缺省用内置兜底池。签文卡进入独立结果页。
   ============================================================ */
import { masthead, notice, esc, viewShell, goResult } from './runtime.js';
import { showToast } from '../ui/toast.js';

const FALLBACK = {
  观音签: [
    { n: 1, grade: '上上签', name: '钟离成道', poem: '开天辟地作良缘，吉日良时万物全。\n若得此签非小可，公侯将相在眼前。', yi: '开运亨通 · 功名显达 · 谋事皆成', jie: '此签居百签之首，主时运大开、根基已成。所求之事正当其时，宜把握机遇、积极作为。', dian: '钟离权悟道飞升之典，喻缘法具足、功到自然成。' },
  ],
  文王签: [
    { n: 1, grade: '上上签', name: '乾卦·潜龙勿用', poem: '潜龙在渊未可飞，藏锋养晦待时机。\n一朝云起风雷动，九五飞龙在天衢。', yi: '潜藏待时 · 勿妄动 · 大器晚成', jie: '乾卦初爻，阳刚潜藏。此时宜蛰伏蓄力，不宜轻举。时至则飞龙在天。', dian: '《易·乾》"潜龙勿用"，喻君子藏器于身、待时而动。' },
  ],
  关帝签: [
    { n: 1, grade: '上上签', name: '关公受封', poem: '丹心贯日气如虹，汉寿亭侯爵位崇。\n义薄云天垂万古，威灵显赫护苍穹。', yi: '忠义昭彰 · 名位显达 · 威德护身', jie: '此签主忠义立身、名扬天下。守正持义者得神佑，谋事光明。', dian: '关羽封汉寿亭侯之典，喻忠义感天、德威并隆。' },
  ],
  城隍签: [
    { n: 1, grade: '上上签', name: '城隍摄政', poem: '明镜高悬照九幽，赏善罚恶法如流。\n衙门公正民无怨，户户笙歌庆有秋。', yi: '公正廉明 · 赏罚有信 · 诸事昭雪', jie: '此签主公道昭彰、是非分明。涉讼争议宜凭凭据、求公正。', dian: '城隍主一方生死善恶、赏罚无私之典。' },
  ],
  土地公签: [
    { n: 1, grade: '上上签', name: '福德正神', poem: '田头陌上老翁慈，护五谷而佑四时。\n但使仓廪实如昔，一家温饱乐熙熙。', yi: '根基稳固 · 衣食丰足 · 家宅安康', jie: '此签主家宅安宁、生计有靠。宜脚踏实地、勤理田畴。', dian: '土地公护农佑民之典，喻厚土生养、安身立命。' },
  ],
  财神签: [
    { n: 1, grade: '上上签', name: '财神临门', poem: '金龙献瑞到门庭，仓廪盈充喜盈盈。\n开源节流皆有道，富而好礼更声名。', yi: '财源广进 · 富而好礼 · 门庭兴旺', jie: '此签主财星高照、进益可期。宜开源节流并重，富而修德。', dian: '财神赐财、护商利市之典。' },
  ],
  爱情签: [
    { n: 1, grade: '上上签', name: '天作之合', poem: '天作之合缔良缘，琴瑟和鸣岁月妍。\n月老牵丝千里合，白头相守永团圆。', yi: '天定良缘 · 琴瑟和鸣 · 白头相守', jie: '此签主姻缘天成、情投意合。宜珍惜眼前人、以诚相待。', dian: '月老系赤绳、千里姻缘一线牵之典。' },
  ],
  健康签: [
    { n: 1, grade: '上上签', name: '元气充盈', poem: '清气一团满绛宫，精神爽朗步生风。\n起居有常食有节，自然百脉自通融。', yi: '元气充沛 · 起居有常 · 百脉调和', jie: '此签主精气充足、体魄康强。宜守规律作息、饮食有节。', dian: '中医"元气"之说、起居有常之训。' },
  ],
};

const AREAS = ['观音签', '文王签', '关帝签', '城隍签', '土地公签', '财神签', '爱情签', '健康签'];
const ACT_OF = grade =>
  grade.indexOf('上') > -1 ? '此签利进取，宜把握当下机缘、顺势而为，不必过疑。'
  : grade.indexOf('下') > -1 ? '此签多阻滞，宜退守谨慎、先稳根基，待时运转圜再图。'
  : '此签宜守常渐进，按部就班、稳中求进，莫急莫怠。';

export const oracle = {
  id: 'oracle',
  name: '摇签问卜',
  cat: '灵感与娱乐',
  icon: '卜',
  desc: '传统寺庙问卜：先按问题选择适合的签种，再抽取签诗。结果仅作自我反思参考。',
  open(container) {
    const S = { area: '观音签', question: '' };
    const lib = () => (window.ORACLE_SIGNS && window.ORACLE_SIGNS[S.area]) || FALLBACK[S.area] || [];

    const renderForm = () => {
      container.innerHTML =
        masthead(oracle, { sub: oracle.desc }) +
        viewShell(
          '<div class="tw-h3">选择签种</div>' +
          '<div class="tw-tabs">' + AREAS.map(a =>
            '<button type="button" class="tw-tab' + (a === S.area ? ' active' : '') + '" data-area="' + a + '">' + a + '</button>').join('') +
          '</div>' +
          '<div class="tw-field" style="margin-top:16px"><label>你的问题（只写一件具体的事）</label>' +
            '<textarea id="twOQ" maxlength="120" placeholder="例如：这周是否该主动沟通？"></textarea>' +
          '</div>' +
          '<div class="tw-actions"><button type="button" class="tw-btn tw-btn-primary" id="twODraw">摇一签 →</button></div>' +
          notice('<b>提醒：</b>签文为传统问卜之参详，用于自我反思与理顺思路；健康、法律、财务及关系等重大决定，请结合现实条件与专业意见，不以签文为定论。')
        );

      container.querySelectorAll('[data-area]').forEach(btn => {
        btn.addEventListener('click', () => {
          S.area = btn.dataset.area;
          container.querySelectorAll('[data-area]').forEach(x => x.classList.toggle('active', x === btn));
        });
      });
      container.querySelector('#twOQ')?.addEventListener('input', e => { S.question = e.target.value; });
      container.querySelector('#twODraw').addEventListener('click', draw);
    };

    const draw = () => {
      const pool = lib();
      const lot = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      if (!lot) { showToast('暂无可用的签文库'); return; }
      // 进入结果视图并播放摇签动画
      const result = goResult(container, oracle.name, '<div id="twOAnim"></div>');
      const animBox = result.querySelector('#twOAnim');

      // 签子高低错落 + 错峰摇晃，更有真实感
      const sticks = [0, 1, 2, 3, 4, 5].map(i =>
        '<span class="tw-o-stick" style="left:' + (8 + i * 15) + '%;height:' + (88 + (i % 3) * 6) + '%;transform:rotate(' + (i % 2 ? 5 : -5) + 'deg);animation-delay:' + (i * 130) + 'ms"></span>').join('');
      animBox.innerHTML =
        '<div class="tw-kicker">' + S.area + ' · 摇签中</div>' +
        '<div class="tw-o-stage shake" id="twOStage">' +
          '<div class="tw-o-cup"><div class="tw-o-sticks">' + sticks + '</div></div>' +
          '<i class="tw-o-ring" aria-hidden="true"></i>' +
          '<div class="tw-o-status">正在摇签，请专注你的问题</div>' +
        '</div>';
      const stage = animBox.querySelector('#twOStage');

      const showStick = () => {
        const s = stage.querySelectorAll('.tw-o-stick');
        const pickS = s[Math.floor(Math.random() * s.length)];
        stage.classList.add('draw');
        pickS.classList.add('rising');
        stage.querySelector('.tw-o-status').textContent = '签已出筒 · 第 ' + lot.n + ' 签';
        // 出签金光扩散环
        const ring = stage.querySelector('.tw-o-ring');
        ring.classList.remove('on'); void ring.offsetWidth; ring.classList.add('on');
      };
      const showCard = () => {
        const gradeCls = lot.grade.indexOf('上') > -1 ? 'up' : lot.grade.indexOf('下') > -1 ? 'down' : 'mid';
        animBox.innerHTML =
          '<div class="tw-kicker">ORACLE · ' + S.area + ' · 第 ' + lot.n + ' 签</div>' +
          '<div class="tw-o-card">' +
            '<div class="hd"><span class="t">『' + esc(lot.name) + '』</span><span class="grade ' + gradeCls + '">' + esc(lot.grade) + '</span></div>' +
            '<div class="tw-o-poem">' + esc(lot.poem).replace(/\n/g, '<br>') + '</div>' +
            '<div class="tw-o-rows">' +
              '<div class="it"><b>圣意</b><span>' + esc(lot.yi) + '</span></div>' +
              '<div class="it"><b>解曰</b><span>' + esc(lot.jie) + '</span></div>' +
              '<div class="it"><b>典故</b><span>' + esc(lot.dian) + '</span></div>' +
              '<div class="it"><b>结合所问</b><span>你问：「' + esc(S.question || '你心中的问题') + '」。以此签观之，' + ACT_OF(lot.grade) + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="tw-actions">' +
            '<button type="button" class="tw-btn tw-btn-primary" id="twOAgain">↻ 再摇一签</button>' +
            '<button type="button" class="tw-btn tw-btn-ghost" id="twOShare">生成签文卡</button>' +
          '</div>';
        window._lastOracle = { area: S.area, n: lot.n, title: lot.name, grade: lot.grade, poem: lot.poem, yi: lot.yi, jie: lot.jie, dian: lot.dian, q: S.question };
        animBox.querySelector('#twOAgain').addEventListener('click', draw);
        animBox.querySelector('#twOShare').addEventListener('click', async () => {
          const btn = animBox.querySelector('#twOShare');
          btn.disabled = true; btn.textContent = '生成中…';
          try {
            const { renderShareCard, exportShareCard } = await import('../share/card.js');
            const now = new Date();
            const card = renderShareCard({
              kicker: '摇签问卜 · ' + S.area + ' · 第 ' + lot.n + ' 签',
              title: '『' + lot.name + '』',
              sub: now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日',
              rows: [
                { k: '等级', v: lot.grade },
                { k: '圣意', v: lot.yi },
                { k: '所问', v: S.question || '你心中的问题' },
              ],
              quote: lot.poem,
              foot: '签文用于自我反思，不构成现实决策依据。',
            });
            exportShareCard(card, '问问大师_摇签问卜');
          } catch (e) {}
          btn.disabled = false; btn.textContent = '生成签文卡';
        });
      };
      setTimeout(showStick, 1500);
      setTimeout(showCard, 2850);
    };

    renderForm();
  },
};

export default oracle;
